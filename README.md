# Winmar Chain

Official technical repository for **Winmar Chain**, an EVM-compatible network using QBFT Proof of Authority.

This public repository is the canonical project index for public network information, operational documentation, branding references, audit evidence, and deployment runbooks. Secrets, validator private keys, wallet keys, passwords, and production `.env` files must never be committed.

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
- `scripts/` — health, verification, and release utilities.
- `assets/` — branding guidance and asset provenance.
- `chainlist/` — references for the upstream Chainlist registration.
- `checksums/` — immutable checksum manifests for release artifacts.

## Operational hardening

The repository includes explicit controls for material that is not yet safe to infer or publish:

- [Genesis and QBFT baseline](docs/GENESIS_QBFT_BASELINE.md)
- [Network identity evidence](docs/NETWORK_IDENTITY_EVIDENCE.md)
- [Public RPC exposure policy](docs/RPC_EXPOSURE_POLICY.md)
- [Validator membership procedure](docs/VALIDATOR_MEMBERSHIP.md)
- [Bootnode and peer-discovery policy](docs/BOOTNODE_POLICY.md)
- [Bridge trust model and production gate](docs/BRIDGE_TRUST_MODEL.md)
- [Privacy/publication review](docs/PRIVACY_REVIEW.md)
- [Current publication findings](docs/PUBLICATION_FINDINGS.md)
- [Release process](docs/RELEASE_PROCESS.md)
- [Release checklist](RELEASE_CHECKLIST.md)

Unverified production consensus parameters must not be invented or copied into the repository.

## Verification

`scripts/public-network-probe.sh` verifies public website and explorer reachability, checks `eth_chainId` and `eth_blockNumber`, records the genesis block hash as a network fingerprint, and checks selected privileged JSON-RPC methods without printing their payloads. The GitHub Actions public-network workflow runs this check from an external GitHub-hosted runner, retains evidence artifacts, and also runs on a daily schedule.

The genesis block hash is an identity fingerprint only. It is not a substitute for verifying the production genesis file or QBFT parameters.

`scripts/audit-publication.py` checks the public tree for recovery-topology exposure, audits the logo for PNG text/EXIF metadata chunks, and reports personal-email domains present in Git history without printing complete addresses.

On a validator host:

```bash
bash scripts/wmc-remote-health.sh
```

The script checks the Besu service, block height, peer count, sync state, and current QBFT validator set through the local RPC endpoint.

## Security boundary

Only public and sanitized material belongs here. Before every commit, verify that no private key, mnemonic, keystore password, cloud credential, access token, account recovery information, or unrestricted internal endpoint is included. Historical personal-email commit metadata remains a documented privacy finding; use a public or GitHub no-reply commit identity for future maintenance where possible. See [`SECURITY.md`](SECURITY.md).

## Audit status

Repository organization and automated checks are not an independent security audit. The current verification status and evidence requirements are recorded in [`docs/AUDIT_STATUS.md`](docs/AUDIT_STATUS.md).

## Intellectual property and attribution

Project authorship and asset provenance are recorded in [`AUTHORS.md`](AUTHORS.md), [`COPYRIGHT.md`](COPYRIGHT.md), and [`assets/README.md`](assets/README.md). Third-party components retain their own licenses.
