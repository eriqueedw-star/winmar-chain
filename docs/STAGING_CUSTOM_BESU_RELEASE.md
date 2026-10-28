# Winmar Custom Besu Staging Release

Status: pre-mainnet rehearsal only. Do not deploy to production yet.

## Artifact

- Source revision: `d97cbd61976a52bb109e637196fef9a8ebf2b617`
- Binary archive: `besu-26.10-develop-d97cbd6.zip`
- Binary SHA-256: `BE22AAE590D03751C24711BBA3CE4AE37BBE0CE3626E4DB82A21B7038795751E`
- Staging image: `winmar/besu-fee-staging:configurable-treasury`
- Staging image digest: `sha256:1f051681c92d999e658c08904b3b999196dfe13619f14a784644a5e5d201461a`

## Fee policy tested

- Legacy transactions with `gasPrice=1 Gwei`.
- Treasury recipient is supplied at runtime with `-Dwinmar.treasury=<address>`; no binary default is present.
- Treasury: `0xd854F57E1375B9128D643F1F812484d1c2FfAd46`.
- Full `gasUsed * gasPrice` routed to treasury.
- London is delayed in the disposable legacy staging genesis.

## Evidence

- 21,000-gas transfer: treasury delta `21,000,000,000,000 wei`.
- Three transfers: treasury delta `63,000,000,000,000 wei`.
- Contract deployment: gas used `55,316`; treasury delta `55,316,000,000,000 wei`.
- Five staging validators running the same custom image; peer count `4` from Stockholm.

## Gate before mainnet

1. Replace the hard-coded treasury recipient with a genesis/protocol-configured value.
2. Run focused fee-routing tests and the full relevant Besu test suite.
3. Produce a reproducible build and verify the checksum on every validator.
4. Back up production data and define a tested rollback procedure.
5. Perform a validator-by-validator rehearsal before any mainnet change.
