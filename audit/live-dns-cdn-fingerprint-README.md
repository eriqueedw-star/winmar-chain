# Live DNS, TLS and CDN fingerprint evidence

Run the manual **Live DNS TLS and CDN fingerprint** GitHub Actions workflow on `main` after merge. Download the `live-infrastructure-evidence-<run-id>` artifact.

## Coverage

- System DNS resolution success, IP family and unique address count (no raw IP addresses archived).
- Validated TLS handshake, negotiated protocol, certificate issuer and expiration.
- Public HTTPS response status, final redirect URL, and presence of key security headers.
- Limited provider response-header indicators for Cloudflare, AWS CloudFront, Vercel, and Netlify.

## Interpretation and limits

The script **does not enumerate authoritative DNS records, CNAME chains, DNSSEC, NS records, or origin addresses**. Its DNS observation uses the runner's system resolver. CDN header fingerprints can be absent, spoofed, or modified by proxies. Certificate issuers do not prove CDN ownership. A green workflow means evidence collection completed, **not** that endpoints are secure or even reachable.

This workflow cannot establish who owns production CDN/DNS accounts or where the bridge's backend is hosted. Verify the deployment and header-change authority with the infrastructure operator before applying the CSP/HSTS hardening plan.

No contract interaction, wallet connection, transaction, credential access, configuration mutation, or aggressive scanning is performed.
