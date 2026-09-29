# Chainlist registration

Winmar Chain is tracked through two upstream integration layers.

## Ethereum Lists registry

- Pull request: https://github.com/ethereum-lists/chains/pull/8740
- Contributor fork: `eriqueedw-star/chains`
- Branch: `patch-1`
- Chain definition: `_data/chains/eip155-12142816.json`
- Icon definition: `_data/icons/winmar.json`
- Icon CID: `bafkreidusntleelv3wx2pswfo5gc4hwis44ig4ume4l6jftu74pysp2lem`

The pending PR changes the canonical RPC and explorer from legacy `.org` endpoints to:

- RPC: `https://rpc.winmarchain.io`
- Explorer: `https://scan.winmarchain.io`
- Website: `https://winmarchain.io`

At the latest review, the PR is open and mergeable and its recorded `prettier`, `build`, `actionlint`, and `validate_json` checks pass. Merge and publication remain controlled by upstream maintainers.

## Chainlist.org / DefiLlama layer

Chainlist.org is maintained in `DefiLlama/chainlist`. Its frontend renders chain logos from `chainSlug` using `icons.llamao.fi`, so ethereum-lists icon metadata alone does not guarantee that the Chainlist.org card displays a logo.

Prepared integration artifacts:

- `DEFILLAMA_INTEGRATION.md` — current integration analysis and access limitation.
- `defillama-chainlist-12142816.patch` — ready-to-apply Winmar Chain override with `chainSlug: "winmar"`.
- `defillama-icons-winmar.md` — canonical logo source and expected icon endpoint.

The connected GitHub integration currently has read-only access to the two DefiLlama repositories, so their maintainers or a writable fork must apply these prepared changes.
