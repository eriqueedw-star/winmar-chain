# Production hosting and security-header ownership discovery

## Purpose

Before implementing [security header hardening](security-headers-hardening-plan.md), identify which deployed system actually controls HTTP response headers for each public hostname.

| Hostname | Observed role | Verified production host/CDN owner | Header change owner |
| --- | --- | --- | --- |
| bridge.winmarchain.io | Bridge frontend | Unknown | To confirm |
| winmarchain.io | Main website | Unknown | To confirm |
| scan.winmarchain.io | Explorer | Unknown | To confirm |

## Repository observations

- `.github/workflows/website-publish.yml` deploys **developer tools** static pages via GitHub Pages. This **does not establish** that GitHub Pages serves the main website, bridge, or explorer.
- `infra/aws-staging/terraform/` contains AWS **staging** infrastructure. Staging configuration **does not establish** ownership of production DNS, CDN, reverse proxy, or response headers.
- The new offline inventory script reports file paths, line numbers, and configuration categories. These are **hints**, not evidence of the current production deployment.

## Verification checklist

- [ ] Confirm authoritative DNS zone owner and DNS change approver for each hostname
- [ ] Capture DNS CNAME/A/AAAA records and CDN/proxy fingerprints with timestamps
- [ ] Confirm origin server, load balancer, ingress, reverse proxy and TLS termination
- [ ] Identify deployment repository and release pipeline actually serving each hostname
- [ ] Identify person/team with authorization to change production response headers
- [ ] Record existing headers and route-specific exceptions
- [ ] Inventory browser CSP dependencies (wallet, RPC, websocket, analytics, fonts, images)
- [ ] Review CSP Report-Only telemetry and wallet regression results before enforcement
- [ ] Stage HSTS without includeSubDomains/preload until all subdomains are verified
- [ ] Document rollback owner and tested rollback procedure

## Usage

Run Actions > Production hosting configuration discovery > Run workflow. Inspect the JSON artifact for repository hints. The script is offline and performs **no live DNS, HTTP, or TLS queries**. Live attribution requires independently validated DNS/hosting access and production operator confirmation.

## Security boundary

This PR makes **no production changes** and cannot close the missing-HSTS/CSP findings. Never publish private origin IPs, credentials, access tokens, or internal management endpoints in public audit artifacts.
