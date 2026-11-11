# Third-party onboarding request — Winmar Chain (Chain ID 12142816)

## Official operator-supplied technical facts

**Project:** Winmar Chain — EVM-compatible Layer-1 blockchain using QBFT PoA

**Chain ID:** 12142816 (0xB948E0)

**Native gas currency:** Winmar Coin (WMC), 18 decimals; *not a token smart contract*

**Public RPC:** https://rpc.winmarchain.io

**Official explorer:** https://scan.winmarchain.io

**Website:** https://winmarchain.io

**WMC native coin artwork:** https://winmarchain.io/logo/wmc.png

**Chainlist profile:** https://chainlist.org/chain/12142816

**Canonical integration hub:** https://eriqueedw-star.github.io/winmar-chain/integrations.html

**Machine-readable wallet/integration status:** https://eriqueedw-star.github.io/winmar-chain/integrations/status.json

**Canonical technical repository:** https://github.com/eriqueedw-star/winmar-chain

**Upstream Ethereum Lists PR:** https://github.com/ethereum-lists/chains/pull/8740

**Contact for operator review:** admin@winmarchain.io (published previously in project technical dossiers; do not treat as proof of vendor approval)

## thirdweb — chain profile claim / platform integration

Please add or verify the listing for Winmar Chain (Chain ID 12142816), and advise on formal product support. Our TypeScript SDK v5 chain configuration is published at https://github.com/eriqueedw-star/winmar-chain/blob/main/integrations/thirdweb/winmar-chain.ts. We would appreciate a chain directory profile and the review requirements for thirdweb RPC, Insight, and Wallet support. We understand that `defineChain` custom EVM support does not imply these hosted services are active.

Official request form: https://share.hsforms.com/1o01TyfsZRAao2eCrzuXSVgea58c

## Routescan — multichain explorer indexing proposal

Please review the technical feasibility of indexing Winmar Chain mainnet (12142816) within Routescan's multichain directory and APIs. Our canonical Blockscout explorer at https://scan.winmarchain.io will remain the official primary explorer. Please advise indexing prerequisites (historical RPC, websocket access, archive node needs, block explorer API standards), support SLA, fees, and pilot options. We are not requesting a replacement for our existing explorer.

Official contact: https://routescan.io/contactus

## Sourcify — direct override submission

The current Sourcify chain repository allows a direct `chain-overrides.json` entry without waiting for Ethereum Lists. The prepared fork branch `eriqueedw-star/sourcify-chains:add-chain-12142816` adds the minimal canonical RPC override. Upstream PR creation still requires an owner-authenticated GitHub action because the connected integration has read-only access to `sourcifyeth/sourcify-chains`.

## Current status

All three are **prepared for operator/provider onboarding**. Requests are **not recorded as sent or approved** absent an actual external acknowledgment. No transaction or mainnet change is implied.
