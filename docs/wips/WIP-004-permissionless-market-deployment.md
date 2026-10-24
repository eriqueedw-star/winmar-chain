# WIP-004: Permissionless Market Deployment

- **Status:** Draft
- **Type:** Governance / Markets
- **Depends on:** WIP-001 and applicable market WIPs
- **Created:** 2026-10-25
- **Target:** Future research; not initial mainnet scope

## Summary

WIP-004 defines a future mechanism by which third parties may propose and operate markets using WMCore infrastructure without receiving unrestricted protocol privileges.

"Permissionless" in this WIP means a rules-based path to market creation. It does not mean bypassing risk controls, oracle standards, collateral rules, legal restrictions, or protocol governance.

## Proposed Flow

```text
Market Proposal
      |
Deployer Bond / WMC Stake
      |
Oracle + Asset Definition
      |
Risk Parameters
      |
Automated Validation
      |
Governance / Safety Gate
      |
Test Period
      |
Market Activation
```

## Deployer Requirements

A deployer MAY be required to:

- bond or stake WMC;
- provide approved oracle sources;
- define market metadata and settlement rules;
- comply with open-interest and leverage caps;
- fund or arrange market-making;
- contribute to insurance/risk reserves;
- maintain operational endpoints;
- accept slashing or market shutdown conditions for defined protocol violations.

## Market Isolation

Third-party markets SHOULD have configurable isolation boundaries so failure in one market does not automatically threaten unrelated markets or core collateral.

## Governance

The protocol SHOULD support emergency suspension for oracle failure, insolvency risk, exploit conditions, or material rule violations.

The initial WMCore release MUST NOT depend on WIP-004. Permissionless deployment is a later-stage capability after core markets demonstrate stable operation.
