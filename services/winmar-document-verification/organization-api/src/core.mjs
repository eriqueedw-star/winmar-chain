import { createHash, timingSafeEqual } from 'node:crypto';

// Read-only payment and registry proof for Winmar Chain Mainnet.
// Never signs, deploys, collects funds, or issues a certificate.
export const NETWORK = Object.freeze({
  chainId: '0xb948e0',
  chainIdDecimal: 12142816,
  feeContract: '0xcec232bd11f03006ecc80917f5cd55bbf247617d',
  registryContract: '0x53fb6ba2997a50d3ddfff5395a3bb9b7b24b7aef',
  treasury: '0x2d26e199f9be1a907239e403c4fad14c0856e7fd',
  feeWei: 2100000000000000n,
  paySelector: '0x8609cad1',
  documentSelector: '0xb10d6b41',
  issuerSelector: '0x38a7543e',
  feePaidTopic: '0x3e8af3edd4cc6c38e4b22a0110ebdcaa13f693b0954b418c7fddcae70f8f864d',
  documentRegisteredTopic: '0x5b89de9f4846bfc83db0a655fd2c69d1a30f49b5f2b09c485c167d39374210f2',
});

const HEX32 = /^0x[0-9a-f]{64}$/i;
const ADDRESS = /^0x[0-9a-f]{40}$/i;
export const ZERO = '0x' + '0'.repeat(40);

export function fail(message, statusCode = 422) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function normalizeHash(value, label = 'transaction hash') {
  if (typeof value !== 'string' || !HEX32.test(value)) throw fail('Invalid ' + label);
  return value.toLowerCase();
}

export function normalizeWallet(value) {
  if (typeof value !== 'string' || !ADDRESS.test(value) || value.toLowerCase() === ZERO) {
    throw fail('Invalid payer wallet');
  }
  return value.toLowerCase();
}

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function indexedAddress(address) {
  return '0x' + normalizeWallet(address).slice(2).padStart(64, '0');
}

export function parseApprovedClients(raw) {
  let clients;
  try { clients = JSON.parse(raw || '[]'); }
  catch { throw new Error('Invalid private approved-client JSON configuration'); }
  if (!Array.isArray(clients)) throw new Error('Approved clients must be an array');
  const ids = new Set();
  const hashes = new Set();
  for (const client of clients) {
    if (!client || typeof client.id !== 'string' ||
        !/^[A-Za-z0-9_-]{3,48}$/.test(client.id) ||
        typeof client.keySha256 !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(client.keySha256) ||
        !Array.isArray(client.scopes) ||
        !client.scopes.every(x => [
          'verification:intents:create',
          'verification:intents:read',
          'verification:intents:confirm',
        ].includes(x)) ||
        !['approved', 'revoked'].includes(client.status)) {
      throw new Error('Invalid private approved-client configuration');
    }
    const hash = client.keySha256.toLowerCase();
    if (ids.has(client.id) || hashes.has(hash)) throw new Error('Duplicate client ID or key hash');
    ids.add(client.id);
    hashes.add(hash);
  }
  return clients;
}

export function authenticateBearer(header, clients, scope) {
  const matched = /^Bearer ([A-Za-z0-9_-]{24,256})$/.exec(header || '');
  if (!matched) throw fail('Invalid API credentials', 401);
  const hashed = createHash('sha256').update(matched[1]).digest();
  for (const client of clients) {
    if (timingSafeEqual(hashed, Buffer.from(client.keySha256, 'hex'))) {
      if (client.status !== 'approved') throw fail('API key revoked', 403);
      if (!client.scopes.includes(scope)) throw fail('Insufficient API scope', 403);
      return client;
    }
  }
  throw fail('Invalid API credentials', 401);
}

function assertReceipt(receipt, contract, label) {
  if (!receipt) return false;
  if (String(receipt.status).toLowerCase() !== '0x1' ||
      String(receipt.to || '').toLowerCase() !== contract) {
    throw fail(label + ' failed or wrong contract', 409);
  }
  return true;
}

function eventExists(receipt, contract, topics, amount = null) {
  return Array.isArray(receipt.logs) && receipt.logs.some(log => {
    if (String(log.address).toLowerCase() !== contract ||
        !Array.isArray(log.topics) || log.topics.length !== topics.length ||
        !log.topics.every((t, i) => String(t).toLowerCase() === topics[i])) return false;
    if (amount !== null) {
      try { return BigInt(log.data) === amount; } catch { return false; }
    }
    return true;
  });
}

export function decodeRecord(raw) {
  if (typeof raw !== 'string' || !/^0x[0-9a-f]{320}$/i.test(raw)) {
    throw fail('Unrecognized on-chain document registry response', 503);
  }
  const words = Array.from({ length: 5 }, (_, i) =>
    raw.slice(2 + i * 64, 66 + i * 64).toLowerCase());
  if (!/^0{24}$/.test(words[1].slice(0,24))) {
    throw fail('Malformed issuer address from registry', 503);
  }
  return {
    hash: '0x' + words[0], issuer: '0x' + words[1].slice(24),
    issuedAt: BigInt('0x' + words[2]), revokedAt: BigInt('0x' + words[3]),
  };
}

export async function validatePayment(rpc, { documentId, payerWallet, paymentTxHash }) {
  const doc = normalizeHash(documentId, 'document ID');
  const payer = normalizeWallet(payerWallet);
  const txHash = normalizeHash(paymentTxHash);
  if (String(await rpc('eth_chainId')).toLowerCase() !== NETWORK.chainId) {
    throw fail('Wrong RPC network', 503);
  }
  const receipt = await rpc('eth_getTransactionReceipt', [txHash]);
  if (!receipt) return { status: 'payment_pending' };
  assertReceipt(receipt, NETWORK.feeContract, 'Payment');
  const tx = await rpc('eth_getTransactionByHash', [txHash]);
  if (!tx || String(tx.from).toLowerCase() !== payer ||
      String(tx.to).toLowerCase() !== NETWORK.feeContract ||
      BigInt(tx.value ?? '0x0') !== NETWORK.feeWei ||
      String(tx.input).toLowerCase() !== NETWORK.paySelector + doc.slice(2)) {
    throw fail('Payment does not match source hash, payer, fee or contract', 409);
  }
  const expected = [NETWORK.feePaidTopic, doc,
    indexedAddress(payer), indexedAddress(NETWORK.treasury)];
  if (!eventExists(receipt, NETWORK.feeContract, expected, NETWORK.feeWei)) {
    throw fail('FeePaid event missing, wrong amount or treasury', 409);
  }
  return {
    status: 'payment_confirmed_registration_pending', paymentTxHash: txHash,
    paymentBlock: receipt.blockNumber,
  };
}

export async function validateRegistration(rpc,
    { documentId, paymentBlock, registrationTxHash }) {
  const doc = normalizeHash(documentId, 'document ID');
  const txHash = normalizeHash(registrationTxHash);
  const receipt = await rpc('eth_getTransactionReceipt', [txHash]);
  if (!receipt) return { status: 'registration_pending' };
  assertReceipt(receipt, NETWORK.registryContract, 'Registration');
  if (BigInt(receipt.blockNumber) < BigInt(paymentBlock)) {
    throw fail('Registration predates payment', 409);
  }

  const raw = await rpc('eth_call', [{ to: NETWORK.registryContract,
    data: NETWORK.documentSelector + doc.slice(2) }, 'latest']);
  const record = decodeRecord(raw);
  if (record.hash !== doc || record.issuer === ZERO || record.issuedAt === 0n) {
    throw fail('Document is not registered to the original PDF hash', 409);
  }
  if (record.revokedAt !== 0n) throw fail('Document has been revoked', 409);

  const response = await rpc('eth_call', [{
    to: NETWORK.registryContract,
    data: NETWORK.issuerSelector + record.issuer.slice(2).padStart(64,'0'),
  }, 'latest']);
  if (!/^0x[0-9a-f]{64}$/i.test(response || '') || BigInt(response) !== 1n) {
    throw fail('On-chain issuer is no longer authorized', 409);
  }
  const transaction = await rpc('eth_getTransactionByHash', [txHash]);
  if (!transaction || String(transaction.to).toLowerCase() !== NETWORK.registryContract ||
      String(transaction.from).toLowerCase() !== record.issuer) {
    throw fail('Registration transaction issuer or contract mismatch', 409);
  }
  if (!eventExists(receipt, NETWORK.registryContract,
      [NETWORK.documentRegisteredTopic, doc, doc, indexedAddress(record.issuer)])) {
    throw fail('DocumentRegistered event is missing or mismatched', 409);
  }
  const block = await rpc('eth_getBlockByNumber', [receipt.blockNumber, false]);
  if (!block || BigInt(block.timestamp) !== record.issuedAt) {
    throw fail('Registration block UTC timestamp mismatch', 409);
  }
  return {
    status: 'registered', documentId: doc, registrationTxHash: txHash,
    registrationBlock: String(BigInt(receipt.blockNumber)),
    issuedAtUtc: new Date(Number(record.issuedAt) * 1000).toISOString(),
    issuerWallet: record.issuer,
    explorerUrl: 'https://scan.winmarchain.io/verify/' + doc,
    certificateIssued: false,
  };
}
