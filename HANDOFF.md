# Winmar Chain project handoff

## Objective

Maintain one canonical, auditable project for Winmar Chain public network information, operations documentation, branding provenance, Chainlist registration, and future source code.

## Current public network

- Network: Winmar Chain
- Chain ID: `12142816` (`0xB948E0`)
- Currency: WMC, 18 decimals
- Consensus: QBFT Proof of Authority
- Website: `https://winmarchain.io`
- RPC: `https://rpc.winmarchain.io`
- Explorer: `https://scan.winmarchain.io`
- Bridge: `https://bridge.winmarchain.io`

## Current repository

- GitHub: `https://github.com/eriqueedw-star/winmar-chain`
- Visibility: private while documentation and security review are completed
- Default branch: `main`
- Initial baseline commit: `50ab0cf`

## Chainlist status

- Upstream PR: `https://github.com/ethereum-lists/chains/pull/8740`
- Contributor fork: `eriqueedw-star/chains`, branch `patch-1`
- Chain JSON, RPC, explorer, name, and IPFS icon metadata have been submitted.
- All four current upstream checks passed after the icon update.
- IPFS logo CID: `bafkreidusntleelv3wx2pswfo5gc4hwis44ig4ume4l6jftu74pysp2lem`
- The PR still requires upstream maintainer review and merge before propagation is complete.

## Included material

- Canonical public metadata in `config/network.json`.
- Architecture, operations, project history, and audit-status documentation.
- Security, contribution, copyright, authorship, and asset-provenance policies.
- Existing public static-node recovery list.
- Existing validator health-check script.
- Current repository logo asset and its checksum record.

## Security state

- No production `.env`, wallet key, validator private key, mnemonic, SSH private key, password, or cloud credential is intentionally included.
- `.gitignore` blocks common secret and generated-file patterns.
- The repository has not yet undergone an independent third-party security audit.
- Do not change the repository to public until the operational files and Git history receive a second secret/privacy review.

## Recommended next steps

1. Add sanitized genesis, QBFT configuration, bootnode policy, and validator membership/change procedure.
2. Add the actual website/explorer source or link them as separate repositories with pinned versions.
3. Define bridge contracts and trust model before representing the bridge as production-ready.
4. Add automated JSON, Markdown, secret-scanning, and shell lint checks through GitHub Actions.
5. Create a signed release and immutable checksum manifest for the first public baseline.
6. Perform a second security review, then decide whether to make the repository public.
7. Monitor Chainlist PR #8740 until merged and verify the logo and endpoints after cache propagation.

## Instructions for a new chat

Treat this repository and `HANDOFF.md` as the current canonical project record. Do not request or store private keys, passwords, seed phrases, or unrestricted cloud credentials. Verify live infrastructure state before making claims because validator membership, endpoint health, DNS, and upstream PR status can change.

