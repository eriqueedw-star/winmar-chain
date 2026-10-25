# Wallet discovery and logo audit — 2026-10-25

## Scope

This audit covers Chain ID `12142816`, the Winmar Chain network artwork, and
the native WMC coin artwork. A successful public image response is evidence of
availability only; it is not evidence of MetaMask, Trust Wallet, SafePal, or
another vendor approving or shipping the asset.

## Current public evidence

| Item | Canonical URL | Result |
| --- | --- | --- |
| Network logo | https://winmarchain.io/assets/winmar-logo.png | HTTP 200; PNG; 512×512; SHA-256 `749366b21175ddafa7cac5774c2e1ec8973883728c2717e49674ff1f893f4b23` |
| Native WMC logo | https://winmarchain.io/logo/wmc.png | HTTP 200; PNG; 401×401; SHA-256 `dbbd58c8a18c730825a3931c0bf41f133abca76c140f27d8c4ba0b2f58deafee` |

The files are intentionally distinct. Do not substitute the network logo for
the native coin logo, and do not submit native WMC as an ERC-20 token.

## Registry and vendor status

- DefiLlama ChainList PR [#3209](https://github.com/DefiLlama/chainlist/pull/3209): merged.
- DefiLlama icons PR [#2523](https://github.com/DefiLlama/icons/pull/2523): merged.
- Ethereum Lists PR [#8740](https://github.com/ethereum-lists/chains/pull/8740): open as of this audit; merge and review remain controlled by upstream maintainers.
- GitLab registry pipeline [#37](https://gitlab.com/winmar-chain/winmar-chain-registry/-/pipelines/2984060838): successful, but this is only Winmar's registry CI.
- MetaMask: custom-network/EIP-3085 availability does not prove default discovery or native WMC artwork support.
- Trust Wallet and SafePal: no vendor approval or native WMC listing is asserted without a vendor-controlled response.

## Recheck procedure

Fetch both URLs, verify HTTP 200 and PNG dimensions, calculate SHA-256, and
compare the results with this file and `WMC_NATIVE_COIN_WALLET_LOGO.md`.
Record the wallet name, platform, app version, network selector behavior,
native ticker, and screenshot-free evidence separately for each vendor.
