# Winmar Document Verification API

Standalone verification website and an API scaffold for organizations that
anchor PDF SHA-256 digests on Winmar Chain.

## Public website

Run `npm ci` and `npm run release:web` to produce the static release in
`dist/document-verification/`. Publish that directory at
`https://winmarchain.io/document-verification/`. The release includes a manifest
of SHA-256 checksums for the files served to visitors.

The browser computes the original PDF fingerprint locally. It reads the live
document fee from the payment contract, asks the connected wallet to pay, then
waits for **both** the fee receipt and the `DocumentRegistered` event and
record. Only then can it produce a PDF with the unchanged source pages followed
by the Winmar certificate. The certificate QR opens the confirmed registration
transaction in the Explorer. Its UTC timestamp comes from that block.

Subject and issuer names are applicant-supplied labels. They are not part of the
on-chain record, which attests the PDF SHA-256 fingerprint. Keep the receipt
worker online and verify the production RPC allows requests from
`https://winmarchain.io` before enabling issuance.

## Current scaffold

The optional API has an isolated runtime, environment configuration, request IDs,
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
