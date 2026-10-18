# Winmar Document Verification — initial product specification

## Default behavior

The user uploads one PDF. The service preserves the uploaded PDF as the source
document, computes its SHA-256 digest before any output is generated, and
creates one additional A4 certificate page. The certificate is appended to a
copy of the PDF; the original pages are not rewritten and do not receive a
per-page footer by default.

## Verification record

The on-chain record must bind the certificate to the exact source file:

- `documentId`
- `sha256`
- `issuer`
- `documentType`
- `issuedAt`
- `status` (`active` or `revoked`)
- certificate schema version

The transaction hash and block metadata are displayed on the certificate after
the record is confirmed. A QR code contains only the public Explorer
verification URL, for example:
`https://scan.winmarchain.io/verify/<documentId>`.

## Certificate page

The appended A4 page contains the single `WINMAR VERIFIED` emblem supplied by
the brand owner, document ID, issuer, SHA-256 fingerprint, transaction hash,
block number, timestamp, issuer wallet, network, and a `VIEW ON EXPLORER`
link. Placeholder values must never be presented as a live verification.

## Verification rules

1. Download or select the original PDF.
2. Compute SHA-256 locally or in a trusted service boundary.
3. Resolve the document ID on Winmar Explorer.
4. Compare the computed digest with the immutable on-chain digest.
5. Validate the issuer address and record status.
6. Show `VERIFIED ON-CHAIN` only when all checks pass.

A copied QR code is not proof by itself. The Explorer record, matching digest,
issuer address, and non-revoked status are authoritative.

## Privacy and safety constraints

- Never store private keys, seed phrases, or passwords in the document flow.
- Do not put the PDF contents on-chain; store only the digest and minimal
  public metadata.
- Define upload retention and deletion before enabling production uploads.
- Reject oversized or unsupported PDFs and scan inputs before processing.
- Treat the certificate as a derived artifact and keep the source digest
  immutable.

## Implementation status and production acceptance

This specification is the agreed behavior baseline. The same feature branch also
contains the initial document-verification service, web UI, API schema, certificate
assets, and contract deployment tooling. Their presence does **not** establish
production readiness or a deployed, independently verified contract.

The service README explicitly documents that issuance currently returns
`501 issuance_not_ready` until the tenant database, upload scanner, issuer signer,
receipt worker, and PDF generation pipeline are integrated. This status must not
be represented as successful live issuance in user-facing documentation.

Before enabling public issuance, verify and record:

- [ ] The issuer authorization model, key custody, and contract addresses.
- [ ] Deployment receipts and verified contract source on `scan.winmarchain.io`.
- [ ] Original PDF hash matching the confirmed on-chain record.
- [ ] Payment confirmation, retry/idempotency behavior, and failed-payment handling.
- [ ] A4 certificate merge and QR resolving to a working Explorer verification page.
- [ ] Revocation, duplicate IDs, unauthorized issuers, and hash mismatch tests.
- [ ] Upload malware scanning, limits, retention/deletion policy, and privacy review.
- [ ] End-to-end staging evidence with a sample PDF, followed by an approved release.

Keep public issuance disabled until all applicable gates are complete. Do not
place issuer keys, customer PDFs, or private operational details in Git.
