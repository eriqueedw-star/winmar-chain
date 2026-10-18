# Winmar Verification Standard

Status: Approved baseline  
Scope: Winmar Document Verification  
Network: Winmar Chain Mainnet (`12142816`)

The supplied `winmar-verification-certificate-master.png` is the pixel-locked
visual master. Implementations must preserve its layout, spacing, colors,
icons, QR position, field order, and footer. Only verified runtime values may
replace the sample field values.

## 1. Source document policy

- The uploaded PDF is preserved byte-for-byte as the source document.
- The original pages are not rewritten and do not receive per-page footers by default.
- The system appends exactly one A4 verification certificate page.
- The source PDF is hashed with SHA-256 before any derived output is created.
- The source PDF must pass file type, size, and malware-policy checks.

## 2. Verification certificate

The appended A4 page must contain:

- One approved `WINMAR VERIFIED` emblem in the header.
- Winmar Chain letterhead and the standard white Winmar footer.
- Document ID.
- SHA-256 fingerprint of the original PDF.
- Issuer wallet and issuer label.
- Registration transaction hash.
- Payment transaction hash when applicable.
- Block number and chain timestamp. The timestamp must come from the mined block, be
  converted to UTC, and be rendered as `YYYY-MM-DD HH:mm:ss UTC` (for example,
  `2026-10-18 14:26:39 UTC`). Browser time, local machine time, and PDF-generation
  time must never be used as a substitute.
- Network and chain ID.
- Explorer verification URL.
- One QR code linking to the public verification route.

The certificate must never show placeholder values as live verification data.

## 3. QR and verification URL

The QR contains only the public verification URL:

```text
https://scan.winmarchain.io/verify/<documentId>
```

The QR is a convenience link, not the trust anchor. The Explorer verification
page must independently resolve the on-chain record and compare:

1. The locally computed SHA-256 digest.
2. The immutable on-chain document hash.
3. The document ID.
4. The authorized issuer wallet.
5. The registration transaction and block.
6. The current record status, including revocation.

Only an exact match may display `VERIFIED ON-CHAIN`. Mismatch and revoked
records must be prominent failure states.

## 4. On-chain record

The minimum record is:

```text
documentId    bytes32
documentHash  bytes32
issuer        address
issuedAt      uint64
revokedAt     uint64
metadataHash  bytes32
```

Duplicate document IDs must be rejected. Existing hashes must never be silently
overwritten. Corrections create a new document version or record.

## 5. Issuance flow

```text
Connect wallet
  -> Upload PDF
  -> Compute SHA-256
  -> Confirm 0.0021 WMC application fee
  -> Wait for payment receipt
  -> Authorized issuer registers the hash
  -> Wait for verification receipt and confirmations
  -> Generate the appended A4 certificate
  -> Return the derived PDF and QR verification URL
```

The system must not produce a certificate claiming `VERIFIED ON-CHAIN` before
the verification transaction is confirmed.

## 6. Custody and security

- Customer wallets pay the application fee and network gas.
- The Document Verification Treasury receives the application fee:
  `0x2d26e199f9be1A907239e403c4fad14C0856E7FD`.
- The issuer signer is separate from the customer wallet and must be held in a
  protected secret environment or KMS/HSM.
- Private keys, seed phrases, and passwords must never be stored in the repo,
  PDF, QR, database logs, or browser storage.
- Source PDFs and derived PDFs require an explicit retention and deletion policy.

## 7. Production gate

Before public issuance is enabled, verify:

- Contract addresses and chain ID are pinned in configuration.
- Issuer authorization is confirmed on-chain.
- Receipt worker handles retries and duplicate events idempotently.
- Contract tests cover unauthorized calls, duplicate registration, revocation,
  and event contents.
- The Explorer route resolves the exact record and hash.
- QR scanning opens the real `.io` verification route.
- A full test document has been issued, downloaded, rescanned, and verified.
