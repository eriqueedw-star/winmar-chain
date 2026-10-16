# Validator and transaction integrity audit

Manual read-only GitHub Actions workflow. No signing or transaction submission.

Validates primary and backup RPC chain IDs, genesis hashes, block heights and eth_syncing=false. Compares the hash of a common block and inspects a sample transaction if present.

Limits: RPC health does not prove the full QBFT validator set is healthy. No validator identities, transaction receipt confirmation, or bridge transfers are verified. An empty block is not transaction success evidence.

Baseline: public-network-evidence run 38886906105 on 2026-10-16T10:23:33Z, source commit ee46b506d44e8d5b7a37485d7f3e624b9156ea0a, eth_syncing=false, blocks 721490 to 721502 in 30 seconds. Uploaded ZIP SHA-256: 0a9fcccaae65a09c4ba7c2354b099502c2817c4e206d493eb0358cb2162ec31d.

Run via Actions > Validator and transaction integrity audit > Run workflow, after merging this PR.
