# WINMAR CHAIN — Isolated Faucet P0 staging

**Status:** local developer preview ONLY; not a public service or production deployment recipe.

The sandbox contains Redis with AOF enabled and a Node process-level smoke test that validates a private Unix socket. Live WMC transactions are disabled; no funded faucet, relayer key or production contract is included.

## Run locally

Requires a developer machine with Docker Compose and Node.js 24+.

1. In the repository root, run: docker compose -f infra/faucet-staging/compose.yaml up -d
2. In services/faucet-relayer, install the pinned direct dependencies using the reviewed package manager process. CI currently uses npm install --ignore-scripts --no-audit --no-fund --package-lock=false.
3. With REDIS_TEST_URL=redis://127.0.0.1:16379, run npm test. This runs mock authorization, real Redis atomicity tests and private-socket HTTP smoke tests.
4. From repository root, inspect Redis with docker compose -f infra/faucet-staging/compose.yaml exec redis redis-cli INFO persistence. Confirm aof_enabled:1. Check CONFIG GET maxmemory-policy returns noeviction.
5. Stop using docker compose -f infra/faucet-staging/compose.yaml stop. Preserve the volume if testing retained journal state. Deleting volumes wipes test data.

## Scope and exclusions

- Tested by CI: real-process HTTP Unix socket with mode 0600, GET /health returning claimsEnabled=false, and /v1/challenge and /v1/claim both returning HTTP 503 while disabled.
- Tested by CI: Redis Lua atomic authorization across concurrent worker connections (ephemeral isolated Redis).
- Not tested: production Cloudflare-origin trust, TLS proxy routing, authenticated Redis TLS/ACL, Redis crash and restore, signing key custody, Turnstile integration, external RPC finality or any WMC transfer.
- DO NOT configure WMC_ENABLE_LIVE_CLAIMS, production private keys or real WMC contract addresses in this local staging environment. Current live backend RPC is the mainnet endpoint, not a staging chain.

## Operational P0 blockers

1. Operator-controlled, privately networked staging host. Origin firewall and TLS proxy configuration must be proven to reject bypasses and forged forwarding headers.
2. Production-shaped Redis with TLS authentication, noeviction, AOF, tested restore and ACL monitoring. Local unauthenticated loopback Redis is not production configuration.
3. Purpose-specific external relayer signer, least-privilege secret management, transaction nonce, budget and recovery drills.
4. Review on-chain receipt and event proof with independent operator authorization before releasing pending transaction journals.
5. Independent security review and explicit go/no-go before enabling any mainnet claim.

Never reuse a QBFT validator signing key for Faucet operations. No mainnet, DNS, treasury or validator changes result from these files.
