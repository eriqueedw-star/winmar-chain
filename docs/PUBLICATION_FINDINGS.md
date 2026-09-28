# Public release findings

## Review status

Phase 3 has completed automated repository-quality, full-history secret scanning, and external public-network verification. This document records remaining issues that should block a repository visibility change until explicitly resolved or accepted.

## Verified

- Repository-quality checks pass on the Phase 3 branch.
- Full-history Gitleaks scanning passes.
- The public website and explorer respond successfully from an external GitHub-hosted runner.
- The public RPC returns chain ID `12142816` (`0xB948E0`) and a valid advancing block number.
- The bridge endpoint is reachable, but reachability is not evidence of bridge production readiness or audit status.

## Publication blockers

### Public recovery topology

`ops/static-nodes-recovery.json` contains public enode records and Internet-routable IP addresses.

Before publication, operations must explicitly confirm that every listed enode and IP address is intended to be permanently public. If any entry is recovery-only, retired, sensitive, or not intended for public discovery, remove or replace it before changing repository visibility.

### Git author metadata

Repository history contains personal author-email metadata in Git commits.

Before publication, the repository owner should explicitly decide whether that metadata is acceptable for permanent public exposure. If not, rewrite the affected Git history before publication and configure a suitable public or no-reply commit identity for subsequent commits.

### Binary asset metadata

The root logo file `winmar-chain-logo-framed-v2.png` is a binary asset. Its checksum and branding provenance are documented, but embedded image metadata has not been independently inspected as part of this repository review.

Before publication, inspect the image for EXIF, software, author, path, location, or other embedded metadata and replace it with a sanitized copy if necessary.

## Additional release gates

The following remain separate release requirements:

- production genesis and QBFT parameters must be independently verified before publication if they are added;
- validator membership evidence must be captured through authorized private/local RPC access;
- bridge contracts and trust model must be documented before production-readiness claims;
- Chainlist PR #8740 must be recorded according to its actual upstream status at release time;
- the public repository decision must be made separately from code/documentation merges.

## Decision

The Phase 3 hardening changes may be merged while the repository remains private. Do not change repository visibility until the publication blockers above are resolved or explicitly accepted in a documented review.
