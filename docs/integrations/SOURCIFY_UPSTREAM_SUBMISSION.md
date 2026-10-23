# Sourcify mainnet onboarding — Winmar Chain (12142816)

**Prepared:** 2026-10-24. **Official upstream registration:** NOT SUBMITTED / NOT APPROVED.

The current canonical chain list is maintained in [sourcifyeth/sourcify-chains](https://github.com/sourcifyeth/sourcify-chains), **main** branch. Its README states that an entry in `chain-overrides.json` alone is sufficient to include a chain not auto-discovered. **Do not edit `sourcify-chains-default.json`: it is generated.**

## Precise upstream change

Copy the contents of [winmar-chain-override.json](../../integrations/sourcify/winmar-chain-override.json) into the top-level `chain-overrides.json` object, preserving every other chain. Entry:

```json
"12142816": {
  "sourcifyName": "Winmar Chain",
  "rpc": ["https://rpc.winmarchain.io"]
}
```

- Upstream: https://github.com/sourcifyeth/sourcify-chains
- Fork URL: https://github.com/sourcifyeth/sourcify-chains/fork
- **Required branch name:** `add-chain-12142816` (triggers upstream `Test New Chain` workflow)
- PR target: upstream `main`
- PR title: `feat(chains): onboard Winmar Chain mainnet (12142816)`
- Do not add unverifiable claims like `supported: true`, `traceSupport`, `etherscanApi`, `blockscoutApi`, or a test contract address without evidence.
- Do not change ERC/native token branding: WMC is the native currency, no token contract; WMC-20 is a separate fungible smart-contract standard.

## Suggested PR description

> Onboard Winmar Chain mainnet, EVM L1, QBFT PoA. Chain ID 12142816 (`0xb948e0`). Native currency Winmar Coin (WMC), 18 decimals. Operator HTTPS RPC: https://rpc.winmarchain.io; explorer: https://scan.winmarchain.io; canonical website: https://winmarchain.io; registry PR: https://github.com/ethereum-lists/chains/pull/8740 (pending), DefiLlama Chainlist PR #3209 merged. This adds the smallest supported override. Please run `Test New Chain` for 12142816. We do not claim source verification or contract creation transaction lookup integration before it is tested.

## Verification and dependencies

1. Query public RPC `eth_chainId`; expect `0xb948e0`; query `eth_getBlockByNumber("latest",false)` and check block height. Read-only, no private keys.
2. Confirm the public Blockscout explorer is reachable. `fetchContractCreationTxUsing.blockscoutApi` is **not** included until the actual Blockscout v2 endpoint is demonstrated to meet Sourcify requirements.
3. Upstream CI `Test New Chain` may require an existing public test contract or deployment; provide a verified, non-sensitive contract address only after approval. No contract is deployed by this PR packet.
4. After upstream approval, check official Sourcify supported chains and a verifiable contract response; **do not equate merging the configuration with verified contracts**.

**Access boundary:** The connected GitHub account cannot create a fork of `sourcifyeth/sourcify-chains` using available connector actions and has no upstream write access. The exact first owner action is the fork link above. No upstream PR can be claimed submitted until a PR URL exists.

## Sourcify original references

- https://github.com/sourcifyeth/sourcify-chains#how-to-add-a-chain
- https://docs.sourcify.dev/docs/chain-support/
