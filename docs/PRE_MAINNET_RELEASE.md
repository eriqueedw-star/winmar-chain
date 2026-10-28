# Winmar Chain Pre-Mainnet Release

Status: pre-mainnet rehearsal passed; production deployment pending final approval.

- Chain ID: `12142818`
- Consensus: QBFT
- Validators: Stockholm, Singapore, Sydney, Tokyo 2, Tokyo 7
- Gas model: legacy gas fee, minimum gas price `1 Gwei`
- Fee routing: 100% of `gasUsed * gasPrice` to treasury
- Treasury: `0xd854F57E1375B9128D643F1F812484d1c2FfAd46`
- Validator peer count: `4`
- Fee smoke test: passed with `21,000` gas and `21,000,000,000,000 wei` fee

## Release checksums

- Custom Besu ZIP: `BE22AAE590D03751C24711BBA3CE4AE37BBE0CE3626E4DB82A21B7038795751E`
- Pre-mainnet genesis: `8FF3113742E8AB5697864201B8391DC5C2654BE492D72C99B6D51B3124D43E7F`
- Pre-mainnet compose: `F4C6C81B5588FD900D2E88FDCF75564325E0CEAFFA0EE45D4EAEEE9BB5176397`

Production deployment remains blocked until the operator stores the rotated validator keys in the production secret store and completes final approval/rollback review.
