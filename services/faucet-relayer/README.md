# Winmar Chain gas-sponsored faucet backend

Status: PRE-RELEASE. No backend deployment, funded faucet, signer authorization, production Redis or public API is recorded. Production WMC claims are disabled by default.

## Design

The Node backend uses a five-minute wallet ownership challenge containing the exact Winmar Chain ID 12142816, expected HTTPS origin, nonce and expiry. Each claim verifies the user's EIP-191 signature against the wallet address, then verifies Cloudflare Turnstile server-side, including expected hostname.

Redis keeps nonce state and executes atomic Lua scripts to prevent replay, hold each wallet for 24 hours, and cap daily per-IP submissions. A broadcast failure does not release the wallet hold, because the transaction may already have reached the chain. Operators must reconcile uncertain transactions against the explorer. The backend cannot mint WMC.

Browser frontends must never receive a wallet or Redis secret. The signing account must be a separate, limited relayer rather than a validator key.

## Endpoints

- POST /v1/challenge: JSON body with address. Returns a human-readable message and expiry for wallet signMessage.
- POST /v1/claim: JSON body with address, signature, captchaToken. Returns transaction hash only after passing checks.
- GET /health: process status and whether live claims are enabled.

## Security and deployment gates

All POST endpoints return 503 unless WMC_ENABLE_LIVE_CLAIMS exactly equals I_ACKNOWLEDGE_MAINNET_RISK. This flag alone is insufficient: at startup the backend validates the official RPC and chain ID, a reviewed faucet contract address, assigned relayer and funding, and requires a real Redis URL and Turnstile secret.

**Do not turn the flag on yet.** No full-system security audit, independently verified mainnet addresses, verified TLS/reverse-proxy real-IP system, operational abuse monitoring, deployed nonce store, load tests, reconciliation procedures, or dedicated key custody has been established.

The current HTTP service derives quotas from req.socket.remoteAddress; this is intentionally resistant to spoofed X-Forwarded-For headers but would treat users behind one reverse proxy as the same IP. A separately verified trusted-edge deployment design must resolve this before any public launch. Do not trust client-supplied forwarding headers.

A wallet address is not proof of a distinct human. Per-wallet restrictions do not prevent Sybil attacks. CAPTCHA and analytics are required in addition to rate limiting.

## Tests

Run npm install --ignore-scripts then npm test in services/faucet-relayer. Unit tests use an in-memory mock only for **offline testing**, while production must use real Redis. They cover domain binding, incorrect signatures, CAPTCHA rejection, expiration, replay, duplicate claims, per-IP quotas, concurrent requests and unknown broadcast reconciliation.

## Notes

Environment fields are documented in .env.example. All official RPC and explorer endpoints use winmarchain.io. No secrets or validator operations belong in this repository.
