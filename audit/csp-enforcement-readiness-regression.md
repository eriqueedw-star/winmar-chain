# CSP enforcement readiness and regression plan

## Baseline

Operator-reported production hardening (2026-10-16): AWS EC2 Ubuntu Nginx serving `winmarchain.io`, `scan.winmarchain.io` (Blockscout reverse proxy), and `bridge.winmarchain.io`. HSTS `max-age=300` and app-specific CSP **Report-Only** have reportedly been deployed, and website X-Frame-Options set to SAMEORIGIN. This is an operator report, not an independent verification. The production Nginx configuration and private backups are not in this repository.

**Unresolved:** enforced CSP on all three domains, `unsafe-inline` dependencies on website/explorer, authenticated Cognito flows, wallet connection and mobile visual regression.

## Safety gate: before enforcing CSP

- [ ] Confirm current active Nginx `server` and `location` blocks and inherited headers without publishing secrets
- [ ] Capture live header evidence using the new manual CSP readiness workflow
- [ ] Collect representative CSP Report-Only violation reports and browser console observations across real user flows; absence of reports without reporting configuration is **not** evidence of safety
- [ ] Inventory scripts/styles, inline handlers, fonts, Slise, CDN dependencies, wallet providers, RPC primary/backup, Cognito, API Gateway and external logos
- [ ] Replace `unsafe-inline` with vetted nonces or hashes where feasible; document residual exceptions and risks
- [ ] Prepare separate **enforced** policies for website, explorer and bridge; do not blindly copy Report-Only policy
- [ ] Confirm backup and rollback owner; validate Nginx syntax before any reload
- [ ] Obtain explicit production approval for the selected domain and rollout window

## Browser regression matrix

| App | Desktop | Mobile | Required flows |
| --- | --- | --- | --- |
| Website | Chrome/Firefox | iOS Safari/Android Chrome | Navigation, static assets, embeds, links |
| Explorer | Chrome/Firefox | iOS Safari/Android Chrome | Block list, block details, transaction details, search, Slise, Google Fonts |
| Developer Console | Chrome/Firefox | iOS Safari/Android Chrome | RPC primary/backup, chain switch, Cognito login/logout, API Gateway, jsDelivr |
| Bridge | Chrome/Firefox | iOS Safari/Android Chrome | Portal rendering, wallet connect/disconnect where supported; **no mainnet transfer** |

For any wallet, authenticated, or testnet-only interaction, use authorized test accounts and testnet funds; do not request seed phrases, private keys, or production transfers. Bridge transfers currently disabled must remain disabled.

## Rollout sequence

1. Snapshot current headers and redacted, operator-reviewed Nginx config; keep full backup private.
2. Review Report-Only telemetry and resolve legitimate violations.
3. Enforce **one host at a time** in an approved maintenance window, retaining Report-Only reporting if appropriate.
4. Operator runs `sudo nginx -t`; only then `sudo systemctl reload nginx`.
5. Re-run public header evidence, browser matrix, and wallet/login checks.
6. On failures, restore private backup, run `sudo nginx -t`, reload, and verify the original headers and application behavior.
7. Increase HSTS duration only after monitoring; no `includeSubDomains` or preload without subdomain inventory.

## Acceptance criteria

- [ ] All three domains show enforced CSP in **live** HTTPS responses
- [ ] Legitimate application flows work without unexpected CSP violations
- [ ] Authenticated Cognito and wallet flows are exercised with authorized test identities
- [ ] Desktop and mobile visual/functional checks pass
- [ ] HSTS and frame protection remain present; no regressions in RPC or Blockscout
- [ ] Operator signs off on monitoring, rollback and post-deploy verification

**Important:** The workflow only checks public headers and always exits successfully when evidence is written. Green CI **does not** mean CSP is enforced, secure, or ready to enforce.
