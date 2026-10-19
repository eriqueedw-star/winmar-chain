# Winmar Explorer Document Verification — Confirmed AWS EC2 + Nginx

**Production impact:** NOT DEPLOYED by this document/PR. Any change to Nginx needs
explicit authorization, pre-change snapshot, rollback and live acceptance.
Do not modify Blockscout, validators, RPC routing, deployed contracts, wallet fee,
issuer keys or database schema.

## Actual Nginx routing evidence (operator console, 2026-10-19)

The EC2 host already runs a healthy Nginx service (`nginx -t` PASS,
`systemctl is-active nginx` returns `active`). Existing virtual host:

- `/etc/nginx/sites-enabled/scan.winmarchain.io`
- Port 80 redirects to TLS.
- HTTPS `server_name scan.winmarchain.io` includes:
  - `/etc/nginx/snippets/winmar-security-common.conf`
  - `/etc/nginx/snippets/winmar-csp-scan-report-only.conf`
- Existing Explorer `location /` proxies **unchanged** to
  `http://127.0.0.1:8080` with its existing Host, forwarded headers,
  WebSocket upgrade, compression and branding `sub_filter`.
- Other existing locations serve only approved brand/env/icon assets.
- No existing `/verify/<documentId>` or `/document-verification/` location
  was shown in the operator's active `nginx -T` output.
- The current **Report-Only** CSP's `connect-src` does NOT list
  `https://rpc.winmarchain.io`. It may emit policy violations (without
  enforcing blocks); an approved scoped CSP revision must include the RPC
  before full launch, after checking effective inheritance.

**Do not publicly commit sensitive server addresses, login sessions, credentials,
or private Nginx files.** The above is only the route-level configuration
necessary to scope the deploy.

## Package: pin exact reviewed commit

From the authorized Session Manager terminal, first run the READ-ONLY checks:

```bash
command -v git
command -v python3
sudo nginx -t
sudo systemctl is-active nginx
readlink -f /etc/nginx/sites-enabled/scan.winmarchain.io
```

After operator approval, download the reviewed public PR #45 branch on EC2,
confirm the expected SHA and build the static artifact:

```bash
set -e
WORK="$(mktemp -d /tmp/winmar-verify-ui.XXXXXXXX)"
git clone --quiet --depth 1 \
  --branch release/explorer-document-verification-ui-20261019 \
  https://github.com/eriqueedw-star/winmar-chain.git "$WORK/repo"
cd "$WORK/repo"
git rev-parse HEAD
python3 scripts/build-document-verification-explorer.py --output "$WORK/bundle"
( cd "$WORK/bundle" && sha256sum --check SHA256SUMS )
```

Pin the printed SHA to the **specific owner-approved PR #45 revision**
before uploading or activating anything. The branch can move after review.
The artifact includes only six public files under `site/` and a checksum
manifest; it does not contain wallet signing keys or PDF data.

Stage without changing any live route:

```bash
SHA="$(git rev-parse HEAD)"
sudo bash scripts/stage-document-verification-explorer.sh \
  "$WORK/bundle" /srv/winmar-document-verification/releases "$SHA"
sudo test -f "/srv/winmar-document-verification/releases/$SHA/site/verify.html"
sudo test -f "/srv/winmar-document-verification/releases/$SHA/site/document-verification/verify.js"
```

The staging command only creates a unique immutable folder,
`/srv/winmar-document-verification/releases/$SHA/site/`. It does not
change Nginx, restart services or change the `current` symlink.

## Nginx activation — controlled operator operation only

The reviewed two-location fragment is at:
`deployment/explorer/scan.winmarchain.io.document-verification.locations.conf`.

It defines precisely:
- `location ^~ /document-verification/` → public static assets under
  `/srv/winmar-document-verification/current/document-verification/`.
- `location ~ "^/verify/0x[0-9A-Fa-f]{64}/?$"` → static
  `/srv/winmar-document-verification/current/verify.html`.

**Prerequisites before any Nginx change:**

1. Confirm active TLS virtual host matches the operator-provided evidence.
2. Record the REAL target of the `sites-enabled` symlink via `readlink -f`.
3. Back up the actual resolved config file to a protected local archive; record
   original symlink target if an old verification release exists.
4. Ensure existing `/brand/`, `/assets/`, `/icons/`, `/api/v2/` and
   Blockscout homepage are healthy.
5. Review CSP/CORS for browser `POST https://rpc.winmarchain.io/`.
   Do not overwrite global security settings, and do not introduce an
   unrestricted JSON-RPC write proxy.
6. Verify `current` will point to **releases/$SHA/site**, never to
   `releases/$SHA` (that extra `site` level produces HTTP 404).
7. Include the reviewed route fragment INSIDE the existing **HTTPS** server
   block. Do not put it inside the port-80 redirect virtual host, and never
   replace its existing `location /` or `proxy_pass`.
8. The route fragment deliberately has **no** `add_header`, to preserve
   server-level inherited HSTS/CSP and other security headers. Validate
   effective headers on new paths before activation.

Once backed up and after approval, the operator may install the snippet as
`/etc/nginx/snippets/winmar-document-verification.locations.conf`
and add exactly one include inside the existing TLS server block:

```nginx
include /etc/nginx/snippets/winmar-document-verification.locations.conf;
```

Use `sudo nginx -t` BEFORE any `systemctl reload nginx`. Never restart the
chain or Blockscout services. If syntax, routing or browser tests fail,
roll back the new include/config to the exact previous working file,
restore the old verification release symlink (if any), validate syntax,
and reload Nginx gracefully. Keep the old files until rollback is confirmed.

## Live acceptance

```bash
node scripts/probe-document-verification-explorer.mjs
```

The read-only smoke test checks:
- Known `/verify/<documentId>` URL returns HTTP 200 with reviewed HTML.
- All public JS, CSS and logo assets return correct content types.
- Known registered TX is present in Explorer indexed logs.
- Browser RPC returns Winmar Chain ID 12142816 and allows Explorer origin.
- Unknown document ID route cannot claim verification from static HTML alone.

Manually verify original PDF exact SHA-256 against the registered hash
in a real browser, plus mismatched PDF, revoked/unauthorized record,
mobile QR, CSP browser console and unchanged Blockscout routes.

**Successful payment/registration TX IDs are ALREADY confirmed mainnet evidence,
but they do NOT activate the public /verify route.** A GitHub CI PASS does not
make `scan.winmarchain.io/verify/` live until the authorized Nginx operator
completes activation and live acceptance.
