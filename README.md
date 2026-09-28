# Winmar Chain

Official technical repository for **Winmar Chain**, an EVM-compatible network using QBFT Proof of Authority.

This repository is the canonical project index for public network information, operational documentation, branding references, audit evidence, and deployment runbooks. Secrets, validator private keys, wallet keys, passwords, and production `.env` files must never be committed.

## Public network

| Item | Value |
|---|---|
| Network name | Winmar Chain |
| Chain ID | `12142816` (`0xB948E0`) |
| Native currency | WMC |
| Consensus | QBFT Proof of Authority |
| Public RPC | `https://rpc.winmarchain.io` |
| Explorer | `https://scan.winmarchain.io` |
| Website | `https://winmarchain.io` |
| Bridge | `https://bridge.winmarchain.io` |

The machine-readable public metadata lives in [`config/network.json`](config/network.json).

## Repository map

- `config/` — canonical public chain metadata.
- `docs/` — architecture, operating procedures, audit status, and project history.
- `ops/` — non-secret operational recovery material.
- `scripts/` — health and maintenance utilities.
- `assets/` — branding guidance and asset provenance.
- `chainlist/` — references for the upstream Chainlist registration.

## Quick health check

On a validator host:

```bash
bash scripts/wmc-remote-health.sh
```

The script checks the Besu service, block height, peer count, sync state, and current QBFT validator set through the local RPC endpoint.

## Security boundary

Only public and sanitized material belongs here. Before every commit, verify that no private key, mnemonic, keystore password, cloud credential, access token, account recovery information, or unrestricted internal endpoint is included. See [`SECURITY.md`](SECURITY.md).

## Audit status

Repository organization and automated checks are not an independent security audit. The current verification status and evidence requirements are recorded in [`docs/AUDIT_STATUS.md`](docs/AUDIT_STATUS.md).

## Intellectual property and attribution

Project authorship and asset provenance are recorded in [`AUTHORS.md`](AUTHORS.md), [`COPYRIGHT.md`](COPYRIGHT.md), and [`assets/README.md`](assets/README.md). Third-party components retain their own licenses.

