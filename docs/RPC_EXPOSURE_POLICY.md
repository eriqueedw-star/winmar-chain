# Public RPC exposure policy

## Objective

The public RPC at `https://rpc.winmarchain.io` should expose only methods required for ordinary public chain interaction and read-only network verification.

## Publicly expected methods

The repository probe relies on these read-only methods:

- `eth_chainId`
- `eth_blockNumber`
- `eth_getBlockByNumber`

Additional standard Ethereum JSON-RPC methods may be available where required for wallets, applications, explorers, and normal transaction submission.

## Privileged namespaces

Administrative or account-management methods should not be exposed by the unrestricted public RPC.

The external probe checks the following methods without printing their returned payloads:

- `admin_nodeInfo`
- `personal_listAccounts`

A JSON-RPC error is treated as the method being unavailable through the public endpoint. A successful JSON-RPC result is reported only as `exposed=true`; the result body is not written to CI logs or evidence artifacts.

During initial Phase 6 observation these checks are informational. After the public endpoint is confirmed to return both methods as unavailable, the repository may promote the checks to a release gate.

## Operational boundary

Validator-management methods, node administration, account management, key management, and unrestricted debugging interfaces belong on authenticated, allow-listed, local, or otherwise authorized management endpoints.

Do not expose credentials or internal endpoint addresses in repository evidence.

## Review scope

A later independent security review should additionally verify rate limiting, CORS, TLS configuration, request-size limits, batch limits, WebSocket exposure, reverse-proxy controls, denial-of-service protections, and the complete enabled JSON-RPC namespace set.
