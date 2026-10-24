# WIP-001: WMCore Financial Execution Layer

- **Status:** Draft
- **Type:** Core
- **Created:** 2026-10-25
- **Target:** Isolated prototype and Winmar testnet only
- **Production activation:** Not authorized by this WIP

## Summary

WIP-001 proposes **WMCore**, a deterministic financial execution environment for Winmar Chain. WMCore is intended to support low-latency market execution while preserving Winmar Chain as the canonical security, settlement, and finality layer.

WMCore is a native Winmar Chain service. It MUST NOT depend on NEXSUS or any other application-specific frontend.

The target architecture is:

```text
Wallets / Trading Apps / Market Makers / Institutions / NEXSUS / Third Parties
                              |
                    Winmar Chain SDK
                              |
                    Winmar Chain API
                   REST + WebSocket
                              |
                           WMCore
                              |
              +---------------+---------------+
              |               |               |
           Matching          Risk          Clearing
        Orders / Fills   Margin / Liq.   Positions / PnL
              |               |               |
              +---------------+---------------+
                              |
                 Oracle / Index / Mark Price
                              |
                State Commitment / Settlement
                              |
                       Winmar Chain
                       QBFT PoA + EVM
```

## Motivation

A professional order-book market requires frequent place/cancel/replace operations, deterministic matching, margin checks, liquidation, and real-time market data. Requiring every order operation to be a normal EVM transaction would create unnecessary latency and gas overhead.

WMCore therefore separates the trading state machine from ordinary smart-contract execution while anchoring auditable state and settlement to Winmar Chain.

A protocol-native API and SDK prevent WMCore from becoming coupled to one user interface. The same execution layer can serve first-party and third-party applications through stable, versioned interfaces.

## Execution Model

WMCore MUST be deterministic: identical ordered inputs and protocol parameters MUST produce identical state transitions and state roots.

Core state includes:

- accounts and collateral balances;
- open orders;
- fills and trade history;
- positions and average entry prices;
- realized and unrealized PnL;
- initial and maintenance margin;
- funding state;
- liquidation state;
- insurance-fund accounting;
- market configuration;
- oracle/index/mark-price observations used by the engine.

## Consensus and Settlement

WIP-001 does not modify QBFT.

Initial implementation MUST run as an isolated sidecar/prototype. Integration into validator software or consensus requires a later reviewed WIP and explicit activation plan.

WMCore SHOULD periodically produce a commitment containing at minimum:

```text
epoch
sequence range
previous state root
new state root
market-data/oracle commitment
timestamp
protocol version
```

A Winmar EVM settlement contract MAY record commitments during testnet validation.

## Native API and SDK

The canonical application interface is defined by WIP-005.

At minimum, Winmar Chain MUST expose versioned financial APIs for:

```text
Public REST
/v1/markets
/v1/market/{symbol}
/v1/orderbook/{symbol}
/v1/trades/{symbol}
/v1/oracle/{symbol}
/v1/commitments

Authenticated REST
/v1/order
/v1/orders
/v1/positions
/v1/account
/v1/history
/v1/withdrawals

WebSocket
/ws/ticker
/ws/orderbook
/ws/trades
/ws/account
/ws/orders
/ws/oracle
/ws/commitments
```

Applications SHOULD integrate through the Winmar Chain SDK where practical. Direct API access MUST remain available for professional market makers and institutional integrations.

The API MUST NOT require custody of user private keys. Signed trading actions MUST include anti-replay fields such as chain/network domain, account, nonce or sequence, and expiry.

## Oracle Model

WMCore MUST distinguish:

- **Last Price** - latest matched trade;
- **Oracle Price** - signed external reference;
- **Index Price** - validated composite reference;
- **Mark Price** - manipulation-resistant risk and liquidation reference.

Liquidation MUST NOT depend solely on Last Price.

Production design SHOULD support multiple independent data sources, outlier rejection, stale-price detection, confidence bounds, and circuit breakers.

## Gas Model

Order placement, cancellation, matching, and internal position updates SHOULD NOT require an individual EVM transaction from the trader.

Winmar gas remains applicable to blockchain operations such as:

- collateral deposit/withdrawal;
- settlement/state commitments;
- oracle verification when performed on-chain;
- staking/governance;
- bridge and vault interactions.

Actual gas budgets MUST be measured on Winmar testnet. Any numerical gas values used in architecture documents before benchmarking are illustrative only.

## Security

Before any real-value deployment, WMCore requires:

- deterministic replay tests;
- margin and liquidation invariant tests;
- oracle-failure and manipulation tests;
- mass-liquidation stress tests;
- validator/RPC failure simulation;
- state-commitment verification;
- API authentication/signature replay tests;
- SDK signing test vectors;
- key-management review;
- rate limiting and DDoS controls;
- emergency market pause controls;
- independent security review.

## Backwards Compatibility

WIP-001 is designed to be additive. The prototype MUST NOT change existing production RPC behavior, chain ID, QBFT parameters, validator membership, bridge behavior, or deployed application contracts.

## Initial Testnet Acceptance Criteria

1. Deterministic replay produces identical state roots.
2. BTC, ETH, WMC, and GOLD demo markets can execute against test collateral.
3. Margin and liquidation invariants pass automated tests.
4. Oracle stale/deviation circuit breakers operate correctly.
5. Settlement commitments can be verified on Winmar testnet.
6. Winmar Chain API and reference SDK can place, cancel, query, and stream test orders without an application-specific backend.
7. Signed actions reject replay, invalid domain/network, expired requests, and invalid sequence numbers.
8. Existing Winmar Chain CI remains green.
9. No production-chain configuration is modified.
