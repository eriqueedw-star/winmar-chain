#!/usr/bin/env node
/*
 * READ-ONLY smoke check for the public verification page AFTER deployment.
 * No wallet keys, WMC transactions, file upload, contract writes or secret
 * printing. Works with built-in Node.js 22+ fetch.
 */
import process from 'node:process';

const BASE = process.env.WINMAR_VERIFY_BASE_URL || 'https://scan.winmarchain.io';
const REGISTRY = '0x53fb6ba2997a50d3ddfff5395a3bb9b7b24b7aef';
const DOCUMENT_ID =
  '0x477a80f1f39d85e3b746f621a5271a17c3aa1b6adc9d88401cc7bbf58ae209fc';
const REGISTRATION_TX =
  '0xbe95962ea545e9fd714e2dc971bd8300dba5c7da52e2aa6cfebb509a7ffbfb68';
const REGISTRATION_TOPIC =
  '0x5b89de9f4846bfc83db0a655fd2c69d1a30f49b5f2b09c485c167d39374210f2';

function requireValue(value, message) {
  if (!value) throw new Error(message);
}

async function http(path, { method = 'GET', origin = false, body = undefined } = {}) {
  const url = new URL(path, BASE);
  if (!['https:', 'http:'].includes(url.protocol) || !/^[a-z0-9.-]+$/i.test(url.hostname)) {
    throw new Error('Invalid public verification origin');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, {
      method, signal: controller.signal, redirect: 'error',
      headers: {
        ...(origin ? { Origin: 'https://scan.winmarchain.io' } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const tests = [];
async function check(name, action) {
  try {
    const evidence = await action();
    tests.push({ name, result: 'PASS', evidence });
  } catch (error) {
    tests.push({ name, result: 'FAIL', reason: String(error.message || error).slice(0,260) });
  }
}

await check('Existing successful mainnet registration remains indexed', async () => {
  const resp = await http(`/api/v2/transactions/${REGISTRATION_TX}/logs`);
  requireValue(resp.status === 200, `Explorer registration API HTTP ${resp.status}`);
  const data = await resp.json();
  requireValue(data.items?.some(log =>
    String(log.address?.hash).toLowerCase() === REGISTRY &&
    String(log.transaction_hash).toLowerCase() === REGISTRATION_TX &&
    log.topics?.length === 4 &&
    log.topics[0]?.toLowerCase() === REGISTRATION_TOPIC &&
    log.topics[1]?.toLowerCase() === DOCUMENT_ID &&
    log.topics[2]?.toLowerCase() === DOCUMENT_ID
  ), 'Independent registry event not indexed');
  return { transaction: REGISTRATION_TX, status: 200 };
});

await check('Exact public QR verification URL serves Winmar verification UI', async () => {
  const resp = await http(`/verify/${DOCUMENT_ID}`);
  requireValue(resp.status === 200, `Expected HTTP 200, received ${resp.status}`);
  const html = await resp.text();
  requireValue(html.includes('<base href="/document-verification/">') &&
    html.includes('id="verification-state"') &&
    html.includes('id="source-pdf"'),
  'The /verify route is not serving reviewed Winmar HTML');
  return { status: resp.status, path: `/verify/${DOCUMENT_ID}` };
});

await check('CSS and JavaScript assets load from official Explorer', async () => {
  for (const path of [
    '/document-verification/verify.css',
    '/document-verification/verify.js',
    '/document-verification/verification-proof.js',
    '/document-verification/certificate-renderer.js',
    '/document-verification/winmar-chain-logo-framed-v2.png',
    '/document-verification/winmar-verification-certificate-master.png',
    '/document-verification/vendor/qrcode.min.js',
    '/document-verification/vendor/pdf-lib-1.17.1.min.js',
  ]) {
    const resp = await http(path);
    requireValue(resp.status === 200, `${path} returned HTTP ${resp.status}`);
    const bytes = await resp.arrayBuffer();
    requireValue(bytes.byteLength > 100, `${path} is empty/incomplete`);
    const mime = String(resp.headers.get('content-type') || '').toLowerCase();
    if (path.endsWith('.css')) requireValue(mime.includes('css'), 'CSS MIME type is incorrect');
    if (path.endsWith('.js')) {
      requireValue(mime.includes('javascript') || mime.includes('ecmascript'),
        'JavaScript MIME type is incorrect');
    }
    if (path.endsWith('.png')) {
      requireValue(mime.includes('png'), 'Logo MIME type is incorrect');
    }
  }
  return { verifiedAssets: 4 };
});

await check('Public JSON-RPC chain ID and CORS allow Explorer browser', async () => {
  const url = 'https://rpc.winmarchain.io/';
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), 15000);
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: {
        'Origin': 'https://scan.winmarchain.io',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    });
  } finally { clearTimeout(handle); }
  requireValue(resp.status === 200, `RPC HTTP ${resp.status}`);
  const payload = await resp.json();
  requireValue(BigInt(payload.result) === 12142816n, 'RPC returned wrong chain ID');
  const cors = resp.headers.get('access-control-allow-origin');
  requireValue(cors === '*' || cors === 'https://scan.winmarchain.io',
    'RPC CORS does not allow Explorer origin');
  return { chainId: 12142816, cors };
});

await check('Unknown PDF hash does not show a success certificate in static HTML', async () => {
  const invalid = '0x' + '0'.repeat(64);
  const resp = await http(`/verify/${invalid}`);
  requireValue(resp.status === 200, `Verification route missing for arbitrary IDs: HTTP ${resp.status}`);
  const html = await resp.text();
  requireValue(html.includes('id="verification-state"') &&
    !html.includes('VERIFIED ON-CHAIN — selected original PDF matches'),
    'Static HTML must not present a successful verification without RPC and local PDF');
  return { staticStatus: 200, requiresClientOnChainLookup: true };
});

const failed = tests.filter(t => t.result === 'FAIL');
const report = {
  check: 'Winmar Explorer document verification post-deploy smoke',
  mode: 'READ_ONLY',
  target: BASE,
  testedDocumentId: DOCUMENT_ID,
  status: failed.length ? 'NOT_READY' : 'HTTP_AND_RPC_READY',
  completed: tests.length, passed: tests.length - failed.length, failed: failed.length,
  note: 'Manual iOS/Android PDF QR scan, document SHA-256 match, revocation, staging rollback and operator signoff are separate gates.',
  tests,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = failed.length ? 1 : 0;
