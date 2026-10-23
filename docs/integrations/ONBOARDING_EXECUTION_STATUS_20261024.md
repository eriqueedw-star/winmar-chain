# Winmar Chain onboarding execution — 2026-10-24

**Scope:** priorities 1–5: ethereum-lists, Sourcify, wallet recognition, Routescan/thirdweb, RPC privacy. **No transaction or production changes.** Source links below, no unsourced claims of external acceptance.

## (1) Ethereum Lists / DefiLlama ChainList

- Ethereum Lists PR https://github.com/ethereum-lists/chains/pull/8740: `open`, `merged=false`, `mergeable=true` at 2026-10-24 verification. HEAD `02220ba2b4ef63bbe285d10eebbb0ab8bb512798`, build/prettier/validate_json/actionlint 4/4 pass.
- Maintainership controls merge; no duplicate PR/comment spam. Await review. Original network RPC and explorer retired `.org` endpoints; canonical `.io`.
- DefiLlama chain metadata https://github.com/DefiLlama/chainlist/pull/3209 merged 2026-10-21.
- DefiLlama icon https://github.com/DefiLlama/icons/pull/2523 merged 2026-10-21.
- DefiLlama ChainList privacy fork draft https://github.com/eriqueedw-star/chainlist/pull/2 remains `unspecified` pending audited privacy; do not falsely claim no-tracking.

## (2) Sourcify

- Canonical new upstream repository: https://github.com/sourcifyeth/sourcify-chains (not auto-generated `sourcify-chains-default.json`).
- On inspection, chain `12142816` absent from upstream `chain-overrides.json` and `sourcify-chains-default.json`; this is **not** official support.
- Entry staged locally at [winmar-chain-override.json](../../integrations/sourcify/winmar-chain-override.json) with minimal custom RPC, and [upstream instructions](SOURCIFY_UPSTREAM_SUBMISSION.md).
- **Blocked for official submission** until GitHub account forks `sourcifyeth/sourcify-chains` and opens PR `add-chain-12142816`; access currently lacks fork creation and upstream write permission. Upstream CI and public test-contract evidence still required.

## (3) Wallets

- MetaMask permits custom network addition; automatic default network and native coin artwork not verified.
- Trust Wallet new-native-EVM acceptance requires BD screening; [wallet request and logo requirements](WALLET_NATIVE_CHAIN_ONBOARDING.md). No Trust Wallet approval/official listing can be asserted.
- WalletConnect/Reown, Rabby, SafePal: custom-chain support is not proof of native featured listing. Request proof before marking integrated.

## (4) Routescan / thirdweb

- Routescan email **operator-reported sent** by user, with no verified vendor case/receipt; indexed `not_verified`. [Follow-up packet](EXTERNAL_VENDOR_FOLLOWUP.md).
- thirdweb custom SDK ready, but profile claim/form and hosted products not verified. [Submission draft](EXTERNAL_VENDOR_FOLLOWUP.md).
- Both may require manual account interaction/vendor response. No commercial commitment accepted.

## (5) Public RPC privacy

- Owner-selected **target** `tracking: "none"`; GitLab manifest keeps **actual approved classification null** pending audit.
- [Implementation runbook](../RPC_NO_TRACKING_IMPLEMENTATION.md), [private-audit checklist](../RPC_PRIVACY_AUDIT.md), [provisional disclosure](../RPC_PRIVACY_DISCLOSURE.md).
- Do not publish a green/no-tracking badge until all production layers' logging, CDN/WAF retention, node requests, telemetry and correlation are independently reviewed and the official policy is published. Public RPC CI health alone is not evidence.

## Canonical network identity

Winmar Chain EVM L1; QBFT PoA; Chain ID 12142816/0xb948e0; native WMC 18 decimals, no token contract; https://rpc.winmarchain.io; https://scan.winmarchain.io; https://winmarchain.io. The original **network logo** https://winmarchain.io/assets/winmar-logo.png is different from the **WMC coin logo** https://winmarchain.io/logo/wmc.png.

## Change management

Prepare, test, merge only internal public documentation/readiness metadata in this PR. Requires verified external evidence for vendor status upgrades and explicit access approvals for server changes. **No validator, RPC service, wallet keys, coin assets, user data, paid service or transaction should be changed by registry preparation.**
