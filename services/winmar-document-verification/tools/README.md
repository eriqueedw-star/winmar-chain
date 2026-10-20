# Winmar Verified PDF — approval-gated local assembly

**Status:** isolated review implementation for draft PR #42; **not a live production API, not integrated with the public web download button, and not a substitute for the approved visual QA.** No wallet signing, private keys, automatic charges or smart-contract deployments are performed.

## Approved visual master is mandatory

Only use the **exact project-owner-uploaded approved PNG**, not an image with a similar file name:

| Property | Locked value |
| --- | --- |
| Format | RGBA PNG, 1055 × 1491 pixels |
| Original file size | 2,199,597 bytes |
| SHA-256 | `e6f621c211c389398377f251c533b522e3f76117c8428624a5e43407ab5fe5d3` |

`approved_master.py` rejects the currently imported Codex PNG master because its content does not match the approved attachment. **This fail-closed gate is intentional.** The original approved attachment must be provisioned to a secure release/artifact path before the generator can produce output. Do not regenerate, redesign or silently use an older repo asset.

Check the original:

```bash
python3 tools/approved_master.py /secure/input/winmar-verification-certificate-master.png
```

## Local controlled usage

The Python generator requires `pypdf`, `ReportLab`, `Pillow` and `qrcode`, pinned in `tools/requirements-pdf.txt`. These are separate from the Node API scaffold.

```bash
python3 -m pip install -r services/winmar-document-verification/tools/requirements-pdf.txt
python3 services/winmar-document-verification/tools/build_verified_pdf.py \
  --source-pdf /secure/input/original.pdf \
  --approved-master /secure/input/winmar-verification-certificate-master.png \
  --payment-tx 0x<64-character-confirmed-transaction-hash> \
  --document-type "Business Document" \
  --subject "Example Corporation" \
  --output /secure/output/certified-document.pdf
```

**All of these conditions must pass before any output file is created:**

1. Exact approved master SHA-256, byte size, format and dimensions.
2. Original PDF exists, is valid and below the 10 MB upload limit.
3. SHA-256 is calculated from the **original PDF**, not from the derived output.
4. Read-only mainnet RPC `eth_chainId` agrees with chain ID 12142816.
5. Successful fee contract receipt, correct fee amount (0.0021 WMC), payer, treasury, and `FeePaid` log all agree with the original PDF SHA-256.
6. A **separate successful** document-registration receipt and event proves the same source hash, current issuer authorization and non-revoked document state.
7. The contract-record UTC timestamp matches the registration block timestamp.
8. The PDF source is not encrypted, signed or unsupported; signed PDFs are rejected because their signatures would not survive append/copy.
9. Generator builds a **new** PDF containing the original page objects plus one A4 certificate page. Source file is never overwritten; destination overwrite is forbidden.

The QR is regenerated for the exact `https://scan.winmarchain.io/verify/<documentId>`. The sample QR from the owner-approved artwork is not reused.

### Security notes and review blockers

- This CLI is **not** the production API/tenant flow. It must be wired to the separately reviewed issuer/receipt worker, organization authorization and protected file-handling service. It does not make a payment or register a hash; those actions must already have occurred on Winmar Chain.
- The public `certificate.html` canvas renderer still requires an end-to-end source-PDF binding audit; a query-string URL cannot substitute for having the actual original PDF.
- Applicant-supplied document type and subject are **descriptive only**. Current on-chain source proof authenticates the PDF hash, not the legal truth of its contents, organization ownership or every metadata label.
- The raster field overlay uses fixed owner-approved coordinates with replacement only inside sample-value regions. It requires a **pixel/visual regression review** of typography, legibility, lines and QR against the approved uploaded original. It is not auto-approved just because CI tests pass.
- PDF processing should occur only after malware checks, retention/deletion policy and resource quotas are deployed; otherwise reject unknown uploads.
- Do not commit real customer PDF files, generated customer certificates, signing keys, source PDF content, or confidential issuer-infrastructure evidence to the public repository.
- External RPC connectivity is read-only. If it times out, returns errors or cannot establish a current on-chain record, fail closed and preserve the original payment reference for support. Never advise a second fee payment solely because receipt processing is delayed.
- Any change to contract/fee/treasury requires explicit separate authorization and does not belong in this rendering PR.

## Verification tests

```bash
python3 -m unittest discover -s services/winmar-document-verification/tests -p 'test_*.py' -v
```

See `docs/DO_NOT_ALTER_CERTIFICATE_MASTER_DESIGN.md` for the mandatory 16 design/chain PASS/FAIL gates.
