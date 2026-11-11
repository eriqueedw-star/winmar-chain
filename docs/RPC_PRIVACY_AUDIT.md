# Winmar Chain production RPC privacy audit — operator checklist

**Scope:** Public RPC `https://rpc.winmarchain.io` and its actual production upstream dependencies.
**Last prepared:** 2026-10-23.
**Current outcome:** NOT VERIFIED. CI uptime and chain-ID checks are not privacy audits.

This document defines an **evidence-gated** process. Do not copy production logs, private IPs, API keys, request bodies, private keys, or customer information into public GitHub/GitLab, chat, or CI output. Review sensitive details in an approved private environment and publish only redacted findings and a signed operator decision.

## Required evidence matrix

| Layer | Verify privately | Publish a safe outcome |
| --- | --- | --- |
| CDN/WAF/DDoS (if any) | IP processing, security events, analytics, request logging, jurisdiction, retention and provider terms | Logging present/absent; vendor and maximum reviewed retention |
| Load balancer, ingress | ALB/NLB/edge access logs, reverse-proxy logging policy, TLS termination | IP/request metadata retention class |
| Reverse proxy | Nginx `access_log`, `error_log`, Caddy/Traefik logs, log forwarding, logrotate | Logging scope and retention |
| Blockchain JSON-RPC node | Besu/Geth/Nethermind log level, API method/error traces, metrics exporters and debug namespaces | Are request methods/parameters persisted? |
| Rate limiting | Per-IP in-memory or stored counters, TTL, DDoS platform challenge events | Data stored and TTL |
| Monitoring | Hosted observability, APM agents, alerting and analytics, sampling and correlation IDs | Data fields and vendors |
| Operations | Backups, archives, incident holds, authorized access and deletion | Maximum normal retention and exceptions |
| Linking | Whether IPs are stored alongside wallet addresses/tx hashes/RPC params | Yes / No / Unverified |

## Classification rules for ChainList

- `tracking: "none"`: **only after** verifying a no-user-tracking/no-identifying-data logging commitment across production layers and documenting narrow ephemeral operations, if any. Zero-log statements require exceptional evidence.
- `tracking: "limited"`: only after proving the actual scope of limited logging and retention (e.g. documented short-lived IPs for rate limiting), and accurately disclosing what is collected, why and how long.
- `tracking: "yes"`: use when actual tracking practices justify that classification.
- **Unknown / unverifiable**: leave `tracking` unset and publish this provisional notice. Do not fabricate a green badge.

## Operator-only verification steps

1. On the proxy host, **privately** inspect the effective reverse-proxy configuration. Nginx examples: `nginx -T` (may expose secrets — do not paste output), then review `access_log`, `error_log`, `log_format`, and `proxy_set_header`. For other stacks, inspect equivalent logging and forwarding config.
2. In cloud consoles, review the actual production CDN/WAF, load balancer, access-log buckets, monitoring collectors and retention policies.
3. On the RPC node/containers, inspect application log settings, instrumentation and rate-limit storage; distinguish optional loggers from those currently active.
4. Ask the responsible network operator to sign off on a minimal, **redacted** evidence record. Record system layer, observed practice, retention maximum, provider and approval date. Do not publish sensitive values.
5. Publish an approved HTTPS privacy policy at the official domain and check it returns HTTP 200; update ChainList through a narrowly scoped PR containing the reviewed `tracking` and `trackingDetails`.

## Evidence record template (fill after private inspection)

- Review date / owner: **pending**
- Edge or CDN processing: **unverified**
- Load-balancer logging: **unverified**
- Reverse-proxy access logging: **unverified**
- Blockchain node request logging: **unverified**
- Rate-limit storage and TTL: **unverified**
- Monitoring/vendor processing: **unverified**
- IP ↔ wallet/tx correlation: **unverified**
- Retention and erasure schedule: **unverified**
- ChainList category: **unassigned**

**Gate:** This record must be completed and approved before marking `none` / `limited` or claiming no user tracking.

References:

- Provisional RPC disclosure: [RPC_PRIVACY_DISCLOSURE.md](RPC_PRIVACY_DISCLOSURE.md)
- Existing public-RPC exposure policy: [RPC_EXPOSURE_POLICY.md](RPC_EXPOSURE_POLICY.md)
- DefiLlama ChainList source: https://github.com/DefiLlama/chainlist/blob/main/components/RPCList/index.js
