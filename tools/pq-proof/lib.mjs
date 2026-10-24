import { createHash } from 'node:crypto';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

export const CHAIN_ID = 12142816n;
export const ALGORITHM = 'ML-DSA-65';
export const STANDARD = 'NIST FIPS 204';
export const CONTEXT = new TextEncoder().encode('WINMAR_CHAIN_PQ_V1');

function assertHex(value, bytes, label) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new TypeError(`${label} must be 0x-prefixed hex`);
  }
  const raw = value.slice(2);
  if (raw.length !== bytes * 2) {
    throw new RangeError(`${label} must be exactly ${bytes} bytes`);
  }
  return Uint8Array.from(Buffer.from(raw, 'hex'));
}

function u64be(value, label) {
  const n = BigInt(value);
  if (n < 0n || n > 0xffffffffffffffffn) throw new RangeError(`${label} out of uint64 range`);
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setBigUint64(0, n, false);
  return out;
}

function u256be(value, label) {
  let n = BigInt(value);
  if (n < 0n || n >= (1n << 256n)) throw new RangeError(`${label} out of uint256 range`);
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function concat(...parts) {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function canonicalMessage({
  chainId = CHAIN_ID,
  txHash,
  account,
  nonce,
  expiresAt = 0n,
}) {
  const magic = new TextEncoder().encode('WINMAR_PQ_V1\0');
  return concat(
    magic,
    u64be(chainId, 'chainId'),
    assertHex(txHash, 32, 'txHash'),
    assertHex(account, 20, 'account'),
    u256be(nonce, 'nonce'),
    u64be(expiresAt, 'expiresAt'),
  );
}

export function deterministicKeypair(seed) {
  if (!(seed instanceof Uint8Array) || seed.length !== 32) {
    throw new RangeError('seed must be exactly 32 bytes');
  }
  return ml_dsa65.keygen(seed);
}

export function sign(message, secretKey) {
  return ml_dsa65.sign(message, secretKey, {
    context: CONTEXT,
    extraEntropy: false,
  });
}

export function verify(signature, message, publicKey) {
  return ml_dsa65.verify(signature, message, publicKey, {
    context: CONTEXT,
  });
}

export function sha256Hex(bytes) {
  return '0x' + createHash('sha256').update(bytes).digest('hex');
}

export function hex(bytes) {
  return '0x' + Buffer.from(bytes).toString('hex');
}

export function fromHex(value) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]*$/.test(value)) {
    throw new TypeError('expected 0x-prefixed hex');
  }
  return Uint8Array.from(Buffer.from(value.slice(2), 'hex'));
}
