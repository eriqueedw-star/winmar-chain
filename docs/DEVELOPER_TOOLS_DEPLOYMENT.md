# Developer tools mainnet deployment

## Purpose

This runbook deploys the Winmar Token Factory and native WMC Faucet to Winmar Chain mainnet.

## Mainnet identity

- Network: Winmar Chain
- Chain ID: `12142816`
- Native currency: WMC
- RPC: `https://rpc.winmarchain.io`
- Explorer: `https://scan.winmarchain.io`

## Deployment safety

The workflow requires an explicit `DEPLOY_MAINNET` confirmation and references the GitHub `production` environment.

Store the deployer private key only as the `WINMAR_MAINNET_DEPLOYER_PRIVATE_KEY` environment secret. Never paste it into chat, source files, workflow YAML, or logs. GitHub recommends using encrypted secrets and environment protection for sensitive deployment credentials. citeturn0search0turn0search3

The script verifies that the RPC actually reports Chain ID `12142816` before sending any deployment transaction.

## Faucet funding

The faucet contract is deployed **unfunded** by this workflow. Deployment does not transfer WMC into the faucet.

Funding the faucet is a separate operational transaction and should be recorded after the contract address is reviewed.

Default faucet parameters:

- claim amount: `0.1 WMC`;
- cooldown: `24 hours`;
- daily cap: `100 WMC`.

These parameters control the contract only; they do not fund it.

## Required GitHub environment

Create the environment named `production` and add:

- `WINMAR_MAINNET_DEPLOYER_PRIVATE_KEY` — the private key of a dedicated deployment wallet with enough WMC to pay gas.

Do not use a validator signing key as the deployment key.

Where possible, configure required reviewers for the production environment so the deployment job cannot access the private key until the deployment is approved. GitHub environment secrets are only exposed to jobs that reference the environment and can be gated by required reviewers. citeturn0search3turn0search5

## Deploy

1. Ensure the `production` environment secret exists.
2. Confirm the deployment wallet has WMC for gas.
3. Open Actions → `Mainnet developer tools deployment`.
4. Run workflow and enter exactly `DEPLOY_MAINNET`.
5. Approve the `production` environment if protection is enabled.
6. Review the deployment artifact for factory and faucet addresses and transaction hashes.
7. Verify both contracts on the explorer before publishing their addresses in `config/developer-tools.json`.

Mainnet deployment creates real on-chain contracts and consumes gas. Smart-contract deployments should be reviewed and source-verified before being treated as production-ready. citeturn0search10
