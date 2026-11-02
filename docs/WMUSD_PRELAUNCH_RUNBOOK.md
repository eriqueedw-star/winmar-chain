# WMUSD Pre Launch Runbook

## Current status

WMUSD is in pre-launch review for Winmar Chain mainnet, Chain ID 12142816. Staging uses Chain ID 12142818; staging tests are not mainnet deployment or launch evidence. The contract is designed to remain non-mintable until the reserve, attestation, legal, compliance, and security gates are complete.

## Contract safety gates

- `mintingEnabled`, `redemptionEnabled`, and `distributionEnabled` are false at deployment.
- Deployment tooling always supplies `initialMintCap = 0`. The mainnet release script is hard-blocked during pre-launch.
- `mintCap` must be a positive verified limit before minting can be enabled.
- `mintCap = 0` is a hard mint block, not an unlimited mode. Setting it to zero disables minting; restoring a positive cap requires a fresh explicit activation.
- `mintCap` limits outstanding `totalSupply()` in 6-decimal base units. `totalMintedAgainstReserve` is a cumulative audit counter, not the cap basis.
- Redemption releases outstanding-supply capacity but does not prove new reserves. Reissuance requires a new, verified, globally unique reserve reference and fresh ledger reconciliation; never reuse the original reserve evidence.
- Each nonzero redemption reference is consumed globally, once only, across all holders and burners. A reverted transaction does not consume it.
- Zero-value minting and redemption are rejected.
- Ordinary transfers and `transferFrom` require separate `distributionEnabled` approval; reserve minting and approved redemption do not enable distribution.
- Public sale and swap are not part of the token contract and must remain disabled in the application UI.
- Redemption must not be advertised or opened until the redemption policy and legal review are complete.
- Admin, minter, burner, and pauser roles should be held by approved multisig or operational controls before mainnet deployment.

## Activation gates

1. Bank confirmation is received through a verifiable official channel.
2. An independent attestor confirms eligible reserve and the reporting date.
3. The reserve policy, redemption policy, disclosures, AML/KYC controls, and jurisdictional review are approved.
4. The smart contract audit is complete and all findings are resolved.
5. The verified reserve amount is recorded in the issuance ledger.
6. The administrator sets a positive mint cap no higher than the approved amount.
7. The administrator enables minting only after the previous gates are documented.
8. Public distribution remains disabled until separate launch approval is recorded; only then may the administrator call `setDistributionEnabled(true)`, after mint activation.
9. Redemption remains disabled until all preceding reserve, attestation, compliance and audit gates, the redemption policy, and operational approval are documented; only then may the administrator call `setRedemptionEnabled(true)`.

These evidence approvals are off-chain controls enforced by the approved admin multisig and issuance ledger. The contract cannot independently validate bank confirmations, attestations, or legal clearance. No activation transaction or deployment is authorized by regression testing or by merging this package.

Before any future mainnet release, an independently reviewed release PR must remove the mainnet hard stop, lock the freshly compiled artifact and its SHA-256, and complete `WMUSD_MAINNET_RELEASE_CHECKLIST.md`. Existing artifacts and deployed contracts do not acquire these fixes automatically; this contract is not upgradeable.

## Public wording before launch

> WMUSD is not yet launched. Minting and public distribution are disabled pending reserve verification, independent attestation, legal and compliance review, and smart contract audit.

Do not describe WMUSD as fully backed, redeemable, MAS-regulated, or available for public sale before the relevant approvals are complete.
