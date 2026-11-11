# Bridge readiness and security evidence

This is a **manual, read-only** check of the official Winmar Chain bridge, website, and explorer.

Checks:

- HTTPS certificate validation using the Python system trust store.
- Public HTTP status and final redirect destination.
- Presence of HSTS, Content Security Policy, X-Content-Type-Options, Referrer-Policy, and frame-protection response headers.
- Evidence artifact saved for 30 days.

Only HTTPS and a successful HTTP response are required for the workflow to pass. Missing security headers are reported as observations, **not** automatic release blockers. Review findings before determining severity.

**Out of scope:** wallet connection, bridge smart-contract correctness, token transfers, relayer behavior, finality, liquidity, proof verification, custody, and end-to-end bridging. A green workflow **does not mean the bridge is safe for real funds**.

Run from Actions > Bridge readiness and security evidence > Run workflow on `main` after merge.
