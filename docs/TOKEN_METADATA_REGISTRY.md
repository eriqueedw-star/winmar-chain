# Winmar token metadata registry

This registry is the source of truth for public token identity shown by Winmar
Explorer integrations. It supports multiple tokens on chain `12142816` and keeps
metadata separate from balances, supply, price and transaction indexing.

## Local validation

```powershell
node scripts/validate-token-registry.mjs
node scripts/build-token-reindex-payload.mjs
```

The generic browser UI is at `apps/asset-registry/index.html`. It supports
WMUSD and future assets, prevents duplicate addresses in its local draft, and
exports the same registry shape for review. Local browser storage is only a
draft; it is not the production indexer database.

The generated payload is metadata-only. It must be applied through the
authenticated Blockscout/indexer administration path after the operator has
confirmed the active deployment. It does not write to the blockchain.

## WMUSD entry

WMUSD is registered at the operator-confirmed contract address with 6 decimals.
Supply, holders, transfers and price must continue to come from live RPC/oracle
and indexer data; they must not be entered in this file.
