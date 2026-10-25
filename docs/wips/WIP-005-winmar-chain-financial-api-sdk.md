# WIP-005: Winmar Chain Financial API and SDK

- **Status:** Draft
- **Type:** Interface / Core
- **Depends on:** WIP-001
- **Created:** 2026-10-25
- **Target:** Prototype and Winmar testnet
- **Production activation:** Not authorized by this WIP

## Summary

WIP-005 defines the canonical developer interfaces for WMCore and Winmar Chain financial services:

1. **Winmar Chain Financial API** - versioned REST and WebSocket interfaces.
2. **Winmar Chain SDK** - reference client libraries for signing, trading, account state, market data, and settlement verification.

These interfaces are application-neutral. NEXSUS is not a dependency.

## Architecture

```text
+----------------------- Client Ecosystem -----------------------+
| Wallet | Web App | Mobile | MM Bot | Institution | Exchange   |
+-------------------------------+--------------------------------+
                                |
                        Winmar Chain SDK
                                |
                +---------------+---------------+
                |                               |
          Public Market API              Signed Trading API
          REST / WebSocket               REST / WebSocket
                |                               |
                +---------------+---------------+
                                |
                         API Gateway
                 auth / limits / sequencing
                                |
                             WMCore
              matching / risk / margin / clearing
                                |
                  Commitment + Settlement
                                |
                         Winmar Chain
                         QBFT + EVM
```

## API Principles

The API MUST:

- be versioned;
- use deterministic request and response schemas;
- support idempotency where applicable;
- expose explicit server and market timestamps;
- distinguish public market data from authenticated account data;
- provide WebSocket sequence numbers and recovery/snapshot procedures;
- document rate limits and error codes;
- never request or store a user's raw private key.

## Authentication and Signing

Trading actions SHOULD be authorized by client-side signatures.

The signed domain MUST bind the action to Winmar infrastructure and prevent cross-chain or cross-environment replay.

A signed action SHOULD include:

```text
protocol
version
network / chain domain
account
action type
payload hash
nonce or sequence
created-at
expiry
```

The exact typed-data format requires test vectors and security review before production.

API keys MAY be supported for institutional automation, but API keys MUST NOT silently grant withdrawal authority. Permissions SHOULD be scoped by capability.

## REST Surface

Proposed public endpoints:

```text
GET /v1/status
GET /v1/markets
GET /v1/markets/{symbol}
GET /v1/orderbook/{symbol}
GET /v1/trades/{symbol}
GET /v1/oracle/{symbol}
GET /v1/commitments
GET /v1/commitments/{id}
```

Proposed authenticated endpoints:

```text
POST   /v1/orders
DELETE /v1/orders/{id}
DELETE /v1/orders
GET    /v1/orders
GET    /v1/fills
GET    /v1/positions
GET    /v1/account
GET    /v1/funding
POST   /v1/withdrawals
```

Withdrawal design requires additional settlement and security specification before activation.

## WebSocket Surface

```text
market.ticker
market.orderbook
market.trades
market.oracle
account.orders
account.fills
account.positions
account.margin
system.commitments
```

Order-book streams MUST define snapshot + delta semantics and monotonic sequence handling so clients can detect gaps.

## SDK

The first reference SDK SHOULD prioritize TypeScript because it can serve browser, Node.js, wallet, and trading-terminal integrations.

A Python SDK SHOULD follow for market makers, quantitative systems, and institutional automation.

Go MAY follow for infrastructure and low-latency services.

Suggested package model:

```text
@winmarchain/sdk
  client
  marketData
  trading
  account
  wallet
  signing
  websocket
  settlement
  types
```

Python reference:

```text
winmarchain
  Client
  MarketData
  Trading
  Account
  Signing
  WebSocket
  Settlement
```

## SDK Responsibilities

The SDK SHOULD provide:

- network configuration;
- wallet/account binding;
- typed action construction;
- local signing;
- nonce/sequence management;
- order placement/cancellation;
- market and account queries;
- resilient WebSocket subscriptions;
- order-book reconstruction;
- commitment/state verification helpers;
- normalized error handling;
- retry guidance that avoids duplicate orders.

The SDK MUST NOT hide critical risk fields such as leverage, margin mode, reduce-only, slippage controls, or order expiry.

## Environments

The API/SDK MUST distinguish environments explicitly:

```text
local
devnet
testnet
mainnet
```

A client configured for testnet MUST NOT silently fall back to mainnet.

Endpoint hostnames are intentionally not standardized in this Draft. DNS and production endpoint activation require a separate operational approval.

## Market Maker Interface

Professional market makers require:

- low-latency order entry;
- bulk place/cancel operations;
- deterministic client order IDs;
- order/fill private streams;
- public L2 order-book streams;
- heartbeat/status;
- rate-limit telemetry;
- kill switch / cancel-all;
- session and sequence recovery.

The testnet benchmark MUST measure sustained order/cancel throughput, p50/p95/p99 acknowledgement latency, WebSocket fanout, and recovery after disconnect.

## Security

Required tests include:

- signature forgery and replay;
- nonce reuse;
- expired action rejection;
- wrong-network/domain rejection;
- malformed payloads;
- WebSocket gap/reorder recovery;
- duplicate HTTP retry behavior;
- API-key scope enforcement;
- withdrawal permission isolation;
- rate-limit bypass attempts;
- dependency/supply-chain review for published SDK packages.

## Compatibility

API versions MUST use an explicit deprecation policy.

Breaking changes require a new API version or a documented migration path. SDK releases SHOULD declare the API versions they support.

## Testnet Acceptance Criteria

1. TypeScript reference SDK can connect without an application-specific backend.
2. SDK can query markets and reconstruct an order book from snapshot + deltas.
3. A test account can sign, place, cancel, and query orders.
4. Private WebSocket streams report orders, fills, positions, and margin state.
5. Replay, expired, and wrong-network signatures are rejected.
6. Market-maker cancel-all works during a simulated volatility event.
7. SDK can query and verify WMCore commitment metadata.
8. API/SDK integration tests run in CI.
9. No production endpoint or mainnet behavior is modified by acceptance of this Draft.
