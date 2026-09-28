# Bridge trust model and production gate

## Current status

`https://bridge.winmarchain.io` is a published interface endpoint. Its existence does not by itself establish that asset transfers are production-ready, independently audited, trust-minimized, or covered by any guarantee.

Until the items below are verified and recorded, public documentation should describe the bridge as an interface under technical and security validation rather than as an audited production bridge.

## Required trust-model record

Before production promotion, document:

- source and destination chains;
- canonical token mappings and contract addresses;
- lock/mint, burn/release, liquidity, or other transfer mechanism;
- relayer, validator, oracle, or message-verification model;
- custody model and any assets held by contracts or operators;
- administrator, upgrader, pauser, and emergency authorities;
- multisig threshold and signer-governance policy, if applicable;
- upgradeability mechanism and implementation ownership;
- rate limits, transfer limits, and circuit breakers;
- replay protection and finality assumptions;
- monitoring and reconciliation controls;
- incident response and recovery process;
- external audit scope, report hash, version, and remediation status.

## Production release gate

The bridge should not be represented as production-ready until:

1. deployed contract addresses are independently verified;
2. source code corresponding to deployed bytecode is available for review where permitted;
3. privileged roles and upgrade controls are documented;
4. asset accounting and failure modes are tested;
5. monitoring and emergency pause procedures are exercised;
6. material findings from security review are remediated or formally accepted;
7. user-facing risk disclosures match the implemented trust model.

## Change control

Any contract upgrade, signer-set change, relayer change, token mapping change, custody change, or pause-control change requires peer review, rollback or recovery planning, and an auditable record.
