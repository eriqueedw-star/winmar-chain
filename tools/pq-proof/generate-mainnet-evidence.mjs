import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
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

const tx = JSON.parse(fs.readFileSync('evidence/live-mainnet-transaction.json', 'utf8'));

if (BigInt(tx.chainId) !== CHAIN_ID) throw new Error('live transaction chain ID mismatch');
if (!tx.txHash || !tx.from) throw new Error('live transaction evidence missing hash/from');

const input = {
  chainId: CHAIN_ID,
  txHash: tx.txHash,
  account: tx.from,
  nonce: BigInt(tx.nonce),
  expiresAt: 0n,
};

const message = canonicalMessage(input);

// Ephemeral evidence key. This proves post-quantum attestation of the observed
// mainnet transaction data; it does not claim the original EVM sender used ML-DSA.
const seed = randomBytes(32);
const keys = deterministicKeypair(seed);
const signature = sign(message, keys.secretKey);

if (!verify(signature, message, keys.publicKey)) {
  throw new Error('live ML-DSA signature verification failed');
}

const tampered = Uint8Array.from(message);
tampered[tampered.length - 1] ^= 1;
if (verify(signature, tampered, keys.publicKey)) {
  throw new Error('tampered live message unexpectedly verified');
}

const bundle = {
  schema: 'winmar-pq-mainnet-evidence/v1',
  network: {
    name: 'Winmar Chain',
    chainId: Number(CHAIN_ID),
    rpcUrl: tx.rpcUrl,
  },
  mainnetObservation: {
    observedAt: tx.observedAt,
    blockNumber: tx.blockNumber,
    blockHash: tx.blockHash,
    txHash: tx.txHash,
    from: tx.from,
    to: tx.to,
    nonce: tx.nonce,
    txType: tx.txType,
  },
  algorithm: {
    name: ALGORITHM,
    standard: STANDARD,
    contextHex: hex(CONTEXT),
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
    signatureValid: true,
    tamperedMessageRejected: true,
    chainIdMatched: true,
  },
  disclosure: {
    consensusEnforced: false,
    senderPQAuthorized: false,
    note: 'This bundle proves ML-DSA-65 attestation over data from an observed Winmar Chain mainnet transaction. It does not prove that the original EVM sender authorized the transaction with ML-DSA or that QBFT enforces ML-DSA.',
  },
};

fs.writeFileSync('evidence/winmar-pq-mainnet-evidence-v1.json', JSON.stringify(bundle, null, 2) + '\n');
console.log(JSON.stringify(bundle.checks));
