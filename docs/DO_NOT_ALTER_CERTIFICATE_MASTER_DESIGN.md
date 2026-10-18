# DO NOT ALTER CERTIFICATE MASTER DESIGN
## Winmar Document Verification — mandatory visual acceptance and release gate

**Status:** DESIGN LOCK — approved by the project owner, 2026-10-19.  
**Applies to:** public self-service issuance and registered-organization/API issuance; desktop, mobile preview, HTML/canvas renderer, official PDF, print and downstream embeds.  
**Source of truth:** the **actual image attached in the project's 2026-10-19 approval conversation**; not a redesigned recreation, an earlier repository approximation or a mock with the same file name.  
**Release disposition:** FAIL CLOSED if visual fidelity to that source of truth cannot be established or if blockchain facts are not validated. This file is a *requirement*, not a claim that the current implementation has passed it.

## 1. Exact approved asset identity and provenance

The project owner explicitly supplied the same approved visual twice. The two attachment PNG files were verified byte-for-byte identical during the approval review.

| Property | Approved value |
| --- | --- |
| Owner-supplied file name | `winmar-verification-certificate-master.png` (also received as `winmar-verification-certificate-master(1).png`) |
| Format | PNG, RGBA 8-bit |
| Exact image dimensions | **1055 × 1491 pixels** (portrait, A4-proportioned) |
| Original approved PNG file size | **2,199,597 bytes** |
| SHA-256 of the original approved PNG bytes | **`e6f621c211c389398377f251c533b522e3f76117c8428624a5e43407ab5fe5d3`** |
| Use | Immutable visual reference; source of all master artwork, branding, type hierarchy and layout |

**Important distinction:** Git **blob SHA-1** and SHA-256 of the PNG file are not interchangeable. Current existing repo master file Git blob is `8cec7607ef4218a3a501b5fac9befbd46f147f03`; its stored byte size (1,582,954) is **different from the approved upload** (2,199,597). Existing repo public illustration is another file and must not be assumed to be the approved master without comparison.

- [ ] **V-001 — PASS** only when the output's underlying master is sourced from the owner-approved PNG, or the repository image has been positively confirmed pixel-for-pixel visually equivalent and signed off by the owner. Matching filename or visual impression alone is not enough.
- [ ] **V-002 — PASS** only when the approved uploaded file's original SHA-256 and 1055×1491 image dimensions are logged in release evidence. If an asset is intentionally re-encoded but visually pixel-identical, document BOTH the original approved SHA-256 and the decoded-pixel comparison result. Otherwise FAIL.
- [ ] **V-003 — FAIL** if image is generated again with AI, redrawn, cropped, recolored, stretched, or replaced without fresh explicit design approval.

**Asset handling:** Do not commit the user's uploaded image as a transformed asset, and do not use a GitHub-version artwork as a substitute until verified. Once the exact approved original image is incorporated through a reviewed authorized asset-upload path, archive its fingerprint in the release manifest and lock changes behind design-owner approval.

## 2. Mandatory sections and exact visual hierarchy (top to bottom)

Keep the complete approved composition, shapes, iconography, spacing, colors and positions.

| Region in approved visual | Must remain unchanged |
| --- | --- |
| Dark navy external border/frame | Same proportions and unobstructed margin around the white page |
| Header left | Original circular **WINMAR VERIFIED / SHA-256 FINGERPRINT** emblem; WINMAR wordmark and `DOCUMENT VERIFICATION` |
| Header middle | Vertical divider and blue **REPORT NO.** / **ISSUE DATE** fields |
| Header right | Bordered QR frame at its **existing upper-right position**, `SCAN TO VERIFY`, and the official `scan.winmarchain.io` domain |
| Primary heading | Exact title **DOCUMENT AUTHENTICITY CERTIFICATE**, large navy type, with thin blue rules above and below |
| Description | Same centered verification statement and light letter spacing |
| Summary panel | Same pale blue outlined **DOCUMENT SUMMARY** box, same label/value grid and lines |
| Verification status | Same pale mint-green panel, check emblem at left, navy **DOCUMENT STATUS**, bold green **VERIFIED ON-CHAIN**, explanatory copy at right and center divider |
| On-chain details | Same blue **BLOCKCHAIN VERIFICATION DETAILS** heading and rule, seven horizontal rows with original icons, blue labels and value positions |
| Explorer row | Same external-link icon, hyperlink, **VIEW ON EXPLORER** treatment and right alignment |
| Bottom separator/footer | Same thin blue rule and three-column footer: **DOCUMENT ID**, **PAGE**, **OFFICIAL DOMAIN**; domain `winmarchain.io` |
| Logos/icons | Original design and artwork only; never resize independently, distort, substitute or reinterpret |

Accepted seven blockchain rows **in the same order**: (1) SHA-256 FINGERPRINT, (2) TRANSACTION HASH, (3) BLOCK NUMBER, (4) TIMESTAMP (UTC), (5) ISSUER WALLET, (6) NETWORK, (7) EXPLORER LINK.

The badge, artwork, status panel, typography hierarchy, background, page crop, column widths and footer are **NOT configurable theme elements**.

## 3. Allowed dynamic content ONLY

Replace sample placeholders at their **existing data positions**, without moving surrounding elements, redrawing sections, altering fonts, or writing over borders/icons:

1. Report No. (short human-readable reference, if generated and accurately associated with on-chain document ID).
2. Issue Date.
3. Document ID / report reference, consistently represented and linked to the immutable on-chain `bytes32 documentId`.
4. Document Type.
5. Subject.
6. Issuer label (must not misrepresent an applicant as an authorized on-chain signer).
7. File Format (PDF / SHA-256 verified after successful proof).
8. SHA-256 of the **original uploaded PDF bytes**, not the merged output PDF.
9. **Document-registration transaction** hash — **NOT payment transaction hash**.
10. Registration block number.
11. Actual registration block timestamp, converted to UTC.
12. Authorized on-chain issuer wallet.
13. Network: **Winmar Chain Mainnet** (chain ID 12142816).
14. Real Explorer verification URL: `https://scan.winmarchain.io/verify/<onChainDocumentId>`.
15. QR payload: exactly the matching verification URL, generated **per document**, in the reserved top-right QR box.
16. Footer Document ID / Page field, subject to the approved original document pagination convention.

**Long-value overflow rule:** Real document hash (`0x` + 64 hex chars) and full transaction hash must never be aggressively compressed to illegible text to force-fit a short `REPORT NO.` or footer field. Use a verified short report reference in short fields, and show full on-chain identifiers only in designated long fields or through the exact Explorer/QR link. Do not alter approved field geometry; any field-size conflict is a release blocker requiring owner approval of a design-compatible data representation.

**No example data in real output.** `WMC-2024-0015837`, `Acme Corporation Ltd.`, example 2024 timestamps/blocks, template transaction hash, and the template QR are **samples only**. Their appearance in a freshly issued certificate means FAIL unless identical to independently verified real data (highly unlikely).

## 4. On-chain security: ZERO unofficial certificates

Both paths have exactly the same issuance security model:

- **Public guest path:** no platform registration; connect wallet, upload PDF, calculate source SHA-256, approve 0.0021 WMC + gas, confirm `FeePaid`, confirm separate authorized document-registration transaction and current hash/issuer/revocation status, then issue PDF.
- **Registered organization path:** approved server-side API key permits website/ERP integration, but **does not waive wallet payment or on-chain registration**.
- A payment success, local SHA-256 calculation, prefilled HTML URL, upload receipt, account registration, or API key is **never** enough to display `VERIFIED ON-CHAIN`.
- **NO** off-chain certificate, mock-verified certificate, provisional `PENDING` official certificate, or sample QR pretending to be real.
- `VERIFIED ON-CHAIN` artwork becomes available only after matching document registration, source hash, authorized issuer, non-revoked status and verified on-chain receipt.
- On failure or timeout, display **pending/error UI OUTSIDE the certificate**, preserving the existing payment transaction and avoiding duplicate fee collection.

## 5. PDF production fidelity

- [ ] **P-001** Original uploaded PDF SHA-256 is calculated BEFORE any output generation.
- [ ] **P-002** Existing original pages remain unchanged (contents and order); no rewriting or inserted logo/footers into original pages.
- [ ] **P-003** Append **exactly one** full A4 portrait certificate page using the approved 1055×1491 image proportions, without crop, stretch, reflow, distortion, replacement fonts, or a new color palette.
- [ ] **P-004** For a 1-page original PDF, final output contains exactly 2 pages; for an N-page original, exactly N+1 pages. The approved certificate's `PAGE` field must use a truthful convention agreed for appended output, not a fixed sample `1 of 1` unless literally accurate.
- [ ] **P-005** Print/preview/desktop/mobile show the same artwork and legible dynamic values; the PDF is independent of browser/session state.
- [ ] **P-006** QR scans from **PDF, print proof and mobile** to the exact Explorer verification URL, not a static template QR.
- [ ] **P-007** The certificate is generated from independently validated backend/on-chain facts; editable URL query parameters by themselves must never be authoritative.
- [ ] **P-008** A certificate for a revoked or mismatched record must not remain presented as currently verified without a fresh verification check.

## 6. Mandatory PASS/FAIL release acceptance criteria

| ID | Category | PASS | FAIL |
| --- | --- | --- | --- |
| D-01 | Artwork | Owner-approved source verified against original SHA-256 or documented pixel-identical image | Different/assumed image |
| D-02 | Layout | Exact frame, header, ruled title, panel, row, divider and footer positions | Any section moved, cropped or removed |
| D-03 | Logo | Original Winmar wordmark and round emblem remain unchanged | Distorted/redrawn/new logo |
| D-04 | Typography | Approved relative sizes, weights, letter-spacing and alignment preserved | Unapproved fonts/reflow |
| D-05 | Color | Same navy, white, electric blue and mint-green status treatment | Changed palette/gradients |
| D-06 | QR | Unique, scannable, exact URL for confirmed document; same top-right box | Sample/static QR; moved or dead URL |
| D-07 | Summary | Fields visible and readable in approved grid, without border collisions | Overlaps, clipping, stretched hashes |
| D-08 | Status | Green **VERIFIED ON-CHAIN** panel only for confirmed active record | Paid-only/pending/revoked shown green |
| D-09 | Blockchain | Source SHA, registration TX, issuer, registration block and UTC timestamp all correct | Placeholder, payment TX in registration row or wrong hash |
| D-10 | Explorer | Live URL and view action resolve the exact document ID | Dead link, wrong network/domain/ID |
| D-11 | Footer | Same three columns and official domain, truthful document/page fields | Missing, moved or example-only footer |
| D-12 | PDF | One appended A4 master page to unchanged source document | Canvas-only, standalone image, altered source PDF |
| D-13 | Public access | No account required, but wallet + fee + on-chain proof required | Forced registration or unpaid/off-chain issuance |
| D-14 | Organization | Approved API access can integrate same paid on-chain issuance | API key used to bypass payment/registration |
| D-15 | Negative paths | Rejected payment, worker delay, mismatched hash and revoked record do not issue an official certificate | Any fail-open or repeat fee request |
| D-16 | Source provenance | Master fingerprint, output comparison and sample issuance evidence stored with PR/release | No reviewable evidence |

A single FAIL or unverified item in D-01 through D-16 blocks release approval. Document all exemptions via an explicit owner-approved revision; do not silently weaken thresholds.

## 7. Practical visual regression test procedure

1. Fetch the **actual owner-approved attachment**, confirm dimensions 1055×1491 and SHA-256 `e6f621c211c389398377f251c533b522e3f76117c8428624a5e43407ab5fe5d3`.
2. Confirm the repository baseline is the exact same approved bytes, or decode both originals and make a **pixel-perfect comparison** (RGBA/channel equality) with explicit owner sign-off for a losslessly re-encoded identical image.
3. Generate an issued certificate using a **test PDF and confirmed registration transaction**, never fabricated blockchain metadata.
4. Render the certificate's A4 page to 1055×1491 with a documented deterministic renderer. Compare the result to the approved master after masking only the **precisely enumerated dynamic value boxes and QR pixel box**. Regions outside those masks MUST match; use justified rendering tolerances only for PDF rasterization antialiasing, not to excuse layout changes.
5. Manually inspect dynamic field legibility, QR scan quality, brand proportions, responsive preview and print. Confirm full hashes/identifiers are available via the on-chain Explorer route even when a short human report number appears on the certificate.
6. Check N→N+1 PDF pagination and retention/deletion behavior. Attach anonymized/sanitized evidence screenshots, diff metrics, sample document/receipt references and approval record to the PR.
7. If any row above fails, **keep PR draft and do not merge or deploy**.

## 8. Owners, change control and record

**Brand/design owner sign-off is mandatory** for any proposed visual change. Changes to allowed data field values do not authorize artwork edits. All teams (developers, Codex, contractors, partners, API integrators) must obey this same approved master. Do not ship an altered certificate under the Winmar name.

Existing integration PR: https://github.com/eriqueedw-star/winmar-chain/pull/42

**Current known implementation gaps (as of this requirement):**

- The repository PNG master/public artwork versions have different binary sizes than the approved supplied original. Exact pixel-level comparison has not yet been completed.
- The repository's certificate page currently renders a browser canvas; it does not yet prove a final PDF is merged with the source pages.
- The developer/API scaffold is not yet confirmed identical to the deployed production backend.
- Existing CI validates intra-repository PNG consistency and PNG metadata, **not** fidelity to the owner-approved uploaded asset. CI green alone cannot close D-01 or D-12.

**This document freezes the design now; it does not falsely claim that the deliverable already passes visual acceptance or has been deployed.**
