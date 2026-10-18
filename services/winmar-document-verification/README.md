# Winmar Document Verification API

Winmar Document Verification has two access paths: **wallet-based public issuance without a platform account**, and **approved-organization API access for embedding issuance in a customer website**. Both paths anchor the original PDF SHA-256 on Winmar Chain after a wallet-paid fee; no off-chain or unpaid certificate is issued. The organization API key enables integration, not a bypass around the on-chain contract, fee, or authorized issuer. See `../../docs/DOCUMENT_VERIFICATION_ACCESS_MODEL.md`.

This isolated API service targets registered organizations that anchor PDF SHA-256 digests and generate approved A4 certificates **only after successful registration and verification**.

## Current scaffold

The service has an isolated runtime, environment configuration, request IDs,
API-key HMAC handling, no-store responses, and an explicit production safety
gate. Document issuance intentionally returns `501 issuance_not_ready` until
the tenant database, upload scanner, issuer signer, receipt worker, and PDF
pipeline are connected.

Run locally:

```powershell
Copy-Item .env.example .env
$env:API_KEY_PEPPER = 'local-only-random-secret'
npm start
```

Health check: `GET http://127.0.0.1:8787/health`

## Production gates

1. Tenant database with hashed API keys, scopes, rotation, revocation, and
   idempotency records.
2. Isolated issuer signer with approval and audit logging.
3. PDF validation, malware scanning, size limit, retention, and deletion.
4. SHA-256 worker and immutable document record.
5. Receipt confirmation worker and Explorer verification route.
6. Contract, API, security, and staging end-to-end tests.

The service must never return `VERIFIED ON-CHAIN` before the transaction
receipt is confirmed and the explorer record matches the original PDF hash.
