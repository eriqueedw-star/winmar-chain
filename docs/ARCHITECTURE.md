# Network architecture

Winmar Chain is an EVM-compatible network operated with Hyperledger Besu and QBFT Proof of Authority consensus.

## Logical components

1. **Validator nodes** participate in QBFT voting and block production.
2. **Public RPC gateway** exposes approved JSON-RPC methods at `rpc.winmarchain.io`.
3. **Explorer stack** indexes and presents chain data at `scan.winmarchain.io`.
4. **Website** publishes project and network information at `winmarchain.io`.
5. **Bridge interface** is published at `bridge.winmarchain.io`; its contracts, trust model, and security assumptions must be documented before production asset transfers are promoted.

## Trust boundary

Validator keys and administrative RPC methods are private. Public endpoints must be separated from validator administration, rate-limited, TLS protected, monitored, and configured with an explicit method allowlist.

## Canonical values

Machine-readable network identity and public endpoints are maintained in `config/network.json`. Genesis data and permissioning files should be added only after being sanitized and cross-checked against production.
