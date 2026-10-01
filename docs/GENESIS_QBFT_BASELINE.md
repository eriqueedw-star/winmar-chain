# Genesis and QBFT baseline

## Status

The production genesis file is not published in this repository. No QBFT timing, epoch, validator, or extra-data values should be inferred from this document.

The confirmed public network identity is:

- network: Winmar Chain;
- chain ID: `12142816` (`0xB948E0`);
- native currency: WMC with 18 decimals;
- client family: Hyperledger Besu;
- consensus family: QBFT Proof of Authority.

## Allocation evidence boundary

Observed mainnet allocation and current-holder information is maintained separately in `docs/MAINNET_ALLOCATION_EVIDENCE.md`.

That record is deliberately separate from the canonical genesis baseline because the current explorer observations and validator-local RPC observations were not reconciled during the initial review. Do not convert observed balances into a canonical supply statement until the reconciliation gate is complete.

## Publication rule

A sanitized production genesis may be committed only after it has been compared with the genesis used by the active validator fleet. The published copy must contain only values required to reproduce network identity and consensus behavior.

Do not publish validator private keys, keystores, passwords, mnemonics, cloud credentials, SSH material, administrative RPC credentials, or internal-only recovery data.

## Required verification fields

Before a production genesis is accepted into this repository, verify and record:

- `config.chainId` equals `12142816`;
- the QBFT genesis configuration and all timing parameters exactly match production;
- the genesis validator set encoded in `extraData` matches the verified launch record;
- fork activation and EVM compatibility settings match the active network;
- allocation entries contain only intentionally public addresses and balances;
- no hostnames, credentials, private keys, or internal-only endpoints are embedded;
- a SHA-256 checksum is recorded for the exact published file.

## Live comparison

Run comparison commands against a local or otherwise authorized RPC endpoint, not an unrestricted administrative endpoint exposed to the Internet.

Recommended evidence includes:

```bash
curl -s -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://127.0.0.1:8545

curl -s -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x0",false],"id":1}' \
  http://127.0.0.1:8545

curl -s -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"qbft_getValidatorsByBlockNumber","params":["0x0"],"id":1}' \
  http://127.0.0.1:8545
```

Record evidence without copying secrets or unrestricted endpoint credentials into Git.

## Acceptance gate

The sanitized production genesis is considered canonical only after a second reviewer confirms the comparison, the checksum is recorded, CI passes, and the change is merged through review.
