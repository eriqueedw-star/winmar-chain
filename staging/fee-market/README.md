# Winmar Fee-Market Staging Network

This directory is a staging template only. It must never reuse production validator keys, node keys, bootnodes, or data directories.

## Purpose

Test Besu QBFT with London/EIP-1559 rules before any production transition. The staging chain uses a separate chain ID and placeholder validator addresses. It does not change production RPC, genesis, DNS, or validator services.

## Current model

- QBFT consensus
- EIP-1559/London rules enabled in the staging genesis
- Target initial base fee: `1 Gwei`
- Minimum priority fee target: `0.1 Gwei`
- Treasury behavior: custom routing is explicit and activation-block gated
- Treasury address is recorded as a staging fixture; it is not a production setting

Before starting the staging network, set the same activation block for every
node and render the compose file to catch missing configuration:

```sh
export WINMAR_FEE_ROUTING_BLOCK=1
docker compose -f docker-compose.staging.yml config
docker compose -f docker-compose.staging.yml up -d
```

Never activate routing on only one production validator. The activation block
must be agreed in advance and applied to all five validators in one coordinated
rollout after staging block hashes match.

## Required staging work

1. Generate five disposable validator keypairs with Besu tooling on an isolated host.
2. Replace every `0x1111...` placeholder in `genesis.template.json` with those staging validator addresses.
3. Generate QBFT `extraData` from the staging addresses.
4. Start five isolated Besu nodes with separate data paths and ports.
5. Send a funded test transaction with `maxFeePerGas >= 1.1 Gwei` and `maxPriorityFeePerGas = 0.1 Gwei`.
6. Confirm `baseFeePerGas`, effective gas price, proposer/beneficiary, receipts, and balances.
7. Test restart, validator loss, underpriced transactions, and chain recovery.

Do not copy production private keys or production data into this directory.
