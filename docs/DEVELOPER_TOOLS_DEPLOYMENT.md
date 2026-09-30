# Developer tools deployment

## Purpose

This runbook deploys the Winmar Token Factory and native WMC Faucet to a dedicated testnet/devnet.

## Hard safety boundary

The deployment script refuses Chain ID `12142816`.

That is the Winmar mainnet identity. The faucet must never be funded from the mainnet validator or production treasury by this tooling.

Do not commit the deployer private key, RPC credentials, or generated deployment manifest containing sensitive infrastructure details.

## Required environment

- `WINMAR_TESTNET_RPC_URL`
- `WINMAR_TESTNET_CHAIN_ID`
- `WINMAR_TESTNET_PRIVATE_KEY`

Optional faucet configuration:

- `WINMAR_FAUCET_CLAIM_AMOUNT` — default `0.1` WMC.
- `WINMAR_FAUCET_COOLDOWN_SECONDS` — default `86400`.
- `WINMAR_FAUCET_DAILY_CAP` — default `100` WMC.

## Build

```bash
bash scripts/build-developer-tools.sh
```

## Deploy

```bash
npm install --no-save ethers@6.15.0
node scripts/deploy-developer-tools.mjs
```

The script verifies the RPC chain ID before deployment, deploys the Token Factory and Faucet, waits for both transactions, and writes a deployment manifest outside the tracked configuration.

## GitHub Actions

The repository includes a manual workflow named `Developer tools deployment`.

Configure these repository or environment secrets before using it:

- `WINMAR_TESTNET_RPC_URL`
- `WINMAR_TESTNET_CHAIN_ID`
- `WINMAR_TESTNET_PRIVATE_KEY`

The workflow must be manually dispatched and refuses Chain ID `12142816`.

## Post-deployment review

Record and independently verify:

1. Token Factory address and deployment transaction.
2. Faucet address and deployment transaction.
3. Testnet chain ID and RPC.
4. Faucet claim amount, cooldown, and daily cap.
5. Contract source verification status.
6. Successful claim and token-creation smoke tests.

Only after review should `config/developer-tools.json` be changed from `configured: false` to the reviewed deployment addresses.

Never represent a deployment as live merely because a deployment script completed.