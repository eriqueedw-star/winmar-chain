# WMUSD Security Regression — 2 November 2026

Scope: PR #60, pre-launch source and deployment tooling only. No deployment or activation was performed.

## Changes and accounting policy

- Redemption references are global single-use identifiers across holders and burner operators. Reverted burns roll back reference consumption and allowance changes atomically.
- The mint cap limits outstanding `totalSupply()`, including after partial or full redemption. `totalMintedAgainstReserve` remains a cumulative audit counter.
- Reissuance still requires new verified reserve evidence. Released token capacity is not proof of cash reserve; reconcile redeemed cash, new deposits, the approved reserve cap, and the issuance ledger before minting.
- Enabling minting with a zero cap reverts. Zeroing the cap disables issuance; restoring the cap does not reactivate it.
- Distribution has an independent admin gate, default false; both direct and delegated transfers are blocked until separate launch approval. Redemption remains independently disabled by default.
- Zero-amount mint and redemption calls cannot consume references.
- Staging deployment verifies the RPC's actual `eth_chainId`, accepts only 12142818, and omits RPC credentials from success output. Mainnet deployment is hard-blocked pending a separately reviewed release PR.
- Dependency versions are pinned to the versions already present in the deployment lockfile: solc 0.8.37, OpenZeppelin 5.6.1, ethers 6.17.0. The WMUSD artifact was rebuilt and checked against source, ABI, compiler metadata and bytecode in the regression suite.

## Local verification

- 55 JavaScript tests passed: ecosystem transactions, WMUSD contract security and artifact parity, mocked deployment guards, and document-verification integration.
- 21 Python tests passed: document proof/artwork validation and static Explorer release checks.
- Mutation checks confirmed the replay regression fails if the duplicate-reference guard is removed, and the cap regression fails if the lifetime issuance counter is restored as the cap basis.
- Tests use an in-memory EVM with ephemeral generated accounts; WMUSD tests use staging Chain ID 12142818. Deployment guard tests use only a loopback mock RPC and do not deploy.
- Publication audit, ecosystem UI checks, JSON validation and Markdown checks were run separately from contract execution.

## Integration and remaining launch gates

The PR branch was synchronized with main to resolve the existing add/add Treasury Room conflict, retaining main's latest Treasury Room page. The static Explorer packager now accepts the numeric cache-version suffixes already present in main, without changing packaged file bytes or the asset allowlist.

This focused security regression is not an independent smart contract audit or evidence of reserve backing. All pre-launch gates in `WMUSD_PRELAUNCH_RUNBOOK.md` and `WMUSD_MAINNET_RELEASE_CHECKLIST.md` remain required. Other Treasury Room review findings remain subject to their own review; this change does not claim the full console is production-ready.

The contract is not upgradeable. Existing deployed bytecode is not changed by this source patch and must not be assumed protected by these fixes.
