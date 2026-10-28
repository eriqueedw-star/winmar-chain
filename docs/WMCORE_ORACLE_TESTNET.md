# WMCore Oracle — Testnet Foundation

`WinmarOracleRouter` is the testnet-first on-chain price-feed registry for WMCore. It is a feed boundary, not a data source: an approved updater/relayer remains responsible for collecting and validating external prices before writing them on-chain.

## Feed lifecycle

```text
provider feeds → relayer validation → WinmarOracleRouter → WMCore risk engine → API/UI
```

Each feed has:

- fixed decimals;
- heartbeat/staleness limit;
- maximum update deviation in basis points;
- pause state;
- monotonically increasing round id;
- last answer and observation timestamp.

Consumers must use `getPrice(feedId)`. It reverts for missing, paused, uninitialized, or stale feeds. WMCore should pause a market when the oracle is stale or unavailable.

## Initial testnet configuration

Recommended feed IDs are `keccak256("BTC/USD")`, `keccak256("ETH/USD")`, `keccak256("XAU/USD")`, and `keccak256("WMC/USD")`. Start with one dedicated testnet relayer key, short heartbeats, and conservative deviation limits. Do not reuse a deployer key or any production/mainnet key.

The contract is intentionally not wired into mainnet, QBFT, RPC, bridge, or DNS configuration. Deployment and provider selection require a separate review of feed availability, updater operations, monitoring, and legal/market-data licensing.

The isolated testnet starting configuration is stored in `config/oracle.testnet.json`. Run `node scripts/oracle-testnet-preflight.cjs` before any deployment. It only validates configuration and prints deterministic feed IDs; it does not connect to an RPC or send a transaction.
