# Mainnet Promotion Gate

Status: **not approved for production deployment**.

## Verified

- Custom Besu focused fee-routing test: `BUILD SUCCESSFUL`
- Staging chain ID: `12142818`
- Staging validators: 5 running, peer count 4
- Staging gas price: `1 Gwei`
- Production chain ID remains: `12142816`
- Binary: `besu-26.10-develop-8c5ce6a.zip`
- Binary SHA-256: `A338D44AE2BDE65F6A07899CD518AB062B8F643CEFFC02528C5F201DF959C33B`
- Staging genesis SHA-256: `A730847F3D6B6104BC7A2BE2869E45BE379EB4FDCF750B65BF16CB6B81E1A739`
- Staging compose SHA-256: `17D069D58F30826DE80626A5DCF80525FE61D49EDDB9A1A28290D6FD8506531E`

## Still required before production

1. Operator creates and verifies backups of all five production validator data directories, current genesis/config, service units, and logs.
2. Operator stores the production validator keys in the approved secret store; no private keys belong in this repository or chat.
3. Operator records a tested rollback command and confirms the maintenance window.
4. An authorized production owner approves the rollout and rollback plan.
5. Every validator verifies the binary SHA-256 before any restart.

No production validator has been restarted or modified by this gate preparation.
