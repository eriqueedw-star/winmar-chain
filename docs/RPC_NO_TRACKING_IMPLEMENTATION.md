# Winmar Chain — target privacy classification: no tracking

**Operator-selected target:** `tracking: "none"` for `https://rpc.winmarchain.io` (Chain ID `12142816`).

**This is a target, not a certification of the live service.** The current published ChainList entry is not yet classified as no-tracking. Production edge, reverse-proxy, blockchain node, anti-abuse and monitoring settings have not been fully inspected.

## Meaning of the target

RPC interactions should not be used to build user profiles or correlate client identities, IP addresses, wallet addresses, request bodies and transaction data. Ordinary blockchain data submitted on-chain remains public. Security controls and operational metrics must be documented accurately; for example a protective CDN may process and retain client IPs even if the RPC node itself does not.

Do not claim `none` solely on the basis of ChainList RPC health, valid TLS, a GitHub CI pass, or having disabled Nginx access logs.

## Production action plan (operator-only, no secrets in source control)

1. **Inventory the real request path:** DNS/CDN/WAF, ingress or load balancer, HTTPS reverse proxy, Besu/QBFT RPC node, error tracking, telemetry, rate-limiter, log shipping, snapshots and backup retention. Identify vendor-managed access/security logging.
2. **Proxy settings:** Inspect the *effective* Nginx configuration privately (`sudo nginx -T` may reveal credentials and must not be pasted into chat or CI). Review per-server/location `access_log`, `error_log`, custom `log_format`, `proxy_set_header`, tracing, log forwarding and rotation. If approved, disable request access logs specifically for the public RPC endpoint without breaking availability, incident monitoring or rate limiting. Validate with `sudo nginx -t` before a separately authorized production reload.
3. **CDN and edge:** Inspect Cloudflare/AWS or any actual edge provider's security-event, network-log and analytics retention. Ensure any IP processing or persistence is compatible with a defensible no-user-tracking classification. A cloud proxy's default privacy policy cannot be overridden merely by Nginx settings.
4. **Node and observability:** Inspect enabled RPC HTTP/WebSocket methods, debug/trace log levels, APM, application error reporting and hosted metrics. Avoid persisting identifying request parameters or wallet-to-IP correlation. Keep safe, aggregate, non-identifying operational health metrics as needed.
5. **Abuse controls:** Record how IP-based rate limiting, DDoS and fraud controls actually process identifiers (memory-only, hashed, retained, provider-side, etc.). Document and disclose any exception; privacy category may instead need to be `limited`.
6. **Evidence review:** A named operator privately signs off on all layers, data categories, processing purpose, vendors, access, maximum retention and incidents. Publish only a redacted summary; never leak production logs, client IPs, node secrets or internal topology.
7. **Official publication:** Publish a reviewed privacy policy at a live, official `https://winmarchain.io/` URL and verify HTTP 200. Then update the GitLab [RPC privacy manifest](https://gitlab.com/winmar-chain/winmar-chain-registry/-/blob/main/integrations/rpc-privacy.json) with real evidence, reviewer, date and exact privacy URL.
8. **ChainList submission:** Only after these gates, change the Winmar RPC entry to `tracking: "none"`, with truthful `trackingDetails` linking the official policy, and submit/update the appropriate upstream PR to DefiLlama/chainlist. Verify final public badge after acceptance.

## Verification outcomes

| Check | Current state |
| --- | --- |
| Owner's desired classification | `none` |
| Live server zero-tracking audit | Pending |
| Production logging, proxies, vendor controls | Unverified |
| Live official RPC privacy policy | Pending |
| Evidence approved for public `tracking: none` | No |
| DefiLlama official merge | No |

**Safety:** This file is a runbook, not an executable production change. Existing public RPC, blockchain consensus, validators, wallet balances, and native WMC logo remain untouched.

Reference: [RPC Privacy Audit](RPC_PRIVACY_AUDIT.md) and [provisional transparency disclosure](RPC_PRIVACY_DISCLOSURE.md).
