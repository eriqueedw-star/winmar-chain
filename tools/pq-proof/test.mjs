import assert from 'node:assert/strict';
import {
  canonicalMessage,
  deterministicKeypair,
  sign,
  verify,
  CHAIN_ID,
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

assert.equal(verify(signature, message, keys.publicKey), true, 'positive verification must pass');

const mutatedMessage = Uint8Array.from(message);
mutatedMessage[mutatedMessage.length - 1] ^= 0x01;
assert.equal(verify(signature, mutatedMessage, keys.publicKey), false, 'mutated message must fail');

const mutatedSignature = Uint8Array.from(signature);
mutatedSignature[0] ^= 0x01;
assert.equal(verify(mutatedSignature, message, keys.publicKey), false, 'mutated signature must fail');

const otherChainMessage = canonicalMessage({ ...input, chainId: 1n });
assert.notDeepEqual(
  Array.from(otherChainMessage),
  Array.from(message),
  'chain ID domain separation must change the canonical message',
);

console.log('ML-DSA-65 positive verification: PASS');
console.log('Tampered message rejection: PASS');
console.log('Tampered signature rejection: PASS');
console.log('Canonical message length:', message.length);
console.log('Public key length:', keys.publicKey.length);
console.log('Signature length:', signature.length);
