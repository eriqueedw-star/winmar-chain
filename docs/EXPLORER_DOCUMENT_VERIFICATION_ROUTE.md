# Winmar Explorer — Public Document Verification Route

**Status: NOT DEPLOYED / PRODUCTION ROUTE 404 (as observed 2026-10-19)**. This is a release-blocking gap. The user-approved certificate's QR MUST resolve to:

`https://scan.winmarchain.io/verify/<0x+64-hex-documentId>`

On 2026-10-19 a read-only visit to the real sample registration route returned HTTP **404**:

`https://scan.winmarchain.io/verify/0x477a80f1f39d85e3b746f621a5271a17c3aa1b6adc9d88401cc7bbf58ae209fc`

**Do not print customer certificates with QR codes to this dead route.** The on-chain sample transaction itself is valid; the public Explorer *website route* is not yet provisioned.

## Proposed static handler (review-only, not production config)

This branch now contains a read-only frontend handler:

- `services/winmar-document-verification/web/verify.html`
- `services/winmar-document-verification/web/verify.css`
- `services/winmar-document-verification/web/verify.js`
- `services/winmar-document-verification/web/verification-proof.js`
- Original `web/winmar-chain-logo-framed-v2.png` (unmodified)

The handler reads the `bytes32 documentId` from the URL, queries the existing `DocumentVerification` contract at `0x53fB6ba2997A50d3ddFfF5395a3BB9b7b24B7AEF` on Chain ID `12142816`, confirms a successful document-registration transaction, checks current issuer authorization and revocation state, and optionally calculates the selected original PDF's SHA-256 **locally in the browser**. No account, wallet, API key, backend PDF upload or smart-contract write is needed to verify.

**Trust distinction:**

- Without the original PDF: label `ACTIVE ON-CHAIN RECORD FOUND — PDF NOT CHECKED`. This does NOT authenticate an arbitrary file.
- With the original PDF and matching digest: display `VERIFIED ON-CHAIN`.
- With mismatching, revoked, missing, unauthorized, unconfirmed or unavailable state: display an unmistakable failure / non-verified state. Fail closed.

### Example routing concept for ops review only

Do **not** copy this directly to production without confirming the existing Nginx/Blockscout virtual-host layout, precedence of location blocks, CSP, CORS, access logs and rollback mechanism.

```nginx
# EXAMPLE ONLY — adjust paths, root/alias precedence and existing location rules.
# Approved static files must come from a pinned reviewed Git commit.
location ^~ /document-verification/ {
    alias /var/www/winmar-document-verification/;
    limit_except GET HEAD { deny all; }
    add_header X-Content-Type-Options nosniff always;
}

# Serve a static verification entrypoint for exact document ID paths.
location ~ "^/verify/0x[0-9A-Fa-f]{64}/?$" {
    root /var/www/winmar-document-verification;
    try_files /verify.html =404;
    add_header Cache-Control "no-store" always;
}
```

The static files are expected under `/document-verification/` because the HTML sets `<base href="/document-verification/">`; `/verify/<id>` must render that HTML while keeping the URL intact.

Consider a dedicated Blockscout frontend route or an indexed verification backend instead if production uses a different reverse-proxy architecture. The provided static handler is a staging/reference implementation, **not** a security audit of the entire explorer.

### Security/CSP/CORS

- Permit `connect-src https://rpc.winmarchain.io` and verify the RPC CORS policy actually accepts requests from `https://scan.winmarchain.io`.
- Keep `script-src 'self'` and `style-src 'self'`; all assets are bundled. No inline JavaScript and no external Google Fonts/QR endpoint.
- Use TLS, deny directory listing, and never proxy private validator management interfaces.
- Apply rate limiting to RPC / indexed read APIs before a high-traffic production launch. The initial on-browser log scan is not suitable for unbounded historic-chain growth.
- The certificate master remains a **separate immutable approved asset**; do not render or generate certificates inside this Explorer route.

## Acceptance criteria — do not release before all PASS

- [ ] GET `https://scan.winmarchain.io/verify/<known-registered-id>` returns 200 with correct official verification UI.
- [ ] A missing/unregistered ID and malformed input never produce VERIFIED status.
- [ ] Public verification works without login, API keys, wallet, payment, or transactions.
- [ ] For the known registration, on-chain record status is ACTIVE, correct issuer, registration TX hash and UTC timestamp.
- [ ] Original source PDF hash match yields VERIFIED ON-CHAIN only after exact match.
- [ ] A different PDF shows HASH MISMATCH, not verified.
- [ ] Revoked / unauthorized-issuer records are visibly rejected.
- [ ] QR scan from owner-approved PDF on iOS/Android opens the exact document and same result.
- [ ] Works on phone and desktop, with appropriate Explorer CSP, RPC CORS, and safe server routing.
- [ ] No alteration to validator fleet, contract, treasury, fee, genesis or existing Explorer root routes.
- [ ] Ops approval, rollback instructions, and sanitized deployment evidence are attached.

**No production Nginx change, backend deploy, or Blockchain transaction is performed by this specification or draft PR.**
