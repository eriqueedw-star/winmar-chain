# Audit and verification status

## Current status

**No independent third-party security audit report is recorded in this repository.** Do not claim that Winmar Chain, its bridge, smart contracts, validators, explorer, or website are audited until a verifiable report is added here.

## Completed evidence

- Chainlist contribution JSON schema, formatting, lint, and build checks passed for PR #8740.
- Public metadata identifies chain ID `12142816`, RPC `rpc.winmarchain.io`, and explorer `scan.winmarchain.io`.
- The project includes a local validator health script for service, height, peers, sync state, and validator-set checks.

These are configuration and availability checks, not a security audit.

## Recommended audit scope

- Genesis and QBFT parameters.
- Validator key custody, quorum resilience, and membership-change procedure.
- RPC method exposure, rate limits, CORS, TLS, and denial-of-service controls.
- Explorer and website dependency/security scanning.
- Bridge contracts, relayer/operator model, upgrade authority, pause controls, and asset accounting.
- Backup restoration and disaster-recovery exercise.
- Cloud IAM, firewall, SSH, monitoring, and patch-management controls.

## Evidence format

For each completed review, record the auditor, scope, version or commit, dates, findings, remediation status, report hash, and public report URL where permitted.

