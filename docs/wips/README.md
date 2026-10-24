# Winmar Improvement Proposals (WIPs)

Winmar Improvement Proposals (WIPs) are the canonical design process for protocol-level changes to Winmar Chain and its native execution environments.

## Scope

A WIP is required for changes that materially affect consensus, validator behavior, execution, protocol economics, native market infrastructure, interoperability, or public protocol interfaces.

Application-only changes do not require a WIP unless they introduce or depend on a protocol-level behavior.

## Status

- **Draft** - under design; not approved for production.
- **Review** - implementation and security review in progress.
- **Testnet** - approved only for isolated testnet validation.
- **Accepted** - approved for a future protocol release.
- **Final** - deployed and considered part of the protocol.
- **Rejected** - not accepted.
- **Withdrawn** - withdrawn by the authors.
- **Superseded** - replaced by another WIP.

No Draft, Review, or Testnet WIP authorizes a production-chain change.

## Initial WMCore Series

| WIP | Title | Status |
| --- | --- | --- |
| WIP-001 | WMCore Financial Execution Layer | Draft |
| WIP-002 | Native Perpetual Markets | Draft |
| WIP-003 | Outcome and Event Markets | Draft |
| WIP-004 | Permissionless Market Deployment | Draft |

## Design Principles

1. Preserve Winmar Chain QBFT safety and deterministic finality.
2. Keep production EVM/RPC/validator behavior unchanged until separately approved.
3. Use deterministic execution and reproducible state transitions.
4. Separate low-latency trading execution from ordinary EVM transaction UX where appropriate.
5. Commit auditable WMCore state to Winmar Chain.
6. Treat oracle, margin, liquidation, bridge, collateral, and market-maker systems as security-critical.
7. Require testnet stress testing, independent review, and explicit activation criteria before mainnet.
8. Prefer collateral and settlement designs that minimize bridge and wrapped-asset risk.

## WIP Template

Each WIP should contain:

- WIP number and title
- Status
- Type
- Authors
- Created date
- Summary
- Motivation
- Specification
- Security considerations
- Economic considerations
- Backwards compatibility
- Test plan
- Activation criteria
- Rollback/emergency behavior
- Open questions
