# Production Integration Hub cutover

Status reviewed: 2026-11-07.

## Current published evidence

The Integration Hub is built and published by GitHub Pages from the canonical Winmar Chain repository:

- Hub: https://eriqueedw-star.github.io/winmar-chain/integrations.html
- Machine-readable status: https://eriqueedw-star.github.io/winmar-chain/integrations/status.json
- Pages deployment commit: `e0bc7c6180afb2ce09ca45af100a37c49be0325e`

The repository's GitHub Pages environment currently publishes under the repository Pages URL. There is no verified repository evidence that this Pages environment owns the production `winmarchain.io` hostname.

## Desired canonical production routes

After the actual production website host/release owner is identified and approved, publish the same reviewed artifacts at:

- `https://winmarchain.io/integrations.html`
- `https://winmarchain.io/integrations/status.json`

Do **not** add a GitHub Pages `CNAME` for `winmarchain.io` until authoritative DNS and production hosting ownership are confirmed. The main website, explorer and other subdomains may have independent production infrastructure.

## Required production acceptance checks

1. `GET /integrations.html` returns HTTP 200 over HTTPS.
2. `GET /integrations/status.json` returns HTTP 200 and valid JSON.
3. Chain ID is exactly `12142816` / `0xB948E0`.
4. RPC is exactly `https://rpc.winmarchain.io`.
5. Explorer is exactly `https://scan.winmarchain.io`.
6. Network logo is exactly `https://winmarchain.io/assets/winmar-logo.png`.
7. Native WMC logo is exactly `https://winmarchain.io/logo/wmc.png`.
8. No active retired Winmar `.org` endpoint is present.
9. EIP-3085 Add Network requests only canonical production values.
10. Mobile rendering and external links are smoke-tested.

## Source-of-truth

- HTML source: `apps/developer-tools/integrations.html`
- Machine-readable integration status: `integrations/wallets/status.json`
- Publish workflow: `.github/workflows/website-publish.yml`

Until the production host is verified and cut over, vendor packets must use the live GitHub Pages evidence URL rather than claiming the `winmarchain.io/integrations.html` route is already published.
