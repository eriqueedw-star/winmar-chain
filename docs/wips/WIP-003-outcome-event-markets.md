# WIP-003: Outcome and Event Markets

- **Status:** Draft
- **Type:** Markets
- **Depends on:** WIP-001
- **Created:** 2026-10-25
- **Target:** Research and testnet only

## Summary

WIP-003 defines a future WMCore framework for event/outcome contracts. It is intentionally separate from perpetual markets because event resolution, dispute handling, market legality, and oracle requirements differ materially from price-based derivatives.

## Market Lifecycle

```text
Draft
  -> Approved
  -> Open
  -> Trading Halt
  -> Resolution Pending
  -> Resolved
  -> Settled
```

Every event market MUST define before opening:

- exact outcome set;
- authoritative resolution sources;
- opening and closing timestamps;
- invalid/cancel conditions;
- dispute process;
- settlement rule;
- jurisdiction/access restrictions where required.

## Resolution Oracle

Price feeds alone are insufficient for event markets.

Resolution MUST use explicitly defined authoritative data sources and SHOULD support multiple attestations or a governed dispute window for ambiguous outcomes.

## Separation from Fansverse

Fansverse MAY provide discovery, community, or sports-event UX, but WIP-003 does not authorize real-money sports markets. Any production use requires separate legal, compliance, and jurisdictional approval.

## Security and Integrity

The system MUST address:

- ambiguous event wording;
- source outages;
- event postponement/cancellation;
- conflicting authoritative sources;
- insider information and manipulation risks;
- dispute and emergency settlement.

## Production Gate

No real-value event market may be enabled solely because WIP-003 is implemented. Production activation requires a separate approval covering legal/compliance, market surveillance, oracle governance, and user-access controls.
