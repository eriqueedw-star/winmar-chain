# QBFT validator and transaction receipt evidence

This is a **manual, read-only** workflow. It reads primary and backup Winmar Chain RPC endpoints and creates an evidence artifact. It never signs or sends transactions.

Checks:
- Both endpoints return expected Chain ID 12142816.
- Attempts `qbft_getValidatorsByBlockNumber("latest")` on both endpoints. If unavailable, status is **unavailable**, not zero validators or failed consensus.
- Scans up to 120 recent common-height blocks for transaction hashes (maximum three per block), retrieves receipts from both RPC endpoints and verifies transaction hash, block hash, and matching execution status. Reports success versus revert.
- If no receipts are found, records **no_verifiable_receipts_in_sample**, not a passing transaction test.

Limitations: Public RPC validator method output is not validator liveness, consensus quorum, or validator signature verification. The receipt scan is bounded, may encounter empty blocks, and does not perform a bridge transfer. Workflow success means script completed without invalid data; inspect evidence fields for coverage.

Previous evidence: [run 38887967387](https://github.com/eriqueedw-star/winmar-chain/actions/runs/38887967387) showed matching primary/backup block hashes but zero transactions in the selected block.

After merge, manually run **QBFT and transaction receipt evidence** on `main` and inspect the generated ZIP.
