# Winmar Document Verification — design v1

## 1. Trust model

The PDF itself remains off-chain. Winmar Chain stores only a deterministic
proof that an authorized issuer registered a particular document digest.
Verification requires four matching facts: the uploaded file's SHA-256,
the on-chain document ID, the issuer address, and the record status.

The QR code is only a shortcut to the public Explorer route. It is not the
trust anchor and must not contain private data.

## 2. Minimal on-chain record

```text
documentId    bytes32   stable identifier for this registration
documentHash  bytes32   SHA-256 digest of the original PDF
issuer        address   wallet authorized to register the document
issuedAt      uint64    chain timestamp
revokedAt     uint64    zero while active
metadataHash  bytes32   optional hash of public metadata, not the PDF
```

The contract must reject duplicate `documentId` values and must never allow a
document hash to be silently replaced. A correction creates a new record or a
new document version.

## 3. Contract interface concept

```solidity
function registerDocument(
    bytes32 documentId,
    bytes32 documentHash,
    bytes32 metadataHash
) external;

function revokeDocument(bytes32 documentId) external;

function getDocument(bytes32 documentId)
    external view returns (Document memory);

event DocumentRegistered(
    bytes32 indexed documentId,
    bytes32 indexed documentHash,
    address indexed issuer,
    uint64 issuedAt,
    bytes32 metadataHash
);

event DocumentRevoked(
    bytes32 indexed documentId,
    address indexed issuer,
    uint64 revokedAt
);
```

Only an issuer role may register or revoke. Role administration must be
multisig-controlled or timelocked before production. There is no public mint,
overwrite, or arbitrary issuer field.

## 4. Application flow

```text
Upload PDF
  → validate type, size, and malware policy
  → compute SHA-256 of original bytes
  → create documentId
  → issuer signs/registers hash on Winmar Chain
  → wait for receipt and confirmations
  → generate QR to scan.winmarchain.io/verify/{documentId}
  → append one A4 certificate page
  → return the derived PDF and transaction reference
```

The certificate is generated only after the transaction receipt is confirmed.
If registration fails, the service must not produce a certificate claiming
`VERIFIED ON-CHAIN`.

## 5. Explorer verification route

`/verify/<documentId>` accepts a document upload or local file selection, then
computes SHA-256 in the browser. It displays:

- `VERIFIED ON-CHAIN` only on an exact hash match;
- issuer address and issuer label;
- registration transaction and block;
- issue timestamp and current status;
- `REVOKED` or `HASH MISMATCH` as a prominent failure state.

The route must work without uploading the PDF to the Explorer server. The
browser should compare the local digest with the public chain record.

## 6. Certificate content

The appended A4 page uses the approved single `WINMAR VERIFIED` emblem in the
header, one QR code, document summary, SHA-256 fingerprint, transaction hash,
block, timestamp, issuer wallet, network, and Explorer URL. It must use the
real `.io` domains and never display dummy values in production.

## 7. Security gates before implementation

1. Approve issuer custody and recovery model.
2. Choose PDF parser/merger and enforce upload limits.
3. Define retention and deletion for source PDFs and derived PDFs.
4. Threat-model duplicate IDs, replay, issuer compromise, revocation, and QR
   substitution.
5. Write contract tests for duplicate registration, unauthorized calls,
   revocation, and event contents.
6. Deploy to a non-production environment and verify Explorer reads the exact
   receipt before enabling public uploads.
