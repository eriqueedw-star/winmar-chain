# Audit and verification status

## Current status

**No independent third-party security audit report is recorded in this repository.** Do not claim that Winmar Chain, its bridge, smart contracts, validators, explorer, or website are independently audited until a verifiable report is added here.

The repository is public and includes documented genesis/QBFT publication controls, validator-membership procedures, bootnode policy, bridge trust-model requirements, release controls, supply-chain controls, automated repository checks, external public-network verification, and publication-privacy checks.

These controls improve audit readiness but do not constitute an independent security audit.

## Completed evidence

- Public metadata identifies chain ID `12142816`, RPC `rpc.winmarchain.io`, and explorer `scan.winmarchain.io`.
- Repository CI validates JSON, lints Markdown and shell scripts, and performs full-history Gitleaks scanning.
- CI dependencies are pinned and reviewed through repository supply-chain controls.
- The public-network probe checks website and explorer reachability and verifies `eth_chainId` and `eth_blockNumber` through the public RPC.
- Public-network evidence artifacts are retained by GitHub Actions.
- Release evidence bundles can be generated for `v*` tags.
- The former public recovery-topology JSON is absent from the current public tree.
- Automated logo inspection reports zero `tEXt`, `zTXt`, `iTXt`, and `eXIf` metadata chunks.
- The publication audit reports personal-email-domain history without exposing complete email addresses.
- Chainlist PR #8740 has passed its recorded upstream CI baseline and remains open and mergeable at the latest recorded review.

Automated checks are repository-quality and verification controls, not a security audit. Their execution status must be verified on the relevant commit or pull request.

## Known privacy limitation

The public Git history contains personal-email-domain metadata. The pre-Phase-5 main baseline measured four `gmail.com` occurrences, and Phase 5 confirmed that the current GitHub connector commit identity can add more.

This finding is informational rather than a hard CI failure because the same identity is currently used for repository maintenance.

Recommended remediation is to configure a public or GitHub no-reply commit identity for future commits and, if required, perform a controlled history rewrite. External copies may retain historical objects even after a rewrite.

## Recommended independent audit scope

- Genesis and QBFT parameters.
- Validator key custody, quorum resilience, and membership-change procedure.
- RPC method exposure, rate limits, CORS, TLS, and denial-of-service controls.
- Explorer and website dependency/security scanning.
- Bridge contracts, relayer/operator model, upgrade authority, pause controls, and asset accounting.
- Backup restoration and disaster-recovery exercise.
- Cloud IAM, firewall, SSH, monitoring, and patch-management controls.

## Evidence format

For each completed independent or second-party review, record the auditor, scope, version or commit, dates, findings, remediation status, report hash, and public report URL where permitted.
