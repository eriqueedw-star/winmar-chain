import http from 'node:http';
import crypto from 'node:crypto';

const port = Number(process.env.PORT || 8787);
const env = process.env.NODE_ENV || 'development';
const maxBytes = Number(process.env.DOCUMENT_MAX_BYTES || 10 * 1024 * 1024);

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

function route(req, res) {
  const id = requestId(req);
  res.setHeader('x-request-id', id);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { service: 'winmar-document-verification', status: 'ok', environment: env, chainId: 12142816 });
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

server.listen(port, '127.0.0.1', () => console.log(`Winmar Document Verification listening on 127.0.0.1:${port}`));
