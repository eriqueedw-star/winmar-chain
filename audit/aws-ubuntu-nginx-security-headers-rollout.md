# AWS Ubuntu Nginx security headers — staged deployment

## Context and limitations

The infrastructure operator reports **AWS + Ubuntu + Nginx**. This is operator-provided information, **not** independently verified access to production EC2, load balancers, TLS termination, or active Nginx configuration.

The live audit found missing HSTS and enforced CSP on the website, bridge and explorer, and missing frame protection on the website. This PR supplies **reviewable examples and deployment steps only**; merging it does not change live response headers.

## Before touching production

1. Confirm each hostname's traffic reaches the intended Ubuntu Nginx server. If TLS terminates at AWS ALB/CloudFront, headers may need to be applied at a different layer.
2. Back up each active server block and record the rollback command. Check existing `add_header` inheritance in `http`, `server`, and `location` blocks: adding a directive at a lower level can suppress inherited headers.
3. Inventory wallet injection, WalletConnect, RPC, websocket, bridge quote, explorer API, third-party scripts and embedded frames **per application**.
4. Install the shared example from `infra/nginx/examples/security-headers-common.conf` only in the correct **HTTPS** server block after review. Use the website-only frame-protection example for `winmarchain.io` after confirming embedding requirements.
5. Run `sudo nginx -t` and do not reload if validation fails. Use `sudo systemctl reload nginx` only after approval and successful syntax check.
6. Verify live headers from outside the server and test desktop/mobile wallet connect, network switching, RPC, quote, and testnet bridge flows.
7. Start HSTS with `max-age=300`; extend gradually after confirming HTTPS reliability. Never add `includeSubDomains` or `preload` without an inventory.
8. Use **CSP Report-Only** for learning, then create separate, application-specific **enforced** policies based on observed legitimate dependencies. The example does not enforce CSP.
9. Roll back by restoring the backed-up server block and validating with `sudo nginx -t` before reloading.

## Sample commands (operator-run, after approval)

```bash
sudo nginx -T > nginx-before-headers.txt
sudo nginx -t
sudo systemctl reload nginx
curl -sSI https://winmarchain.io/
curl -sSI https://bridge.winmarchain.io/
curl -sSI https://scan.winmarchain.io/
```

**Security warning:** `nginx -T` output can contain private paths, upstream addresses, authentication directives, or secrets. Store backups privately; never commit or post unredacted output to a public PR.

## Important Nginx caveats

- `add_header` inheritance is non-additive on many deployed Nginx versions. Preserve all existing headers and check location-specific behavior.
- A `Content-Security-Policy-Report-Only` header is observational, not enforcement; `frame-ancestors` in Report-Only does not prevent framing.
- Some upstreams or load balancers may already set headers; avoid conflicting or duplicate directives.
- A header check alone cannot prove bridge smart-contract or wallet security.

## Acceptance criteria

- Verified operator ownership and TLS termination point for all three hostnames.
- Live HSTS enabled after staged rollout, with no HTTPS regressions.
- Website frame protection enabled after embedding compatibility review.
- Per-app CSP report-only violations reviewed; enforced CSP planned separately.
- Browser and wallet regression evidence recorded; rollback tested.
