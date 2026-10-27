# WMUSD Staging Test Evidence

Status: pre-mainnet staging only. This document is not reserve attestation and
does not authorize mainnet issuance.

## Environment

- Chain ID: `12142818`
- RPC: local staging RPC on port `28545`
- Consensus: QBFT with five validators
- Contract: `0x2B1a525DE96C36972ECB5D850638d8c85755E585`
- Token: `Winmar USD Stablecoin (WMUSD)`
- Decimals: `6`

## Test evidence

- Cap update transaction: `0x30f30a91d8c8d4606846be285641839e7136a1481cbd159303a3df7e410a7441`
- Cap update status: successful
- Cap update block: `6148`
- Cap after test: `100 WMUSD` (`100000000` base units)
- Mint test result: `1 WMUSD` minted using a staging-only reserve reference
- Duplicate reserve reference: rejected
- Mint above cap: rejected

## Final dormant state

After testing, the staging contract was returned to:

- `mintingEnabled = false`
- `redemptionEnabled = false`
- `mintCap = 0`
- `totalSupply = 1 WMUSD` from the isolated test mint

The remaining test supply is not public, not redeemable, and not evidence of
off-chain reserves. Mainnet was not modified.

No private keys, seed phrases, passwords, or OTPs are stored in this repository.
