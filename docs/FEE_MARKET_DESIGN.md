# Winmar Chain Fee Market Design

Status: design and staging preparation only. Not deployed to production.

## Target policy

- Consensus: Besu QBFT
- Fee market: EIP-1559-compatible London rules
- Initial target base fee: `1 Gwei`
- Initial minimum priority fee: `0.1 Gwei`
- Proposed treasury: `0xd854F57E1375B9128D643F1F812484d1c2FfAd46`
- Validator proposer fee wallets:
  - Stockholm: `0xBBf5097A8f90A93a99bf062ca75ADe454EFa2C53`
  - Singapore: `0x03aEa6165a898D5F2a6B6755d0D94bC23019116f`
  - Sydney: `0x110E7cBCCa1244e9CF2F6b39531C9F9ff5910F33`
  - Tokyo 2: `0x362601aC4212d77A6A3BD5F5977a704B0039a8A9`
  - Tokyo 7: `0xAc3cBe61B28eD462b7CC8A880664c941b212820E`

## Important protocol distinction

Native EIP-1559 burns the base fee. It does not redirect the base fee to a treasury. A treasury-funded base fee therefore requires a reviewed custom Besu/protocol implementation or an explicitly designed fee-collection mechanism. A wallet address alone cannot change this consensus behavior.

Priority fees may be paid to the block beneficiary, but the proposer-to-wallet mapping must be verified against the exact Besu build and genesis rules before rollout.

## Staging gates

1. Obtain a sanitized copy of the production genesis and record its SHA-256 checksum.
2. Build or select the exact Besu version and custom fee implementation.
3. Run an isolated QBFT staging network with a different chain ID and non-production keys.
4. Verify base-fee accounting, priority-fee beneficiary, rejected underpriced transactions, RPC fields, and restart recovery.
5. Test a transition or hard-fork block with all five validator configurations and confirm identical block hashes.
6. Produce a signed rollback plan and operator runbook.

## Production gates

Do not change production until staging passes and the following are available: reviewed binary checksum, genesis/transition checksum, validator-by-validator rollout order, backup locations, health checks, and a scheduled maintenance window. Never place validator or wallet private keys in this repository.
