import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.env.PORT || 8787);
const env = process.env.NODE_ENV || 'development';
const maxBytes = Number(process.env.DOCUMENT_MAX_BYTES || 10 * 1024 * 1024);
const uploadDir = process.env.RESERVE_UPLOAD_DIR || '/var/lib/winmar/reserve-review';
const cognitoIssuer = process.env.COGNITO_ISSUER || 'https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_ph3o7veez';
const cognitoClientId = process.env.COGNITO_CLIENT_ID || '1i5268br47tai5elejs81tkss4';
let jwksCache;

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(payload);
}

function requestId(req) {
  return req.headers['x-request-id'] || crypto.randomUUID();
}

function keyDigest(value) {
  const pepper = process.env.API_KEY_PEPPER;
  if (!pepper) throw new Error('API_KEY_PEPPER is not configured');
  return crypto.createHmac('sha256', pepper).update(value).digest('hex');
}

function authenticate(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return { ok: false, reason: 'missing_bearer' };
  const raw = header.slice('Bearer '.length).trim();
  if (!raw || raw.length < 24) return { ok: false, reason: 'invalid_key' };
  // Key lookup is intentionally deferred to the tenant database. Never log raw keys.
  return { ok: true, digest: keyDigest(raw) };
}

async function authenticateCognito(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  const token = header.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const decode = (value) => JSON.parse(Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64url').toString('utf8'));
  try {
    const headerPart = decode(parts[0]);
    const claims = decode(parts[1]);
    if (headerPart.alg !== 'RS256' || claims.iss !== cognitoIssuer || claims.token_use !== 'id' || claims.exp <= Math.floor(Date.now() / 1000)) return false;
    if (claims.aud !== cognitoClientId) return false;
    if (!jwksCache || jwksCache.expires < Date.now()) {
      const response = await fetch(`${cognitoIssuer}/.well-known/jwks.json`, { headers: { accept: 'application/json' } });
      if (!response.ok) return false;
      jwksCache = { keys: (await response.json()).keys, expires: Date.now() + 15 * 60 * 1000 };
    }
    const jwk = jwksCache.keys.find((key) => key.kid === headerPart.kid);
    if (!jwk) return false;
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    return crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
  } catch { return false; }
}

async function readMultipart(req) {
  const type = req.headers['content-type'] || '';
  const match = type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) throw Object.assign(new Error('multipart_required'), { status: 400 });
  const chunks = []; let total = 0;
  for await (const chunk of req) { total += chunk.length; if (total > maxBytes * 2 + 1024 * 1024) throw Object.assign(new Error('payload_too_large'), { status: 413 }); chunks.push(chunk); }
  const buffer = Buffer.concat(chunks); const boundary = Buffer.from(`--${match[1] || match[2]}`); const fields = {};
  let cursor = 0;
  while (true) {
    const start = buffer.indexOf(boundary, cursor); if (start < 0) break;
    const headerStart = start + boundary.length + 2; if (buffer.slice(start + boundary.length, headerStart).toString() === '--') break;
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart); if (headerEnd < 0) break;
    const headers = buffer.slice(headerStart, headerEnd).toString(); const end = buffer.indexOf(boundary, headerEnd + 4); if (end < 0) break;
    const disposition = headers.match(/name="([^"]+)"(?:; filename="([^"]*)")?/i); if (disposition?.[1] && disposition?.[2]) fields[disposition[1]] = { name: path.basename(disposition[2]), data: buffer.slice(headerEnd + 4, end - 2) };
    cursor = end;
  }
  return fields;
}

async function readJson(req) {
  const chunks = []; let total = 0;
  for await (const chunk of req) { total += chunk.length; if (total > 256 * 1024) throw Object.assign(new Error('payload_too_large'), { status: 413 }); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function reviewRecords() {
  await fs.mkdir(uploadDir, { recursive: true, mode: 0o700 });
  const entries = await fs.readdir(uploadDir, { withFileTypes: true }); const records = [];
  for (const entry of entries) if (entry.isDirectory()) try { records.push(JSON.parse(await fs.readFile(path.join(uploadDir, entry.name, 'review.json'), 'utf8'))); } catch {}
  return records.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

async function writeReview(record) {
  const folder = path.join(uploadDir, record.reviewId); const temporary = path.join(folder, 'review.json.tmp');
  await fs.writeFile(temporary, JSON.stringify(record, null, 2), { mode: 0o600 }); await fs.rename(temporary, path.join(folder, 'review.json'));
}

function route(req, res) {
  const id = requestId(req);
  res.setHeader('x-request-id', id);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { service: 'winmar-document-verification', status: 'ok', environment: env, chainId: 12142816 });
  }

  if (req.method === 'POST' && url.pathname === '/api/wmusd/reserve-review') {
    return authenticateCognito(req).then(async (ok) => {
      if (!ok) return json(res, 401, { error: 'unauthorized', message: 'Valid admin identity token required.', requestId: id });
      const fields = await readMultipart(req);
      if (!fields.attestation || !fields.bank) return json(res, 400, { error: 'both_files_required', requestId: id });
      for (const file of [fields.attestation, fields.bank]) if (file.data.length === 0 || file.data.length > maxBytes || !/\.(pdf|png|jpe?g)$/i.test(file.name)) return json(res, 400, { error: 'invalid_file', requestId: id });
      await fs.mkdir(uploadDir, { recursive: true, mode: 0o700 });
      const reviewId = crypto.randomUUID(); const folder = path.join(uploadDir, reviewId); await fs.mkdir(folder, { mode: 0o700 });
      const save = async (file, key) => { const sha256 = crypto.createHash('sha256').update(file.data).digest('hex'); await fs.writeFile(path.join(folder, `${key}-${file.name}`), file.data, { mode: 0o600 }); return { name: file.name, size: file.data.length, sha256 }; };
      const record = { reviewId, status: 'PENDING_REVIEW', submittedAt: new Date().toISOString(), attestation: await save(fields.attestation, 'attestation'), bank: await save(fields.bank, 'bank') };
      await fs.writeFile(path.join(folder, 'review.json'), JSON.stringify(record, null, 2), { mode: 0o600 });
      return json(res, 201, record);
    }).catch((error) => json(res, error.status || 500, { error: error.message === 'payload_too_large' ? 'payload_too_large' : 'upload_failed', requestId: id }));
  }
  if (url.pathname === '/api/wmusd/reserve-review' || url.pathname.startsWith('/api/wmusd/reserve-review/')) {
    return authenticateCognito(req).then(async (ok) => {
      if (!ok) return json(res, 401, { error: 'unauthorized', message: 'Valid admin identity token required.', requestId: id });
      if (req.method === 'GET') return json(res, 200, { reviews: await reviewRecords() });
      const match = url.pathname.match(/^\/api\/wmusd\/reserve-review\/([^/]+)\/decision$/);
      if (req.method !== 'POST' || !match) return json(res, 405, { error: 'method_not_allowed', requestId: id });
      const record = (await reviewRecords()).find((item) => item.reviewId === match[1]);
      if (!record) return json(res, 404, { error: 'review_not_found', requestId: id });
      const body = await readJson(req); const decision = String(body.decision || '').toUpperCase();
      if (!['APPROVED', 'REJECTED'].includes(decision)) return json(res, 400, { error: 'invalid_decision', requestId: id });
      const capacity = body.capacityWmusd === undefined || body.capacityWmusd === '' ? 0 : Number(body.capacityWmusd);
      if (!Number.isFinite(capacity) || capacity < 0 || capacity > 100000000) return json(res, 400, { error: 'invalid_capacity', requestId: id });
      record.status = decision; record.verifiedCapacityWmusd = decision === 'APPROVED' ? capacity : 0; record.reviewedAt = new Date().toISOString(); record.reviewNote = String(body.note || '').slice(0, 1000);
      await writeReview(record); return json(res, 200, record);
    }).catch((error) => json(res, error.status || 500, { error: error.message === 'payload_too_large' ? 'payload_too_large' : 'review_failed', requestId: id }));
  }
  if (!process.env.API_KEY_PEPPER) return json(res, 503, { error: 'service_not_configured', requestId: id });
  const auth = authenticate(req);
  if (!auth.ok) return json(res, 401, { error: 'unauthorized', requestId: id });

  if (req.method === 'POST' && url.pathname === '/v1/documents') {
    return json(res, 501, { error: 'issuance_not_ready', message: 'Signer, tenant database, upload scanner, and receipt worker must be configured before issuance.', requestId: id });
  }
  if (req.method === 'GET' && url.pathname.startsWith('/v1/documents/')) {
    return json(res, 501, { error: 'verification_store_not_ready', requestId: id });
  }
  return json(res, 404, { error: 'not_found', requestId: id });
}

const server = http.createServer((req, res) => {
  try { route(req, res); } catch (error) { json(res, 500, { error: 'internal_error', requestId: requestId(req) }); }
});

server.listen(port, '0.0.0.0', () => console.log(`Winmar Document Verification listening on 127.0.0.1:${port}`));

