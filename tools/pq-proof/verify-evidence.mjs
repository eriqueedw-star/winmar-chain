import fs from 'node:fs';
import {
  canonicalMessage,
  verify,
  fromHex,
  sha256Hex,
  CHAIN_ID,
} from './lib.mjs';

const path = process.argv[2];
if (!path) throw new Error('Usage: node verify-evidence.mjs <evidence.json>');

const bundle = JSON.parse(fs.readFileSync(path, 'utf8'));
if (bundle.schema !== 'winmar-pq-evidence/v1') throw new Error('unsupported schema');
if (BigInt(bundle.network.chainId) !== CHAIN_ID) throw new Error('wrong chain ID');

const message = canonicalMessage({
  chainId: BigInt(bundle.canonicalInput.chainId),
  txHash: bundle.canonicalInput.txHash,
  account: bundle.canonicalInput.account,
  nonce: BigInt(bundle.canonicalInput.nonce),
  expiresAt: BigInt(bundle.canonicalInput.expiresAt),
});

if (sha256Hex(message) !== bundle.evidence.messageSha256) throw new Error('message digest mismatch');
if ('0x' + Buffer.from(message).toString('hex') !== bundle.evidence.messageHex) throw new Error('canonical message mismatch');

const ok = verify(
  fromHex(bundle.evidence.signatureHex),
  message,
  fromHex(bundle.evidence.publicKeyHex),
);

if (!ok) throw new Error('ML-DSA verification failed');
console.log('WINMAR PQ EVIDENCE: VERIFIED');
console.log('Chain ID: 12142816');
console.log('Algorithm: ML-DSA-65 / NIST FIPS 204');
console.log('Consensus enforced: false');
