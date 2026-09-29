# DefiLlama Chainlist integration

## Why this is required

Chainlist.org currently consumes chain data from `https://chainid.network/chains.json`, but its frontend also applies its own registry and icon behavior.

For Winmar Chain, two upstream actions are required:

1. Merge `ethereum-lists/chains#8740` so `chainid.network` publishes the canonical `.io` RPC, explorer, website, network name, and icon metadata.
2. Add a Winmar-specific override or chain slug in `DefiLlama/chainlist` and publish the matching `winmar` chain logo in `DefiLlama/icons`.

## Current verified state

At the latest review:

- `ethereum-lists/chains#8740` is open and mergeable.
- All four recorded upstream checks pass: `prettier`, `build`, `actionlint`, and `validate_json`.
- The upstream `master` chain record still points to `https://rpc.winmarchain.org` and `https://scan.winmarchain.org`.
- The upstream `master` icon record `_data/icons/winmar.json` does not yet exist.
- `DefiLlama/chainlist` has no Winmar Chain ID mapping or override.
- `DefiLlama/icons` has no Winmar chain asset in the reviewed source.

## Prepared patch

The ready-to-apply DefiLlama registry patch is stored at:

`chainlist/defillama-chainlist-12142816.patch`

The corresponding icon publication requirements are stored at:

`chainlist/defillama-icons-winmar.md`

## Access limitation

The connected GitHub integration has read-only access to `DefiLlama/chainlist` and `DefiLlama/icons`. Direct branch creation and issue creation were both rejected by GitHub with `403 Resource not accessible by integration`.

A fork with write access, or an upstream maintainer applying the prepared patch, is required to submit the DefiLlama changes.
