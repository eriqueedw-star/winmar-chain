# WMTrade External Market-Maker Liquidity Blueprint

Status: Draft — testnet-first

## 1. Operating model

WMTrade is the trading venue and WMCore is the execution, risk, market-registry, oracle-consumer, and settlement layer. Winmar does not act as the primary liquidity provider and the Winmar treasury is not used as an automatic liquidity backstop.

External market makers provide resting quotes and inventory. Traders submit orders against the venue's order book. A market is not opened for public trading until it has an approved market maker and passes the minimum-liquidity gate.

```text
External Market Maker(s)
        │ quotes / inventory / liquidity
        ▼
WMTrade Order Book + Matching Layer
        │ signed trader orders
        ▼
WMCore Execution + Risk Engine
        │ oracle price / margin / liquidation state
        ▼
Positions, fills, PnL and settlement records
```

## 2. Responsibilities

| Component | Responsibility | Must not do |
|---|---|---|
| WMTrade UI | Display markets, book, chart, ticket and account state | Source prices directly from exchanges |
| WMCore API | Authenticate, enforce consent, validate signed actions and expose state | Trust client-provided risk or price data |
| Matching layer | Match compatible orders and publish fills | Create liquidity without an approved source |
| Oracle router | Provide bounded, timestamped reference prices | Serve stale or paused feeds |
| External market maker | Quote bids/asks, manage inventory and meet obligations | Use privileged access to bypass risk controls |
| Winmar treasury | Protocol operations and approved treasury functions | Act as automatic LP/backstop under this model |

## 3. Market activation gate

Every market follows:

```text
PROPOSED → REVIEW → TESTING → LIQUIDITY_READY → ACTIVE
                                      │
                                      └─ fail → PAUSED
```

`LIQUIDITY_READY` requires:

- at least one approved external market maker;
- signed market-maker agreement and operational contact;
- supported quote asset and settlement rules;
- oracle feed configured and fresh;
- minimum bid/ask depth and maximum spread thresholds met;
- cancel/replace and outage procedures tested;
- market maker API key scoped only to quoting actions;
- monitoring and alerting enabled.

## 4. Minimum liquidity policy

The exact values are configured per market risk tier. The initial testnet policy should record, at minimum:

- maximum quoted spread in basis points;
- minimum depth within 10 bps, 25 bps, and 50 bps;
- minimum quote uptime over a rolling window;
- maximum quote age;
- maximum inventory and notional exposure;
- maximum order size accepted from public traders;
- emergency pause threshold when oracle and book diverge.

The policy is a gate, not a promise of execution. WMCore may reject or pause trading when the book, oracle, or risk state is unsafe.

## 5. External market-maker interface

Market makers should use a dedicated authenticated API surface:

```text
POST /api/v1/mm/session
POST /api/v1/mm/quotes
DELETE /api/v1/mm/quotes/:quoteId
GET  /api/v1/mm/inventory
GET  /api/v1/mm/health
```

All quote actions must include:

- market symbol;
- side, price, size, and client order id;
- expiry and cancel-on-disconnect policy;
- market-maker identity and scoped API credential;
- idempotency key;
- server timestamp and signature.

Market-maker credentials must not be able to withdraw funds, change market risk parameters, update oracle feeds, or modify legal-consent records.

## 6. Trader execution path

```text
Connect Wallet
  → gasless wallet signature
  → Terms & Privacy consent
  → signed order.place
  → WMCore validates market, oracle, margin and consent
  → matching layer checks available liquidity
  → fill or rejection
  → account state and audit event
```

Cancel actions require a new signed nonce. If a market is paused, new opening orders are rejected; reduce-only and emergency close policy is decided by WMCore risk configuration.

## 7. Oracle and LP separation

The market maker supplies executable quotes; the oracle supplies an independent reference price. Neither one replaces the other.

- Oracle is used for mark price, margin, liquidation, deviation checks, and market safety.
- External liquidity is used for execution and price discovery.
- WMCore must reject quotes outside configured oracle deviation bounds.
- A stale oracle or insufficient book can pause a market independently.

## 8. Monitoring and fail-safe behavior

Required alerts:

- market maker disconnected;
- quote uptime below threshold;
- spread or depth outside policy;
- oracle stale or deviating from book;
- inventory or notional limit breached;
- repeated cancel/replace failures;
- abnormal fill or liquidation rate.

Fail-safe order:

```text
degrade market → reject new opening orders → allow configured reduce-only exits → pause market → incident review
```

No automatic treasury liquidity is permitted under this blueprint.

## 9. Rollout

### Testnet

1. Deploy the oracle router to the isolated testnet only.
2. Use a simulated market maker adapter with clearly labelled testnet data.
3. Validate quote, cancel, outage, stale-oracle, and pause flows.
4. Test the WMCore consent gate and signed trader actions.
5. Record book-depth and uptime metrics.

### Production readiness

Production requires separate approval for market-data licensing, legal market-maker agreements, custody/settlement responsibilities, operational SLAs, security review, incident response, and monitoring. No mainnet, QBFT, RPC, bridge, or DNS changes are part of this blueprint.

## 10. Decision locked

The selected liquidity model is **external market makers as the primary LP source**. Winmar is the venue and protocol operator, not the default LP.
