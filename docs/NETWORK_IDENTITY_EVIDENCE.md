# Network identity evidence

## Purpose

This document defines the public, non-secret evidence used to identify the active Winmar Chain network without publishing or inferring unverified production genesis or QBFT configuration.

## Confirmed public identity

- Network: Winmar Chain
- Chain ID: `12142816` (`0xB948E0`)
- Native currency: WMC
- Consensus family: QBFT Proof of Authority
- Public RPC: `https://rpc.winmarchain.io`
- Explorer: `https://scan.winmarchain.io`

## Genesis block fingerprint

The public-network probe queries `eth_getBlockByNumber("0x0", false)` and records only the returned genesis block hash as a **network fingerprint**.

The fingerprint does **not** prove that a repository genesis file matches production. It does not verify QBFT timing, epoch length, validator extra-data, allocations, fork configuration, or any other genesis field.

**Current reviewed fingerprint:**

`0x82f43cfcd8c9152bae9bde20af3e790451ad1d778707f506b5794335c065c2fd`

This value was observed on 2026-09-29 from an external GitHub-hosted runner through the canonical public RPC. The probe now compares future observations against this reviewed value and fails if the fingerprint changes.

## Evidence rules

- Never infer production QBFT parameters from the block hash.
- Never publish validator private keys, keystores, passwords, recovery material, or unrestricted administrative endpoints.
- Treat a changed genesis block hash as a network-identity incident requiring investigation before release.
- Keep the production-genesis publication gate in `docs/GENESIS_QBFT_BASELINE.md` unchanged.
