import fs from 'node:fs';
import {
  canonicalMessage,
  deterministicKeypair,
  sign,
  verify,
  sha256Hex,
  hex,
  CHAIN_ID,
  ALGORITHM,
  STANDARD,
  CONTEXT,
} from './lib.mjs';

const seed = Uint8Array.from({ length: 32 }, (_, i) => i);
const keys = deterministicKeypair(seed);

const input = {
  chainId: CHAIN_ID,
  txHash: '0x' + '11'.repeat(32),
  account: '0x' + '22'.repeat(20),
  nonce: 7n,
  expiresAt: 0n,
};

const message = canonicalMessage(input);
const signature = sign(message, keys.secretKey);
const valid = verify(signature, message, keys.publicKey);

const tampered = Uint8Array.from(message);
tampered[0] ^= 0x01;
const tamperRejected = !verify(signature, tampered, keys.publicKey);

if (!valid || !tamperRejected) {
  throw new Error('ML-DSA evidence self-test failed');
}

const bundle = {
  schema: 'winmar-pq-evidence/v1',
  network: {
    name: 'Winmar Chain',
    chainId: Number(CHAIN_ID),
  },
  algorithm: {
    name: ALGORITHM,
    standard: STANDARD,
    contextHex: hex(CONTEXT),
  },
  canonicalInput: {
    chainId: Number(input.chainId),
    txHash: input.txHash,
    account: input.account,
    nonce: input.nonce.toString(),
    expiresAt: input.expiresAt.toString(),
  },
  evidence: {
    messageHex: hex(message),
    messageSha256: sha256Hex(message),
    publicKeyHex: hex(keys.publicKey),
    signatureHex: hex(signature),
    proofCommitmentSha256: sha256Hex(
      Buffer.concat([
        Buffer.from(keys.publicKey),
        Buffer.from(message),
        Buffer.from(signature),
      ]),
    ),
  },
  checks: {
    signatureValid: valid,
    tamperedMessageRejected: tamperRejected,
  },
  disclosure: {
    consensusEnforced: false,
    note: 'This proves ML-DSA-65 signing and verification for the Winmar PQ v1 canonical message. It does not prove QBFT consensus-level enforcement.',
  },
};

fs.mkdirSync('evidence', { recursive: true });
fs.writeFileSync('evidence/winmar-pq-evidence-v1.json', JSON.stringify(bundle, null, 2) + '\n');
console.log(JSON.stringify(bundle.checks));
