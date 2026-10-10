# Chainlist registration

Winmar Chain is tracked through two upstream integration layers.

## Ethereum Lists registry

- Pull request: https://github.com/ethereum-lists/chains/pull/8740
- Contributor fork: `eriqueedw-star/chains`
- Branch: `patch-1`
- Chain definition: `_data/chains/eip155-12142816.json`
- Icon definition: `_data/icons/winmar.json`
- Icon CID: `bafkreidusntleelv3wx2pswfo5gc4hwis44ig4ume4l6jftu74pysp2lem`

The pending PR sets these canonical production endpoints (all other Winmar domains are deprecated):

- RPC: `https://rpc.winmarchain.io`
- Explorer: `https://scan.winmarchain.io`
- Website: `https://winmarchain.io`

The Ethereum Lists PR remains open as of 2026-10-10. Merge and publication are controlled by upstream maintainers.

## Chainlist / DefiLlama layer

Chainlist is maintained in `DefiLlama/chainlist`. Its frontend renders chain logos from `chainSlug` using `icons.llamao.fi`, so Ethereum Lists icon metadata alone does not guarantee that the Chainlist card displays a logo.

Prepared integration artifacts:

- `DEFILLAMA_INTEGRATION.md` — current integration analysis and access limitation.
- `defillama-chainlist-12142816.patch` — ready-to-apply Winmar Chain override with `chainSlug: "winmar"`.
- `defillama-icons-winmar.md` — canonical logo source and expected icon endpoint.

Submission status checked on 2026-10-10:\n\n- [DefiLlama Chainlist PR #3209](https://github.com/DefiLlama/chainlist/pull/3209): open, proposes canonical .io endpoints.\n- [DefiLlama Icons PR #2523](https://github.com/DefiLlama/icons/pull/2523): open.\n\nThe connected GitHub integration has read-only access to the two DefiLlama repositories. The existing submitted PRs require upstream maintainer review and merge before publication.
