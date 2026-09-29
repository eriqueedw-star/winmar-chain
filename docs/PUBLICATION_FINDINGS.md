# Public repository findings

## Current state

The Winmar Chain repository is public. This document records the current privacy, publication, and release-readiness findings for the public repository.

Public visibility does not mean that Winmar Chain, its bridge, validators, smart contracts, explorer, or website have received an independent third-party security audit.

## Verified controls

- Repository-quality checks and full-history Gitleaks scanning are enforced by GitHub Actions.
- The public-network workflow verifies website and explorer reachability and checks `eth_chainId` and `eth_blockNumber` through the public RPC.
- The canonical public chain ID remains `12142816` (`0xB948E0`).
- The former recovery-topology file `ops/static-nodes-recovery.json` is absent from the current public tree.
- The repository-root logo is a valid PNG.
- Automated PNG inspection found zero `tEXt`, `zTXt`, `iTXt`, or `eXIf` metadata chunks in the current logo.
- `scripts/audit-publication.py` now runs in repository CI.

## Historical privacy debt

The public Git history contains commit metadata using a common personal-email domain.

The pre-Phase-5 main baseline measured four `gmail.com` occurrences. During Phase 5, GitHub connector-generated commits demonstrated that the current commit identity can add further personal-email metadata.

For that reason, personal-email history is reported by the publication audit as an informational finding rather than a hard CI failure. The audit never prints complete email addresses.

Recommended remediation:

- configure a public or GitHub no-reply commit identity for future maintenance;
- perform a separately approved history rewrite if canonical-history cleanup is required;
- coordinate any force-update carefully because public clones, forks, caches, and previously fetched objects may retain historical data.

## Remaining release-readiness items

The following are not privacy blockers for the current public tree, but remain material security or release-readiness items:

- production genesis and QBFT parameters must be independently verified before publication if they are ever added;
- validator membership evidence must be captured through authorized private or local RPC access;
- bridge contracts, authority model, upgrade controls, and trust assumptions must be documented before production-readiness claims;
- no independent third-party security audit report is currently recorded;
- Chainlist PR #8740 remains open and mergeable at the latest recorded review and must be tracked to its actual upstream state.

## Decision record

The repository is public and is protected by ongoing repository-quality, secret-scanning, public-network, and publication-privacy controls.

The historical commit-email metadata remains a documented privacy debt. Do not describe the repository as independently audited solely because automated controls pass.
