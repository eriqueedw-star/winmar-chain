# Winmar Document Verification — Two Access Paths, One On-Chain Standard

**Product decision:** approved by the project owner on 2026-10-19.  
**Status:** authoritative access-model requirement for this integration PR; not proof that the deployed web service or API is feature-complete.  
**Scope:** Winmar Chain Mainnet (Chain ID `12142816`) with the already-deployed DocumentFeePayment and DocumentVerification smart contracts.

## Non-negotiable principle

**Winmar does not issue off-chain document verification certificates.** Registration of an account/organization is optional for users of the public issuance portal, but **registration of the document hash on Winmar Chain is mandatory for every issued certificate**.

A PDF upload, locally computed SHA-256, payment initiation, payment confirmation, QR generation, account creation, or possession of an API key does not alone authorize the words `VERIFIED ON-CHAIN`. Require an independently confirmed on-chain **document registration** with exact original-file hash, non-revoked status, authorized issuer, and transaction/block evidence before releasing the official certificate.

## A. Public self-service — no account registration

1. Open the public Winmar Document Verification portal. **No email login, KYC account, organization registration, or API key is required to use this path.**
2. Connect a supported EVM wallet on Winmar Chain Mainnet, Chain ID `12142816`.
3. Select/upload a PDF and supply the required document description. Calculate SHA-256 of the exact original file bytes **before** producing any derived PDF.
4. Obtain explicit wallet approval for the application fee **0.0021 WMC** payable through the *existing deployed payment contract*. Network gas is additional.
5. Wait for a successful payment transaction receipt and valid `FeePaid` log for the same document ID and fee.
6. The existing authorized backend issuer/receipt worker registers that document ID and hash on `DocumentVerification`. The customer is **not** required to possess an authorized issuer key.
7. Wait for a distinct successful registration transaction, corresponding `DocumentRegistered` event, and current on-chain record with the exact source SHA-256, authorized issuer and `revokedAt = 0`.
8. Only then create the official certificate from the **unmodified, approved visual master**, replacing only runtime data and the QR **at its locked position**. Append one A4 certificate page to a copy of the original PDF. The original source bytes and original pages remain unchanged.
9. Show Explorer verification URL and allow the holder to confirm integrity by recomputing the source PDF hash against the immutable record.

**No payment = no on-chain registration = no official certificate.** If the payment is confirmed but issuance is pending or temporarily fails, retain a pending state and existing transaction reference; **never invite an automatic second fee charge** or return a falsely verified certificate.

## B. Registered organization — API / website integration

1. Organization registers, passes the required business/administrator review and receives an **approved scoped API key**.
2. Organization securely integrates the Winmar Document Verification API **server-to-server** with its website, ERP, customer portal or document management system. Never expose API keys or private signing keys in browser JavaScript.
3. Each API-based document issuance is still a paid **on-chain** transaction tied to a specific original PDF SHA-256/document ID. The API key authenticates the integration; it does **not** replace the payer wallet, on-chain fee, authorized issuer or successful receipt.
4. The API must support a payment-intent/hosted wallet confirmation flow or an independently confirmed pre-paid transaction hash **bound to the exact document ID, wallet, amount, contract and chain**. Do not custody a customer's wallet key or silently charge it.
5. An authorized issuer signs the document registration only after valid payment evidence, and the API returns `VERIFIED ON-CHAIN`, downloadable signed/derived PDF and the Explorer-linked QR **only after** independent on-chain registration confirmation.
6. Per-tenant API scopes, rate limits, authorization, audit logs, idempotency, key rotation/revocation, upload scanning and retention/deletion policies apply. Business registration enables **API/embed access**, not a shortcut around wallet payment or on-chain verification.

The public self-service portal and registered organization's API flow MUST call/use the **same** payment/registration contracts and verification semantics. Avoid forking verification logic or creating a separate off-chain issuance path.

## Immutable certificate visual master

The **user-supplied approved image** is the design authority. Do not redraw, restyle, crop, recolor or replace the logo, badge, title, spacings, borders, typography hierarchy, status panel, QR position, illustration or footer. Existing repository PNG assets must be **pixel/visual-reviewed against the approved upload** before release; similarity by filename is insufficient.

Replace only the data fields at their reserved positions: report/document ID, issue date, document type, subject, issuer (label only when legitimately authorized), source SHA-256, **registration** transaction hash, registration block and true block UTC timestamp, on-chain issuer address, network, Explorer URL, and a unique, machine-readable QR code for that same document ID. Never retain the master image's example QR or sample transaction data in an issued certificate.

The text `VERIFIED ON-CHAIN` is permitted **only** after the documented proof checks pass. Do not generate a visibly official guest-mode `PENDING`, `OFF-CHAIN` or `NOT VERIFIED` certificate as a workaround; show pending state in the portal instead, outside the certificate.

## Payment and issuance lifecycle

```text
public wallet user OR approved API client
  -> original PDF SHA-256
  -> wallet-confirmed 0.0021 WMC application fee (+ chain gas)
  -> successful payment receipt + FeePaid event matching hash and treasury
  -> PENDING_REGISTRATION (payment may be confirmed; certificate unavailable)
  -> authorized issuer registers SHA-256 (separate on-chain transaction)
  -> successful registration receipt + DocumentRegistered event
  -> getDocument(documentId): exact hash, authorized issuer, not revoked
  -> VERIFIED_ON_CHAIN
  -> locked-design A4 certificate appended to unchanged original PDF
  -> per-document QR and Explorer verification route
```

On timeout, network outage, rejected wallet signature, failed payment, worker backlog, or revoked/mismatched record: **fail closed** and show a recoverable error/pending status, with existing transaction references where available. Do not charge again by default. Repeat API calls use idempotency keys and reconcile existing transactions.

## Existing production references (do not redeploy)

- DocumentFeePayment: `0xcEC232bd11F03006ECC80917F5cD55bBf247617D`
- DocumentVerification: `0x53fB6ba2997A50d3ddFfF5395a3BB9b7b24B7AEF`
- Document Verification Treasury: `0x2d26e199f9be1A907239e403c4fad14C0856E7FD`
- Fee: `0.0021 WMC` / `2100000000000000` wei, plus network gas
- Explorer base: `https://scan.winmarchain.io/verify/<documentId>`

These addresses and fee are pinned to the **already-deployed** setup observed in mainnet evidence. Any production change to contract addresses, protocol, fee, treasury, signer or validator fleet requires a separate authorized decision and independent verification.

## Release acceptance gates

- [ ] Public visitor can use wallet/upload/pay/on-chain issuance **without registering a platform account**.
- [ ] Organization can register and obtain reviewed server-side API credentials; embed/API flow requires wallet-paid on-chain registration.
- [ ] Both modes can prove the exact same hash and issuer using the same deployed contracts.
- [ ] Payment receipt alone never triggers `VERIFIED ON-CHAIN` or certificate issuance; pending transactions are recoverable without duplicate fee.
- [ ] Production PDF contains original pages unmodified plus **one** final A4 certificate.
- [ ] Certificate uses the approved image unchanged and a per-document functional QR at the approved coordinate.
- [ ] On-chain registration TX, block, UTC block timestamp, hash, wallet, revocation state and Explorer route validated independently.
- [ ] Live backend API version, receipt worker and Web UI commit mapped to reviewed integration before deployment.
- [ ] CI/security checks pass and release is separately approved; PR must stay draft until blockers clear.
