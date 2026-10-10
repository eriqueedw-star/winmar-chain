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

## P0 security implementation in development

- Live mode now requires private Unix socket ingress, with permission mode 0600. The reverse proxy must authenticate the originating client and inject only the verified `X-Winmar-Verified-IP` header. Other forwarded-IP headers are rejected. This requires infrastructure configuration and independent validation before launch.
- Live Redis now requires TLS (`rediss://`), password authentication, `noeviction`, and AOF persistence. A per-wallet pending-transaction journal has no TTL. The atomic claim script blocks unresolved requests from repeating.
- An approved dedicated public relayer address must match the signing key. A persistent Redis singleton lock prevents a second signer from starting simultaneously, and `ethers.NonceManager` manages the nonce sequence inside the single process. After a crash, operators must reconcile and explicitly release the singleton lock before restart.
- Journal entries are `reserved`, `unknown`, or `submitted:<transaction-hash>`. They remain locked pending manual reconciliation, including uncertain or failed network responses. Never delete them automatically.
- CI tests cover the authorization mock, proxy IP parsing, contract transactions and concurrent access against isolated real Redis. This does NOT establish an independent security audit.

### Unresolved production blockers

1. Restrict the origin firewall to approved edge/proxy endpoints, configure a trusted Cloudflare client-IP chain, strip client-supplied IP headers, inject a fresh verified header, and route traffic only through private Unix socket. Prove direct-origin bypass is impossible.
2. Set up an authenticated Redis with TLS, ACL, AOF, noeviction, backups and recovery validation. The ephemeral Redis CI container is never production state.
3. Custody the dedicated relayer signing key in an approved secrets manager or signing service; enforce least privilege and WMC limits, and never reuse a QBFT validator or treasury key.
4. Document transaction receipt, contract-event and chain-confirmation verification, and use two-person authorization before releasing an outstanding transaction or singleton lock.
5. Audit runtime and smart contracts independently, stage integration/load tests, monitor budgets and run emergency stop procedures before mainnet activation.

**Do not enable live WMC claims on the basis of successful CI alone.**
