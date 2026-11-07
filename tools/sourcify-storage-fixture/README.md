# Sourcify Storage fixture deployment

This package deploys the **exact Storage contract bytecode used by Sourcify's own chain integration fixture** to Winmar Chain.

It exists because the canonical Sourcify blueprint probes on Winmar Chain returned no bytecode at:

- CreateX `0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed`
- Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`
- SafeProxyFactory `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67`

Sourcify requires a test contract for chains introduced through `chain-overrides.json`.

## Safety

The deployment script:

- hard-locks RPC to `https://rpc.winmarchain.io`;
- refuses to proceed unless the RPC reports Chain ID `12142816`;
- does **not** broadcast by default;
- reads the private key only from `SOURCIFY_DEPLOYER_PRIVATE_KEY`;
- never writes the private key to disk or stdout;
- deploys exactly one no-privilege Storage fixture contract.

## Dry run

```sh
cd tools/sourcify-storage-fixture
npm install
npm run inspect
```

## Broadcast

Use a funded Winmar Chain wallet dedicated to deployment. Do not commit the key.

```sh
export SOURCIFY_DEPLOYER_PRIVATE_KEY='0x...'
npm run deploy
unset SOURCIFY_DEPLOYER_PRIVATE_KEY
```

After deployment, copy the emitted address into the Sourcify fork:

```json
{
  "12142816": "0xDEPLOYED_STORAGE_ADDRESS"
}
```

Target file:

`tests/fixtures/storage-contract-chain-addresses.json`

Then push the updated `add-chain-12142816` branch. The upstream **Test New Chain** workflow can verify the fixture after a Sourcify maintainer approves the fork workflow run.

## Canonical fixture provenance

The bytecode is copied from Sourcify's:

`scripts/fixtures/storage.artifact.json`

and corresponds to compiler `0.8.7+commit.e28d00a7`, EVM `london`, optimizer disabled.


## GitHub Actions one-shot deployment

Repository workflow: `.github/workflows/deploy-sourcify-storage.yml`.

Required repository/environment secret:

`SOURCIFY_DEPLOYER_PRIVATE_KEY`

Recommended environment protection:

`sourcify-storage-deploy`

The workflow only broadcasts when manually dispatched with the exact confirmation value:

`DEPLOY_SOURCIFY_STORAGE`

It runs the dry-run first, broadcasts exactly one Storage deployment, and uploads `deploy-result.json` containing only the contract address, transaction hash, block number and Sourcify fixture patch. The private key is never written to the artifact.
