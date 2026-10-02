# Winmar PQ Proof Tooling

This directory contains reproducible reference tooling for **Winmar Chain Chain ID 12142816**.

The baseline algorithm is **ML-DSA-65**, specified by **NIST FIPS 204**.

## What this proves

The automated evidence workflow proves that:

1. the Winmar PQ v1 canonical message can be encoded deterministically;
2. an ML-DSA-65 keypair can sign that exact message;
3. the signature verifies with the corresponding public key;
4. a one-bit message mutation is rejected;
5. a one-bit signature mutation is rejected; and
6. an independently reloaded evidence bundle verifies again.

It does **not** claim that ML-DSA is currently enforced by QBFT consensus.

## Canonical encoding

Binary layout, in order:

- ASCII `WINMAR_PQ_V1\0`
- `chainId`: uint64 big-endian
- `txHash`: 32 bytes
- `account`: 20 bytes
- `nonce`: uint256 big-endian
- `expiresAt`: uint64 big-endian

ML-DSA context: ASCII `WINMAR_CHAIN_PQ_V1`.

## Run locally

```bash
cd tools/pq-proof
npm install --ignore-scripts --no-audit --no-fund
npm test
npm run evidence
node verify-evidence.mjs evidence/winmar-pq-evidence-v1.json
```

The deterministic seed exists only to make the public test vector reproducible. It is **never** suitable for production keys.
