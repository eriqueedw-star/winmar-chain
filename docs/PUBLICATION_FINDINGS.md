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

The public Git history still contains commit metadata using a common personal-email domain.

Phase 5 measured four historical `gmail.com` occurrences. The approved baseline is recorded in `config/publication-audit-baseline.json`.

CI now enforces a no-regression rule:

- the historical count may decrease;
- new personal-email occurrences must not increase the approved baseline;
- email values are not printed by the audit script.

Complete removal of already published historical commit metadata requires a separately approved history rewrite and force-update procedure. Public clones, forks, caches, and previously fetched objects may retain historical data even after a rewrite.

## Remaining release-readiness items

The following are not privacy blockers for the current public tree, but remain material security or release-readiness items:

- production genesis and QBFT parameters must be independently verified before publication if they are ever added;
- validator membership evidence must be captured through authorized private or local RPC access;
- bridge contracts, authority model, upgrade controls, and trust assumptions must be documented before production-readiness claims;
- no independent third-party security audit report is currently recorded;
- Chainlist PR #8740 remains open and mergeable at the latest recorded review and must be tracked to its actual upstream state.

## Decision record

The repository is public and is protected by ongoing repository-quality, secret-scanning, public-network, and publication-privacy controls.

Do not describe the repository as independently audited solely because these controls pass.
