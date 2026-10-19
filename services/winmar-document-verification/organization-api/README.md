# Winmar Chain — Organization Document Verification API

**Status:** isolated draft implementation for review and staging. **NOT deployed, NOT production-ready, and NOT an issuer service.** Designed as a parallel workstream to [PR #42](https://github.com/eriqueedw-star/winmar-chain/pull/42), where Codex is handling approved certificate assets/UI.

## Product decision: one blockchain standard, two access paths

- **Public portal, no registration:** connect EVM wallet, upload the original PDF, pay **0.0021 WMC + gas**, confirm `FeePaid`, wait for separately authorized `DocumentRegistered`, then generate the exact owner-approved certificate and QR.
- **Organization account (API access):** after business approval, an organization obtains scoped backend-only API credentials for its own website/ERP. Its customers still connect a wallet, approve the same fee and obtain the **same** independently confirmed on-chain document registration. API credentials are **not** payment authority or issuer authorization.

**No off-chain official certificate.** Payment alone is never verification. This API does not sign, send an on-chain transaction, deploy contracts or generate a PDF; it records and checks existing blockchain evidence, reporting `certificateIssued:false` even after a registry record is confirmed. The official PDF is handled only by an independently reviewed owner-approved rendering workflow.

## Service endpoints

All `/v1/` routes require `Authorization: Bearer <api-key>` from an approved **server-side** client. Do **not** embed this key in JavaScript on a company's public website. No browser CORS is enabled.

| Method/path | Required scope | Description |
| --- | --- | --- |
| `GET /healthz` | None | Liveness only, **not** production readiness |
| `POST /v1/intents` | `verification:intents:create` | Body: original PDF bytes, `Content-Type: application/pdf`, `Idempotency-Key` (12–128 safe chars), `X-Payer-Wallet`. Returns original source SHA-256/document ID, contract, chain ID, exact fee. Original bytes discarded, not stored. |
| `POST /v1/intents/:id/confirm` | `verification:intents:confirm` | JSON body: `{"paymentTxHash":"0x...","registrationTxHash":"0x..."}` (registration TX optional when still pending). Independently verifies paid fee, payer, contract, topics, separately authorized registration and current revocation state. HTTP 202 pending or 200 registered. **Never issues PDF.** |
| `GET /v1/intents/:id` | `verification:intents:read` | Tenant-isolated, read-only current record reconciliation against Winmar Chain; never returns a falsely verified certificate. |

**Proof semantics:** each intent is pinned to the full original document SHA-256 and payer wallet. Confirming the payment proves only the application fee; confirming the separate authorized registration proves that a hash was recorded. The PDF held by the verifier must still be hashed against that record. A registry record is not a guarantee that the text of a document is legally accurate.

### Chain identity and non-configurable invariants

- Chain ID `12142816` (`0xb948e0`)
- Deployed payment contract `0xcEC232bd11F03006ECC80917F5cD55bBf247617D`
- Deployed registry `0x53fB6ba2997A50d3ddFfF5395a3BB9b7b24B7AEF`
- Fee `0.0021 WMC` = `2100000000000000 wei` plus gas
- Treasury `0x2d26e199f9be1A907239e403c4fad14C0856E7FD`
- Explorer verification URL `https://scan.winmarchain.io/verify/<documentId>`

This reference implementation never modifies these contracts or settings.

## Running isolated local tests

Requires Node.js 22+. There are **no external runtime dependencies**.

```bash
cd services/winmar-document-verification/organization-api
npm test
npm run check
```

Create a cryptographically random API key offline (256-bit random, base64url) and retain it only in an approved secret manager. The server accepts `WINMAR_ORG_API_CLIENTS` as a privately configured JSON array:

```json
[
  {
    "id": "example_org",
    "keySha256": "<64-hex-sha256-of-random-api-key>",
    "status": "approved",
    "scopes": [
      "verification:intents:create",
      "verification:intents:read",
      "verification:intents:confirm"
    ]
  }
]
```

Use a **private absolute directory** in `WINMAR_ORG_API_STATE_DIR`, e.g. `/var/lib/winmar/org-document-api`. Example configuration file `.env.example` contains no actual credentials. The server listens only on `127.0.0.1:8771` and requires an approved HTTPS reverse proxy to provide organization access. **Never expose the backend port directly or run this reference service on the public internet.**

## Safety and release blockers

- **No tenant self-onboarding yet.** An administrator must review legal/business identity and approve/revoke every organization. Keys are issued and rotated via an approved private channel.
- The reference filesystem store supports only **one** process/instance; its local rate limit and intent locking are **not** multi-node-safe. Production requires a transactional database, disaster recovery, verified backups, central rate limiting, logging and tenant-level quotas.
- The PDF body has an upload byte limit and `%PDF-` prefix check, **not** a full PDF parser or malware scan. Add sandboxed PDF validation, malware scanning, secure retention and privacy controls before any production paid issuance.
- The org API does **not** have an authorization channel to ask the live issuer/receipt worker to register hashes; receipt registration is checked through user-supplied or future server-supplied transaction hashes. Integrate through separately reviewed backend channels only; no issuer private keys in the API.
- The original owner-approved certificate PNG has a locked SHA-256 `e6f621c211c389398377f251c533b522e3f76117c8428624a5e43407ab5fe5d3`. This API does not modify that file and **cannot** issue PDF output itself.
- The Explorer `/verify/<documentId>` URL was previously observed returning 404. Treat QR/Explorer production routing and iOS/Android scan testing as release blockers until independently confirmed live.
- Validate the real running smart-contract ABI/runtime, worker identity, payer accounting, signer role, source PDF integrity, and production deployment snapshot before connecting to any customer-facing experience.
- Do not publish private keys, user PDFs, tenant credentials, reconciliation logs, or private operational configurations.

## Parallel work instructions

**Codex:** Continue PR #42's original PNG upload, owner-approved certificate pixel fidelity, browser PDF, and Explorer verification UI.

**Organization API branch:** This code is intentionally isolated under `services/winmar-document-verification/organization-api/` and should be reviewed as a **separate draft PR based on main**. Do not merge or deploy either PR automatically. After code review, explicitly map the contract of this API to the exact live Document Verification issuer worker, then finish organization onboarding, entitlement management, rate controls, issuer callback/inbox, and real end-to-end tests.

**No deployment, wallet transaction, smart-contract change, treasury change, validator change, or production hosting change is authorized by this PR.**
