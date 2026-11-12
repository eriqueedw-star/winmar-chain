# PR #12 and #23 integration audit — remediation gates

Date: 2026-10-17. Read-only source review; no mainnet transactions, deployment, or funding performed.

## PR #12 — wallet guards and token receipt

**Finding:** PR #12 targets an older, different developer-tools page. Its patch edits `apps/developer-tools/index.html` with legacy element IDs (`tabFaucet`, `tabToken`, `faucetStatus`, `tokenStatus`) while `main` now has `t-faucet`, `t-creator`, `faucet-result`, `token-result`, Cognito account state, and a revised UI shell. Do **not** merge the stale patch directly.

- [ ] Reimplement only relevant improvements against the current `main` app: matching `TokenCreated` event ABI/receipt parsing, chain ID and account checks, signer invalidation, and config fetch failure handling.
- [ ] Gate *every* write action on wallet connection, expected chain ID **12142816**, verified deployed address and current application authentication requirements.
- [ ] Respect `deployed-paused` and `funded: false` for the faucet: claim remains disabled, even with a connected wallet.
- [ ] Reject stale async wallet operations after `accountsChanged`, `chainChanged`, `disconnect`, or session signout.
- [ ] Check the actual factory ABI/event signature against `contracts/WinmarTokenFactory.sol`; confirm receipt parsing with a local EVM fixture.
- [ ] Test Cognito login/logout, wallet rejection, wrong chain, account change, stale signer, config 404, token creation with local EVM only, and responsive UI.
- [ ] Keep no hardcoded secrets or auto-signatures. Preserve current header/footer and bridge transfers disabled.

## PR #23 — faucet V2

**Finding:** The proposed V2 contract uses `hasClaimed[recipient]` and a daily cap. This limits *addresses*, not people; new addresses can still claim. Starts paused, but no production deploy or relayer service was verified.

**Critical integration gap:** PR #23 adds V2 deployment mode, but the existing `main` config still describes the deployed, paused, unfunded **legacy** faucet at `0x06411bf8C2d396F8889860ff3f93Bb6C9698d5b4`. A successful V2 contract deploy does not automatically migrate website config, relayer service, treasury, or front-end ABI. Do not unpause or fund before these are reviewed.

- [ ] Rebase onto current `main`, resolve conflicts and run all checks.
- [ ] Confirm the intended `0.00001 WMC` payout and `10 WMC` UTC-day cap with product owner; do not silently substitute them for V1 values.
- [ ] Audit Solidity externally before mainnet funding; test malicious recipient, reentrancy, daily rollover, boundary cap, relayer changes, withdrawal, pause, and parameter changes.
- [ ] Separate contract build/verification from deployment. Production deployment requires explicit approval and GitHub protected environment, never implicit CI.
- [ ] **Avoid `all` redeploying the existing token factory** when only V2 faucet is intended. Require V2-only mode and verified admin, bytecode, paused state, transaction receipt and explorer record.
- [ ] Review anti-Sybil measures, relayer abuse limits, key custody, rate limiting, monitoring and treasury funding plan.
- [ ] Verify frontend reads the new contract ABI and a reviewed V2 address before enabling claims; a wallet without WMC cannot pay for a direct claim.
- [ ] Keep V2 paused and unfunded until relayer, website, monitoring, and operations pass sign-off.

## Decision and acceptance

**PR #12:** needs rewrite/port to the current UI; not ready for merge as-is.

**PR #23:** contract/tests are promising but require integration and production safety review; not ready for deployment. Merge code only after conflicts, CI and contract review; merge is not permission to deploy.

Both PRs currently report `mergeable: false` in GitHub metadata (could be conflict or other merge restriction; inspect merge conflict details before assigning cause). Historical green CI on their old heads does not prove compatibility with latest `main`.

Do not close the source PRs without author review. Do not change chain validators, RPC, DNS, or production infrastructure as part of this audit.
