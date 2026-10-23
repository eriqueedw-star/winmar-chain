# Native wallet integrations — Winmar Chain (12142816)

**Prepared:** 2026-10-24. **Third-party native listings:** unverified / pending vendor approval.

## Canonical chain and icon separation

- Chain name: **Winmar Chain**; chainId: `12142816` (`0xb948e0`).
- Execution: EVM; consensus: QBFT PoA.
- Native gas coin: **Winmar Coin (WMC)**, decimals `18`, **not a token contract**.
- Public RPC: https://rpc.winmarchain.io
- Primary explorer: https://scan.winmarchain.io
- Official website: https://winmarchain.io
- **Network identity logo** (not WMC coin): https://winmarchain.io/assets/winmar-logo.png
- **Native coin WMC logo**: https://winmarchain.io/logo/wmc.png
- Canonical SHA-256 of native WMC 401x401 PNG: `dbbd58c8a18c730825a3931c0bf41f133abca76c140f27d8c4ba0b2f58deafee`.

Do not use a WMC-20 token address to register native WMC; never replace the native coin artwork with the network logo or vice versa.

## MetaMask

MetaMask supports user-added custom EVM networks. Users can add by wallet network settings or approved chain listing. **This does not guarantee default-network inclusion, MetaMask network artwork or native asset logo display.**

Official guide: https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc

Evidence needed for native display: test current MetaMask Extension and Mobile separately; record network selector name/logo, gas ticker, transaction display, and exact platform/version (screenshots without seed phrases, wallet balances, account addresses or confidential info).

## Trust Wallet — Business Development first

Official docs: https://developer.trustwallet.com/developer/wallet-core/newblockchain/newevmchain

Trust Wallet says new blockchain PRs require a positive decision from its Business Development team **before** wallet-core upstream integration. Its general criteria mention network age, stability, documentation, RPC load balancing, market capitalization and exchange availability; we do not claim Winmar meets all criteria.

**Initial outreach:** partnerships@trustwallet.com (verify destination in the latest official docs before sending). Ask for an EVM-native blockchain review and instructions, **not** token asset PR. Request requirements/eligibility assessment and contact/acceptance ID. No GitHub vendor approval assumed.

### Submission draft (English)

Subject: Winmar Chain (12142816) — Native EVM Network Integration Review

Dear Trust Wallet Business Development Team,

We operate Winmar Chain, an EVM-compatible Layer-1 blockchain using QBFT Proof of Authority, and request an eligibility/technical review for **new native blockchain** support in Trust Wallet and Wallet Core.

Chain ID: 12142816 (0xb948e0); native gas currency: Winmar Coin (WMC), 18 decimals (no token contract); RPC: https://rpc.winmarchain.io; explorer: https://scan.winmarchain.io; website: https://winmarchain.io. The original network and WMC-native coin logos are published separately at https://winmarchain.io/assets/winmar-logo.png and https://winmarchain.io/logo/wmc.png.

Please advise qualification requirements, RPC/private load-balancing specifications, operational maturity evidence, tests, wallet-core workflow and timeline. We understand acceptance depends on your Business Development review, and this message is not an assertion that the project already qualifies.

Regards, Winmar Chain Network Operations (admin@winmarchain.io).

## Additional EVM wallets

For Rabby, SafePal and WalletConnect/Reown, validate custom EVM chain capability and formal registry requirements individually. **Generic support for EIP-155 does not mean official listing or network logo support.** Do not mark approved without a current provider-controlled reference.
