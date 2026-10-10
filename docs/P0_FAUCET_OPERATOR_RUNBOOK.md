# WINMAR CHAIN P0 Faucet Hardening & Operator Runbook

**Document status:** PRE-RELEASE, not evidence of production readiness. **Network:** Winmar Chain mainnet, chain ID 12142816. No keys or secrets belong in this repository.

## 1. P0 implementation evidence

| Control | Implemented in feature branch | Additional live evidence needed |
|---|---|---|
| Trusted ingress | TCP requests cannot operate live; private Unix socket, verified client IP and rejected forwarding headers | Cloudflare and origin firewall configuration, reverse-proxy stripping, spoofing/bypass penetration test |
| Redis | Atomic Lua nonce/quotas, live TLS/password/AOF/noeviction requirements, CI using ephemeral Redis | Dedicated persistent Redis, ACL, backup/restore rehearsal, monitoring and TLS certificate review |
| Transactions | Persistent per-wallet pending records without TTL, fail-closed unknown outcomes | Receipt/log proof review, observed finality, incident response, tested and signed operator reconciliation |
| Signing | Verified dedicated relayer wallet address, Redis singleton lock, process nonce manager | External secret store/signer, rotation drill, segregation from validator and treasury, documented recovery |
| Release | Explicit launch gate remains disabled and CI tests are mandatory | Independent smart-contract and runtime audit, staged end-to-end and stress tests, operator go/no-go |

## 2. Verified proxy IP architecture

Use an externally protected Cloudflare HTTPS edge, origin firewall limited to authenticated edge ingress, and a reverse proxy configured with a maintained trusted Cloudflare IP allowlist. Never treat a header supplied by an arbitrary Internet client as identity. The reverse proxy must ignore/remove all inbound X-Winmar-Verified-IP, Forwarded, X-Forwarded-For, X-Real-IP and CF-Connecting-IP headers before inserting its own trusted and validated X-Winmar-Verified-IP. Route to the application through a private Unix-domain socket owned by a dedicated service account with restrictive directory and socket permissions.

Test the following **before** any public release: forged chain of forwarded headers, direct origin access, IPv4/IPv6/IPv4-mapped IPv6, ports and comma-separated values, duplicate headers, direct TCP requests, symlink/socket-file attacks, edge bypass and requests after edge key/config rotation. A misconfigured proxy can still send an untrusted IP; the application cannot independently prove external Cloudflare client identity.

## 3. Durable Redis

Production must use authenticated rediss://, short-scoped ACL users, AOF, maxmemory-policy noeviction, time sync and backups. CI uses disposable, non-production Redis. Real Redis tests check atomic Lua operations and a permanent unresolved journal. Validate fail closed for TCP disconnections, blocked Redis commands, persistence errors, disk-full, leader crash, concurrent workers and restarts. Automatic backups and DR alone do not prove replay protection: verify a recovery drill on a dedicated staging instance.

## 4. Reconciliation of uncertain transactions — manual until audited

The authorization service writes a per-wallet pending key before any transaction submission. Expected values are reserved, unknown, or submitted:<txHash>. Records have no TTL. A pending record is an unconditional hold on further claims by that wallet. A Redis singleton-relayer key has no TTL and prevents accidental concurrent signer instances.

**Never unlock based solely on an HTTP 500, timeout, RPC error, or missing explorer result.** A transaction may have been sent successfully even when the HTTP request failed. For every attempted claim:

1. Freeze the affected wallet and pause distribution if anomalies are repeated. Record UTC time, wallet, expected WMC amount, status, chain ID, faucet contract, runtime change reference and approved relayer address. Avoid storing user PII.
2. Cross-check the RPC and independent explorer: transaction hash (if available), relayer from-address, faucet to-address, transaction nonce, successful receipt, relevant Claim recipient/amount event, block number, confirmation/finality and other competing transactions with the same nonce.
3. When no transaction hash is known, review dedicated relayer's transaction nonce history over the relevant block range and obtain evidence for whether the transaction was replaced, mined, reverted or never submitted. Absence from a single mempool endpoint does not prove non-submission.
4. Obtain independent reviewer approval for disposition. Save a redacted immutable evidence ticket. A transaction that succeeded **must not be retransmitted**.
5. Only an authorized operator may manually clear a **specifically verified** pending entry, and only after proving no duplicate payout is possible and respecting the on-chain cooldown. The procedure to automate this unlock has NOT been approved or shipped.
6. Before a relayer restart, reconcile outstanding transactions and confirm old signer shutdown, RPC nonce state, Redis health and AOF durability. Only then may a reviewer approve release of the singleton-relayer key. Never clear unrelated Redis keys or restart by wiping the database.

## 5. Dedicated relayer key custody

Never use a QBFT validator key, corporate treasury key or document issuer wallet for gas sponsorship. Use a purpose-limited funded signer in a secrets manager or external signing service. Cap operating gas budget, allow only approved faucet contract interactions, monitor account balance and nonce health, rotate credentials through change approval, and keep keys out of Git, tickets and chats. The source currently accepts a key from a protected process environment; production key custody architecture is still a release blocker.

## 6. Incident response and rollback

On suspicious repeated claims, unexpected relayer spend, Redis inconsistency, unauthenticated ingress or drifted chain ID: set live claim gate off, pause faucet via authorized operations, isolate relayer, preserve journal and logs, reconcile all pending transaction hashes, and require independent reapproval before restart. Do not delete Redis reservations as a workaround. Reverting a Git commit does not reverse on-chain WMC transfers.

## 7. Exit gate for P0

- [x] Pre-release trusted IP / socket controls in source and unit tests.
- [x] Pre-release nonce / quota / journal atomicity tests using actual Redis in CI.
- [x] Pre-release relayer key identity / singleton and Redis persistence fail-closed guards in source.
- [ ] Cloudflare, TLS proxy, firewall and live real-IP integrity verified on operator-controlled staging.
- [ ] Persistent Redis deployment and restore test with noeviction, AOF and ACL/TLS verified.
- [ ] Approved external relayer signer / secrets storage, nonce and rotation exercise.
- [ ] Incident/reconciliation drill witnessed with a staged transaction and reviewer approval.
- [ ] Independent security assessment and explicit mainnet deployment approval.

**Until every outstanding item is resolved, this source must stay as a Draft PR and live claims must remain disabled.**
