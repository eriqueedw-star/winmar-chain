# Winmar Chain — Public RPC Privacy Transparency Notice

**Status:** Technical disclosure under review. **No no-tracking, limited-tracking, or retention-duration certification has been completed.**
**Date:** 2026-10-23
**Public endpoint:** https://rpc.winmarchain.io
**Network:** Winmar Chain, Chain ID 12142816, native currency Winmar Coin (WMC).

## What this notice covers

This notice is about using the publicly accessible Winmar Chain HTTPS JSON-RPC endpoint. It is **not** a representation that blockchain transactions are private, anonymous, or impossible to trace, and is not a statement about unrelated websites or wallets.

## Information potentially visible to the RPC operator or its service providers

Depending on actual edge, reverse-proxy, node and monitoring configuration, operating an HTTPS JSON-RPC endpoint may expose the following to the infrastructure processing the request:

- **Network/request metadata:** source IP address, timestamp, HTTP method and headers, origin/referer or user agent if sent, response status, request size and latency.
- **JSON-RPC data:** method names, parameters and read requests; wallet/public addresses or transaction hashes included in the query, when sent.
- **Transactions:** submitted signed transaction bytes through `eth_sendRawTransaction`. Successfully included transactions and their public metadata are permanently observable on the blockchain; a failed or pending submission may be handled differently.

**Neither the presence nor the absence of logs for these fields has yet been established from the publicly accessible infrastructure evidence.** The operator must inspect the actual production edge, proxy, client request handling, node and monitoring settings before publishing a precise data-collection or retention claim.

## Claims we do *not* make pending audit

We do not currently claim any of the following for this endpoint:

- that no IP address, wallet address, RPC method or request body is processed or logged;
- that rate limiting, DDoS/WAF, load balancer or CDN services never collect request data;
- that logs are retained for a specific duration, or that any log-deletion schedule is in force;
- that there is no upstream processing or data sharing;
- that calls or on-chain transactions are private;
- that this endpoint qualifies for ChainList `tracking: "none"` or `tracking: "limited"`.

No such status should be submitted without reviewed, timestamped evidence. Users seeking strong network-layer privacy should review the policies of the RPC provider and network providers they choose; HTTPS protects traffic in transit but not from the receiving endpoint and its configured intermediaries.

## Next verification steps and change control

See [the RPC privacy audit checklist](RPC_PRIVACY_AUDIT.md). The operator must verify, for production:

1. CDN/DNS/WAF configuration (if applicable), request analytics, challenge events, security/audit retention and vendors.
2. Reverse proxy, load balancer and node logs, plus retention and access controls.
3. Error tracing, monitoring, method logging, rate-limit counters and third-party telemetry.
4. Whether IP addresses are associated with wallet addresses or RPC parameters, and the lifecycle of any such records.
5. A named responsible owner, privacy contact, effective date and review approval.

When evidence is complete, replace this provisional notice with a reviewed RPC Privacy Policy, publish it on an official HTTPS endpoint, and set ChainList `tracking` accurately with the supporting URL and details. Update the notice if operation or vendors change.

## Contact

Network operations website: https://winmarchain.io

Project contact: admin@winmarchain.io

**Version:** 0.1 — provisional transparency statement, not a verified zero-log policy or legal certification.
