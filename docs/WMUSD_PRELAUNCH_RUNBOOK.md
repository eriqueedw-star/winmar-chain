# WMUSD Pre Launch Runbook

## Current status

WMUSD is in pre-launch status on Winmar Chain, Chain ID 12142816. The contract is designed to remain non-mintable until the reserve, attestation, legal, compliance, and security gates are complete.

## Contract safety gates

- `mintingEnabled` is false at deployment.
- `mintCap` must be a positive verified limit before minting can be enabled.
- `mintCap = 0` is a hard mint block, not an unlimited mode.
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
8. Public distribution remains disabled until separate launch approval is recorded.

## Public wording before launch

> WMUSD is not yet launched. Minting and public distribution are disabled pending reserve verification, independent attestation, legal and compliance review, and smart contract audit.

Do not describe WMUSD as fully backed, redeemable, MAS-regulated, or available for public sale before the relevant approvals are complete.
