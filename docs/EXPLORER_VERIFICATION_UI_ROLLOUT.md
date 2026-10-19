# Winmar Explorer — Deploy Only the Public Document Verification UI

**Scope:** one static, read-only HTML/CSS/JS verification page on `scan.winmarchain.io`.  
**Status:** reviewed release handoff; **does not itself deploy anything**.  
**Do not deploy a new smart contract, issuer worker, RPC node, wallet app, database, private key or validator.**

The on-chain payment and document-registration transactions **already succeeded**. The missing step is publishing the locally reviewed **public verification UI** and configuring the `/verify/<documentId>` web route. Avoid redoing successful blockchain transactions.

## 1. Build artifact from the existing PR

The draft [PR #42](https://github.com/eriqueedw-star/winmar-chain/pull/42) includes:

- `services/winmar-document-verification/web/verify.html`
- `services/winmar-document-verification/web/verify.css`
- `services/winmar-document-verification/web/verify.js`
- `services/winmar-document-verification/web/verification-proof.js`
- `services/winmar-document-verification/web/winmar-chain-logo-framed-v2.png`

No server-side dependencies are required to **serve these files**. Blockchain lookup requires the browser to reach the official read-only RPC; check CORS and performance from the final origin.

Actions → **Package Winmar Explorer Document Verification UI** builds an artifact named `winmar-explorer-verification-static-<run_id>` and verifies file integrity. It is NOT an auto-deploy action. Use the release artifact from the **specific reviewed Git SHA**, never an unreviewed `main` or a developer desktop folder.

The artifact contains:

```text
site/
  verify.html
  document-verification/
    verify.html
    verify.css
    verify.js
    verification-proof.js
    winmar-chain-logo-framed-v2.png
SHA256SUMS
manifest.json
```

The duplicate `verify.html` is intentional. `/verify/<documentId>` serves root `site/verify.html` but its `<base href="/document-verification/">` resolves assets beneath `/document-verification/` on the same Explorer host.

## 2. Determine current production routing owner first

**Operator approval required.** Identify the active TLS/reverse-proxy/Nginx configuration for `scan.winmarchain.io`, and check the existing Blockscout route handling. This repo does **not** establish credentials or ownership of the production Explorer host. Some installs proxy everything through a `location ^~ /` block, which may prevent a regex `/verify/<id>` location from taking precedence. Do not assume the example below overrides an unseen configuration.

Use one designated operator, with a current configuration backup, a tested rollback, and an approved maintenance window. Avoid exposing origin addresses, access tokens or private environment variables in public PR logs.

## 3. Example static Nginx route (requires adaptation and review)

First place the exact reviewed artifact files in a versioned release directory, e.g. `/srv/winmar-document-verification/releases/<reviewed-git-sha>/`. **The artifact contains a nested `site/` directory. Point the `current` symlink to the reviewed release's `site/` directory, not the release directory itself.** The web root in this example is `/srv/winmar-document-verification/current` and must therefore contain `verify.html` and `document-verification/verify.js` directly. Validate the SHA256SUMS relative to the release root before switching the symlink.

**Within the existing `server_name scan.winmarchain.io` TLS server block**, add the following *before any conflicting location policy*, then run `nginx -t` prior to a reload:

```nginx
# Static UI assets; do not route private API or upload endpoints here.
location ^~ /document-verification/ {
    root /srv/winmar-document-verification/current;
    limit_except GET HEAD { deny all; }
    try_files $uri =404;
    add_header X-Content-Type-Options nosniff always;
}

# Exact document-ID path only, preserving the visible URL for QR scans.
# IMPORTANT: Nginx location precedence must be reviewed against Blockscout
# locations, particularly any existing "^~ /" or regex matching /verify/.
location ~ "^/verify/0x[0-9A-Fa-f]{64}/?$" {
    root /srv/winmar-document-verification/current;
    limit_except GET HEAD { deny all; }
    try_files /verify.html =404;
    add_header Cache-Control "no-store" always;
    add_header X-Content-Type-Options nosniff always;
}
```

**Pre-reload static-layout check:** under the target `current` symlink, both of these paths MUST exist:

```text
/srv/winmar-document-verification/current/verify.html
/srv/winmar-document-verification/current/document-verification/verify.js
```

Do not approve deployment if the first path accidentally resolves to `current/site/verify.html`: that indicates the symlink points to the wrong directory and both routes will 404.

**Never replace the Explorer's general `location /` or Blockscout upstream.** Maintain existing TLS/HSTS/security headers and existing API/upstream routes. If the reverse proxy is not Nginx, implement the **same two static routes** using its supported route rules. Existing asset CORS/content-security policies should not be weakened globally.

The HTML contains no inline script. Under the final route the browser needs:

- `script-src 'self'`, `style-src 'self'`, `img-src 'self'`
- `connect-src https://rpc.winmarchain.io` unless a separately reviewed same-origin **read-only** proxy already exists
- Valid RPC CORS permission for origin `https://scan.winmarchain.io` (do not assume; test it in a real browser)

Avoid introducing an unrestricted write-capable public JSON-RPC proxy merely to solve a CORS problem.

## 4. Staging tests BEFORE production activation

Use an isolated staging virtual host/path that serves the exact release bytes. Check:

1. `/verify/<known-hash>` loads document verification HTML with HTTP 200.
2. `/document-verification/verify.js`, `verify.css`, `verification-proof.js` and logo all return HTTP 200, valid MIME types, and approved SHA-256 checksums.
3. Read-only RPC calls return the correct chain ID **12142816** and live document record. Verify no unexpected browser CORS or Content-Security-Policy violations.
4. Actual known public Document ID: `0x477a80f1f39d85e3b746f621a5271a17c3aa1b6adc9d88401cc7bbf58ae209fc`, with successful registration TX `0xbe95962ea545e9fd714e2dc971bd8300dba5c7da52e2aa6cfebb509a7ffbfb68`.
5. The registered hash alone displays **active on-chain record found**, not a claim that any random PDF was verified.
6. Upload the **original** PDF and compare exact SHA-256 locally. Match → `VERIFIED ON-CHAIN`; mismatch → **HASH MISMATCH**.
7. Unknown/malformed document ID, inactive issuer, revoked hash and RPC failure must remain non-verified (fail closed).
8. Scan the QR from a real, owner-approved Winmar certificate on iPhone and Android; confirm hash, issuer, timestamp and registration TX link.
9. Ensure existing Explorer home, address lookup, transaction lookup, `/api/v2`, websocket and all existing application routes remain healthy.
10. Monitor browser/RPC latency. The UI now uses the existing Blockscout public address-log index for candidate registration transaction discovery, followed by independent RPC receipt/contract verification. Confirm indexed queries are paginated and bounded (maximum 25 pages), do not use historic-block brute-force scans in live Explorer, and rate-limit as needed. If indexer or RPC is unavailable, report not-verified—not success.

An Explorer TX ID already appearing correctly does **not** prove `/verify/<documentId>` is published. These are separate acceptance gates.

### Post-deploy automated smoke test

From a reviewed checkout on a trusted operator workstation (Node.js 22+), run:

```bash
node scripts/probe-document-verification-explorer.mjs
```

It tests the exact known QR route, JS/CSS/logo HTTP status and MIME types, indexed successful registration TX, public RPC chain ID and CORS permission, plus a second unknown hash route. It performs only read-only requests and exits nonzero on failures. The live operator must still scan the QR on an actual iPhone/Android and compare the original PDF locally. **Do not infer production readiness from a successful build artifact or from a single TX Explorer view.**

## 5. Controlled production activation and rollback

- Save a protected copy of the existing Nginx virtual-host config and current symlink target (if any); retain them outside GitHub.
- Validate the reviewed `SHA256SUMS` after staging files. **Do not** overwrite unrelated files under the Blockscout web root.
- Switch the `current` symlink atomically to the reviewed static release directory only after both target location blocks and their precedence are approved.
- Test `nginx -t`; if it fails, **do not reload**. If it passes, operator can reload gracefully.
- Immediately verify known-document QR path, static assets, invalid-document behavior, successful original-PDF digest check, and core Explorer routes.
- If any production regression occurs, revert both Nginx route changes and release symlink to the backed-up configuration, validate `nginx -t`, reload, and retest Blockscout.
- Record the date/time, deployment SHA, asset hashes, HTTP status, page screenshot, QR test evidence, approved reviewer and rollback outcome in **private operational records**.

## 6. Release ownership and current limits

The installed GitHub connector can prepare/review files and CI artifacts; it does **not** provide an authenticated SSH session to the current Explorer server. Netlify project lookup found no matched Winmar site, and the main repository's GitHub Pages workflow deploys developer tools only—not this Explorer host. As a result, **a GitHub commit or green CI does not activate `scan.winmarchain.io/verify/`**.

The production operator must confirm **which hosting platform/current reverse proxy controls `scan.winmarchain.io`**, provide an approved deployment route, and authorize the release. The existing mainnet contracts, 0.0021 WMC fee, issuance worker and validator setup must stay unchanged.
