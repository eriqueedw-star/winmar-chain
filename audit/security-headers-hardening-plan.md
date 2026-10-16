# Public application security headers: hardening and rollout plan

## Baseline

Evidence: [Bridge readiness run 38890398364](https://github.com/eriqueedw-star/winmar-chain/actions/runs/38890398364), 2026-10-16. All three HTTPS endpoints returned HTTP 200. Header observations:

| Header | bridge.winmarchain.io | winmarchain.io | scan.winmarchain.io |
| --- | --- | --- | --- |
| Strict-Transport-Security | Missing | Missing | Missing |
| Content-Security-Policy | Missing | Missing | Missing |
| X-Content-Type-Options: nosniff | Present | Present | Present |
| Referrer-Policy | Present | Present | Present |
| Frame protection | Present | Missing | Present |

Missing headers are hardening findings, not proof of exploitation. The baseline is a point-in-time public HTTP observation.

## Ownership and deployment prerequisite

Identify the **actual production hosting/CDN/reverse proxy** for each hostname before implementing changes. This repository does not currently establish that it owns the live HTTP response-header configuration for all three hosts. Do not assume adding a static headers file here changes production.

## Recommended rollout

1. Capture current response headers and final redirects for each hostname, including `/app` routes if used.
2. Inventory wallet providers, injected wallet scripts, WalletConnect endpoints, RPC hosts, explorer APIs, analytics, fonts, images, websockets, and cross-origin requests actually used by each application.
3. Build a **per-host** Content Security Policy; do not copy a single generic policy across bridge, website and explorer.
4. Start with `Content-Security-Policy-Report-Only` and a controlled reporting endpoint. Inspect violation reports and browser developer tools during wallet connect, account switching, chain switching, quote, and testnet bridge flows.
5. Once legitimate flows are covered, enforce CSP with explicit `script-src`, `connect-src`, `frame-src`, `img-src`, `style-src`, `font-src` and `object-src 'none'`. Avoid blanket `unsafe-inline` or `unsafe-eval` without an explicit compatibility review.
6. Enable `Strict-Transport-Security: max-age=300` on HTTPS **only after** verifying HTTPS behavior and redirect correctness. Increase to `max-age=31536000` after monitoring. Do not enable `includeSubDomains` or preload without a complete subdomain inventory and HTTPS readiness.
7. For the website, prefer `Content-Security-Policy: frame-ancestors 'self'` or `'none'` based on embedding requirements, with `X-Frame-Options: SAMEORIGIN` as appropriate for older browsers. Ensure wallet or third-party embedding requirements are evaluated.
8. Re-run the public header evidence workflow and complete browser regression tests on desktop and mobile. Roll back header changes if critical wallet or bridge flows break.

## Acceptance criteria

- All three hostnames deliver HSTS with an approved, staged max-age.
- All three hostnames deliver an enforced, app-specific CSP after a successful report-only period.
- Website delivers an approved frame-ancestors policy or X-Frame-Options header.
- Existing nosniff and Referrer-Policy headers remain intact.
- Desktop/mobile wallet connection, chain switching, bridge quote, and safe testnet flows are regression-tested.
- Security headers are served by the **live** production host, not merely committed to this repository.

## Safety boundaries

No live bridge transfer, private-key operation, contract upgrade, or proxy/CDN configuration change is authorized by this plan. Header presence alone does not validate smart contracts, custody, relayer security, or bridge safety.
