# WIP-002: Native Perpetual Markets

- **Status:** Draft
- **Type:** Markets
- **Depends on:** WIP-001, WIP-005
- **Created:** 2026-10-25
- **Target:** Testnet-first

## Summary

WIP-002 defines perpetual futures markets executed by WMCore and settled/committed through Winmar Chain infrastructure.

The markets are exposed natively through the Winmar Chain API and SDK. No specific trading terminal is required.

Initial reference markets:

- BTC-USD-PERP
- ETH-USD-PERP
- WMC-USD-PERP
- GOLD-USD-PERP

These markets are synthetic derivatives. The underlying BTC, ETH, or gold does not need to be wrapped or bridged to Winmar Chain merely to create a perpetual market.

## Collateral

The preferred initial collateral is a stable-value asset represented on Winmar Chain through an approved canonical/native or audited bridge path.

WMC MAY later be accepted as collateral with a risk haircut. WMC SHOULD NOT be the sole collateral during the initial deployment.

## Orders

The engine SHOULD support:

- market;
- limit;
- post-only;
- reduce-only;
- GTC;
- IOC;
- stop-market;
- stop-limit;
- take-profit.

Advanced order types may be added after deterministic execution is proven.

## Margin

Each market defines:

- maximum leverage;
- initial margin requirement;
- maintenance margin requirement;
- position and open-interest caps;
- concentration limits;
- oracle-deviation limits.

Initial demo leverage SHOULD be limited to 1x, 2x, 3x, and 5x.

## Liquidation

The liquidation system SHOULD prefer partial liquidation where practical and MUST use a manipulation-resistant mark price.

Loss handling order:

```text
Account Margin
   |
Partial / Full Liquidation
   |
Liquidation Penalty
   |
Insurance Fund
   |
ADL (last resort)
```

ADL MUST NOT be treated as normal loss management.

## Funding

Perpetual markets MAY use periodic funding to keep the contract price near the reference index. Funding formulas, caps, intervals, and fallback behavior MUST be explicit and testable.

## Liquidity

A market definition does not create liquidity.

Testnet SHOULD use a virtual market maker based on validated reference prices. Mainnet requires separately approved real collateral and market-maker arrangements.

Professional liquidity providers MUST be able to connect directly through the Winmar Chain API/SDK without a graphical frontend.

## Underlying Asset Treatment

Perpetual markets use reference prices. They do not require a wrapped underlying asset.

A future spot market is different: if a user is to own and withdraw BTC/ETH or another asset representation, an approved native/canonical/bridged asset design is required.

## Safety

A market MUST pause or enter protective mode if:

- oracle data is stale;
- reference sources diverge beyond configured thresholds;
- confidence intervals exceed limits;
- matching/risk services lose deterministic state;
- settlement commitments cannot be produced or verified;
- risk limits are exceeded.
