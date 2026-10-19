import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  NETWORK, fail, normalizeWallet, normalizeHash, sha256,
  parseApprovedClients, authenticateBearer, validatePayment, validateRegistration,
} from './core.mjs';
import { IntentStore } from './storage.mjs';

const DEFAULT_RPC = 'https://rpc.winmarchain.io/';
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_COUNT = 30;

function json(res, status, body) {
  const bytes = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(bytes.length),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'",
  });
  res.end(bytes);
}

async function readBody(req, limit) {
  const sizeHeader = Number(req.headers['content-length']);
  if (req.headers['content-length'] !== undefined && sizeHeader > limit) {
    throw fail('Request body exceeds permitted limit', 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw fail('Request body exceeds permitted limit', 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseProof(bytes) {
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); }
  catch { throw fail('Invalid JSON proof body'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw fail('Invalid payment/registration proof');
  }
  return {
    paymentTxHash: normalizeHash(parsed.paymentTxHash),
    registrationTxHash: parsed.registrationTxHash
      ? normalizeHash(parsed.registrationTxHash) : null,
  };
}

function present(record, progress) {
  const response = {
    intentId: record.id,
    documentId: record.documentId,
    payerWallet: record.payerWallet,
    chainId: NETWORK.chainIdDecimal,
    feeContract: NETWORK.feeContract,
    feeWei: NETWORK.feeWei.toString(),
    treasury: NETWORK.treasury,
    networkGasExtra: true,
    paymentTxHash: record.paymentTxHash,
    registrationTxHash: record.registrationTxHash,
    status: progress?.status || 'awaiting_payment',
    certificateIssued: false,
  };
  if (progress?.status === 'registered') {
    response.registrationBlock = progress.registrationBlock;
    response.issuerWallet = progress.issuerWallet;
    response.issuedAtUtc = progress.issuedAtUtc;
    response.explorerUrl = progress.explorerUrl;
  }
  return response;
}

export function createRpc(url = DEFAULT_RPC, transport = fetch) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('RPC endpoint must use HTTPS');
  let nextId = 0;
  return async (method, params = []) => {
    if (!['eth_chainId', 'eth_getTransactionReceipt', 'eth_getTransactionByHash',
      'eth_call', 'eth_getBlockByNumber'].includes(method)) {
      throw fail('Unsupported blockchain method', 400);
    }
    const response = await transport(u.toString(), {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++nextId, method, params }),
    });
    if (!response.ok) throw fail('Winmar Chain RPC unavailable', 503);
    const parsed = await response.json();
    if (parsed.error || !Object.hasOwn(parsed, 'result')) {
      throw fail('Invalid Winmar Chain RPC response', 503);
    }
    return parsed.result;
  };
}

// Reference backend-only API. This is NOT a deployed issuance service.
// All customer issuances still require independent blockchain proof and
// a separately approved owner-master PDF generation step.
export function createApi({ clients, store, rpc, now = () => Date.now() }) {
  const limits = new Map();
  return async function handler(req, res) {
    try {
      if (req.method === 'GET' && req.url === '/healthz') {
        return json(res, 200, { status: 'alive' });
      }

      const confirmationPath = req.method === 'POST' &&
        /^\/v1\/intents\/int_[0-9a-f]{64}\/confirm$/.test(req.url || '');
      const scope = req.method === 'POST' && req.url === '/v1/intents'
        ? 'verification:intents:create' :
        confirmationPath ? 'verification:intents:confirm' : 'verification:intents:read';
      const tenant = authenticateBearer(req.headers.authorization, clients, scope);
      const key = tenant.id;
      const limit = limits.get(key) || { start: now(), count: 0 };
      if (now() - limit.start >= RATE_LIMIT_WINDOW_MS) {
        limit.start = now();
        limit.count = 0;
      }
      limits.set(key, limit);
      if (++limit.count > RATE_LIMIT_COUNT) throw fail('Organization rate limit exceeded', 429);

      if (req.method === 'POST' && req.url === '/v1/intents') {
        if (String(req.headers['content-type'] || '').split(';')[0].trim() !== 'application/pdf') {
          throw fail('Content-Type must be application/pdf', 415);
        }
        const idemKey = req.headers['idempotency-key'];
        if (typeof idemKey !== 'string' || !idemKey) {
          throw fail('Missing Idempotency-Key');
        }
        const payerWallet = normalizeWallet(req.headers['x-payer-wallet']);
        const file = await readBody(req, MAX_PDF_BYTES);
        if (file.length === 0 || file.length > MAX_PDF_BYTES ||
            file.subarray(0,5).toString('ascii') !== '%PDF-') {
          throw fail('Upload one original PDF up to 10 MB');
        }
        const documentId = '0x' + sha256(file);
        // PDF bytes are discarded immediately; only its hash and payment
        // reference persist. This is a reference implementation, not a
        // malicious-PDF scanning/validation service.
        const { record, created } = await store.create(tenant.id, idemKey,
          { documentId, payerWallet });
        return json(res, created ? 201 : 200, present(record));
      }

      const match = /^\/v1\/intents\/(int_[0-9a-f]{64})(?:\/(confirm))?$/.exec(req.url || '');
      if (!match) throw fail('Unknown API route', 404);
      const record = await store.get(tenant.id, match[1]);

      if (req.method === 'POST' && match[2] === 'confirm') {
        if (String(req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json') {
          throw fail('Expected application/json proof payload', 415);
        }
        const { paymentTxHash, registrationTxHash } = parseProof(await readBody(req, 4096));
        if (record.paymentTxHash && record.paymentTxHash !== paymentTxHash) {
          throw fail('Intent bound to another payment transaction', 409);
        }
        if (record.registrationTxHash && registrationTxHash &&
            record.registrationTxHash !== registrationTxHash) {
          throw fail('Intent bound to another registration transaction', 409);
        }
        const paid = await validatePayment(rpc, {
          documentId: record.documentId,
          payerWallet: record.payerWallet, paymentTxHash,
        });
        if (paid.status === 'payment_pending') {
          return json(res, 202, present(record, paid));
        }
        // Record confirmed payment BEFORE checking potentially delayed issuer TX.
        // On outage do not lose payment TX and do not invite duplicate charges.
        const stored = await store.attachValidatedProof(tenant.id, record.id, { paymentTxHash });
        const registration = registrationTxHash || stored.registrationTxHash;
        if (!registration) return json(res, 202, present(stored, paid));
        const proof = await validateRegistration(rpc, {
          documentId: stored.documentId,
          paymentBlock: paid.paymentBlock,
          registrationTxHash: registration,
        });
        if (proof.status !== 'registered') return json(res, 202, present(stored, proof));
        const done = await store.attachValidatedProof(tenant.id, record.id, {
          paymentTxHash, registrationTxHash: registration,
        });
        return json(res, 200, present(done, proof));
      }

      if (req.method === 'GET' && !match[2]) {
        let status = { status: 'awaiting_payment' };
        if (record.paymentTxHash) {
          const paid = await validatePayment(rpc, {
            documentId: record.documentId, payerWallet: record.payerWallet,
            paymentTxHash: record.paymentTxHash,
          });
          status = paid;
          if (paid.status === 'payment_confirmed_registration_pending' &&
              record.registrationTxHash) {
            status = await validateRegistration(rpc, {
              documentId: record.documentId, paymentBlock: paid.paymentBlock,
              registrationTxHash: record.registrationTxHash,
            });
          }
        }
        return json(res, 200, present(record, status));
      }
      throw fail('HTTP method not allowed', 405);
    } catch (error) {
      const status = Number.isInteger(error.statusCode) ? error.statusCode : 503;
      return json(res, status, {
        error: status === 503
          ? 'Verification unavailable; no certificate issued'
          : error.message,
        requestId: randomUUID(),
        certificateIssued: false,
      });
    }
  };
}

async function main() {
  const clients = parseApprovedClients(process.env.WINMAR_ORG_API_CLIENTS);
  if (!clients.length) throw new Error('No approved organizations configured');
  const stateDir = process.env.WINMAR_ORG_API_STATE_DIR;
  if (!stateDir || resolve(stateDir) !== stateDir) {
    throw new Error('Private absolute WINMAR_ORG_API_STATE_DIR required');
  }
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  const api = createApi({
    clients, store: new IntentStore(stateDir),
    rpc: createRpc(process.env.WINMAR_CHAIN_RPC_URL || DEFAULT_RPC),
  });
  const port = Number(process.env.PORT || 8771);
  const server = createServer(api);
  server.listen(port, '127.0.0.1', () => {
    console.log('Winmar organization reference API bound to localhost port ' + port);
  });
}
const invokedDirectly = process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedDirectly) {
  main().catch(error => {
    console.error('Startup denied: ' + error.message);
    process.exitCode = 1;
  });
}
