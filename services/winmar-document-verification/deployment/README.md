# Document Fee Payment Deployment Tool

This tool deploys `DocumentFeePayment` only from a verified build artifact.
It performs chain ID, treasury, fee, artifact, balance, and environment
preflight checks. It defaults to dry-run whenever the deployer key is absent.

## Required artifact

Create a verified artifact at `artifacts/DocumentFeePayment.json` with:

```json
{ "abi": [], "bytecode": "0x..." }
```

Do not copy private keys into the repository. Use a secret manager or a
process environment variable. Never paste a private key into chat or logs.

## Dry run

```powershell
Copy-Item .env.example .env
$env:RPC_URL='https://rpc.winmarchain.io/'
$env:CHAIN_ID='12142816'
$env:DOCUMENT_FEE_TREASURY='0x2d26e199f9be1A907239e403c4fad14C0856E7FD'
$env:DOCUMENT_FEE_WEI='2100000000000000'
npm install
npm run deploy:dry-run
```

## Production gate

Production requires `--environment production --confirm-mainnet`, a verified
artifact checksum, a funded deployer controlled by the approved multisig
process, and a recorded deployment approval. The script does not rotate the
treasury or change the fee after deployment.
