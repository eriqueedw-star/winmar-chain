# Winmar Chain Pre-Mainnet

Isolated pre-mainnet rehearsal using chain ID `12142818`.

The node image is the pinned official `hyperledger/besu:26.10.0` image.

Start requirements:

- Docker Desktop Linux engine must be running.
- Set `WMC_PREMAINNET_RUNTIME` to the Besu runtime directory.
- Set `WMC_PREMAINNET_KEYS` to the isolated pre-mainnet keys directory.
- Never point these variables at production validator keys or data.

An isolated runtime can be generated with:

```powershell
node .\generate-isolated-staging.mjs
$env:WMC_PREMAINNET_RUNTIME = (Resolve-Path .\isolated-runtime).Path
$env:WMC_PREMAINNET_KEYS = (Resolve-Path .\isolated-runtime\keys).Path
docker compose -f .\docker-compose.pre-mainnet.yml config
docker compose -f .\docker-compose.pre-mainnet.yml up -d
```

The generated runtime uses chain ID `12142818` and fresh disposable validator
keys. It is not connected to production RPC, production genesis, production
validator data, faucet services, token creator services, or document
verification services.

- Validator names: Stockholm, Singapore, Sydney, Tokyo 2, Tokyo 7
- Consensus: QBFT
- Fee model: legacy gas fee, minimum gas price 1 Gwei
- Fee recipient: treasury `0xd854F57E1375B9128D643F1F812484d1c2FfAd46`
- RPC host port: `28545` (kept separate from the mainnet tunnel)
- P2P host port: `32303` (kept separate from the mainnet tunnel)

This environment is isolated from production and must not reuse production data directories or validator keys.
