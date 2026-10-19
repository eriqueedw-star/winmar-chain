#!/usr/bin/env python3
"""Build a Winmar verified A4 certificate ONLY after checking live on-chain proof.

Read-only RPC; no signing, contract deployment, issuer key, payment, or backend
API authentication. Requires the exact approved PNG asset. Produces a new PDF:
the original file remains untouched, the original pages remain visually intact,
and exactly one certificate page is appended. Signed PDFs are rejected because
copying/merging would invalidate their digital signature. Uses permissively
licensed pypdf and ReportLab, not a copyleft document-processing engine.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from approved_master import approve_exact_master

CHAIN_ID = 12142816
RPC_URL = "https://rpc.winmarchain.io/"
PAYMENT_CONTRACT = "0xcec232bd11f03006ecc80917f5cd55bbf247617d"
VERIFICATION_CONTRACT = "0x53fb6ba2997a50d3ddfff5395a3bb9b7b24b7aef"
TREASURY = "0x2d26e199f9be1a907239e403c4fad14c0856e7fd"
FEE_WEI = 2100000000000000
PAY_SELECTOR = "8609cad1"
GET_DOCUMENT_SELECTOR = "b10d6b41"
ISSUER_SELECTOR = "38a7543e"
FEE_EVENT = "0x3e8af3edd4cc6c38e4b22a0110ebdcaa13f693b0954b418c7fddcae70f8f864d"
REG_EVENT = "0x5b89de9f4846bfc83db0a655fd2c69d1a30f49b5f2b09c485c167d39374210f2"
MAX_BYTES = 10 * 1024 * 1024
A4 = (595.27559, 841.88976)
HEX32 = re.compile(r"^0x[0-9a-f]{64}$", re.I)
HEX20 = re.compile(r"^0x[0-9a-f]{40}$", re.I)


def require(value, message):
    if not value:
        raise ValueError(message)


def norm(value):
    return str(value or "").lower()


def indexed(address):
    require(HEX20.fullmatch(address or ""), "Invalid address")
    return "0x" + address.lower()[2:].rjust(64, "0")


class PublicRpc:
    """Pinned read-only Winmar Chain mainnet RPC; accepts no operator URL override."""

    def __init__(self):
        self.counter = 0

    def __call__(self, method, params=None):
        self.counter += 1
        query = json.dumps({"jsonrpc": "2.0", "id": self.counter,
                            "method": method, "params": params or []}).encode()
        request = urllib.request.Request(RPC_URL, data=query,
                                         headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=25) as response:
            require(response.status == 200, "Winmar Chain RPC returned non-200")
            result = json.load(response)
        require(not result.get("error"), "RPC error / verification unavailable")
        require("result" in result, "RPC result missing")
        return result["result"]


def receipt_ok(receipt, address):
    return (isinstance(receipt, dict) and norm(receipt.get("status")) == "0x1"
            and norm(receipt.get("to")) == address)


def get_words(result, count):
    if not isinstance(result, str) or not re.fullmatch(
        r"0x[0-9a-f]{" + str(count * 64) + r"}", result, re.I
    ):
        raise ValueError("Unregistered document or unexpected smart contract ABI")
    return [result[2 + i*64:2 + (i+1)*64].lower() for i in range(count)]


def verify_document(rpc, document_id, payment_tx):
    """Use actual fee receipt + event AND separate document registration proof."""
    require(HEX32.fullmatch(document_id or ""), "Invalid SHA-256 document ID")
    require(HEX32.fullmatch(payment_tx or ""), "Invalid payment transaction reference")
    document_id = document_id.lower()
    require(int(rpc("eth_chainId"), 16) == CHAIN_ID, "Wrong chain ID")

    payment = rpc("eth_getTransactionReceipt", [payment_tx])
    require(receipt_ok(payment, PAYMENT_CONTRACT),
            "Payment not confirmed to correct contract (do not pay again automatically)")
    paid_call = rpc("eth_getTransactionByHash", [payment_tx])
    require(isinstance(paid_call, dict), "Payment transaction unavailable")
    require(norm(paid_call.get("to")) == PAYMENT_CONTRACT, "Wrong payment contract")
    require(HEX20.fullmatch(paid_call.get("from", "")), "Invalid payer wallet")
    require(int(paid_call.get("value", "0"), 16) == FEE_WEI, "Wrong payment value")
    require(norm(paid_call.get("input")) == "0x" + PAY_SELECTOR + document_id[2:],
            "Payment calldata not bound to original PDF digest")
    payer = norm(paid_call["from"])
    fee_log = any(
        norm(log.get("address")) == PAYMENT_CONTRACT and
        [norm(t) for t in log.get("topics", [])] ==
          [FEE_EVENT, document_id, indexed(payer), indexed(TREASURY)] and
        int(log.get("data", "0"), 16) == FEE_WEI
        for log in payment.get("logs", [])
    )
    require(fee_log, "FeePaid event does not match source document, treasury or amount")

    result = rpc("eth_call", [{
        "to": VERIFICATION_CONTRACT,
        "data": "0x" + GET_DOCUMENT_SELECTOR + document_id[2:]
    }, "latest"])
    words = get_words(result, 5)
    require("0x" + words[0] == document_id, "On-chain original PDF SHA-256 mismatch")
    require(words[1][:24] == "0" * 24, "Malformed issuer wallet")
    issuer = "0x" + words[1][-40:]
    require(issuer != "0x" + "0" * 40, "Missing issuer wallet")
    issued_at = int(words[2], 16)
    revoked_at = int(words[3], 16)
    require(issued_at > 0 and revoked_at == 0, "Document unissued or REVOKED")

    is_issuer = rpc("eth_call", [{
        "to": VERIFICATION_CONTRACT,
        "data": "0x" + ISSUER_SELECTOR + issuer[2:].rjust(64, "0")
    }, "latest"])
    require(int(is_issuer, 16) == 1, "Issuer not currently authorized")

    latest = int(rpc("eth_blockNumber"), 16)
    lower = int(payment.get("blockNumber", "0x0"), 16)
    require(0 <= lower <= latest, "Invalid payment block / chain state")
    # Query in bounded chunks to avoid RPC provider range limits.
    match = None
    topics = [REG_EVENT, document_id, document_id, indexed(issuer)]
    for first in range(lower, latest + 1, 500):
        last = min(first + 499, latest)
        logs = rpc("eth_getLogs", [{
            "address": VERIFICATION_CONTRACT,
            "fromBlock": hex(first), "toBlock": hex(last),
            "topics": topics
        }])
        for log in logs:
            if norm(log.get("address")) != VERIFICATION_CONTRACT or [
                norm(t) for t in log.get("topics", [])] != topics:
                continue
            tx_hash = log.get("transactionHash")
            if not HEX32.fullmatch(tx_hash or ""):
                continue
            registration = rpc("eth_getTransactionReceipt", [tx_hash])
            if not receipt_ok(registration, VERIFICATION_CONTRACT):
                continue
            if norm(registration.get("blockHash")) != norm(log.get("blockHash")):
                continue
            found = any(
                norm(r.get("address")) == VERIFICATION_CONTRACT and
                [norm(t) for t in r.get("topics", [])] == topics
                for r in registration.get("logs", [])
            )
            if not found:
                continue
            tx = rpc("eth_getTransactionByHash", [tx_hash])
            require(norm(tx.get("from")) == issuer, "Registration not signed by on-chain issuer")
            match = {"hash": tx_hash, "block": registration["blockNumber"]}
            break
        if match:
            break
    require(match is not None, "Payment confirmed; document registration still pending")

    block = rpc("eth_getBlockByNumber", [match["block"], False])
    require(isinstance(block, dict) and int(block.get("timestamp", "0x0"), 16) == issued_at,
            "On-chain registration timestamp mismatch")
    return {
        "document_id": document_id, "sha256": document_id[2:],
        "payment_tx": payment_tx, "registration_tx": match["hash"],
        "block_number": int(match["block"], 16), "timestamp": issued_at,
        "issuer_wallet": issuer,
        "verification_url": "https://scan.winmarchain.io/verify/" + document_id,
    }


def clean(value, max_length=160):
    value = str(value or "").strip()
    require(value and len(value) <= max_length and not any(ord(c) < 32 for c in value),
            "Missing or invalid document metadata")
    return value


def make_certificate_image(master_bytes, evidence, title, subject, issuer, page_number):
    """Modify only sample data positions on the exact owner-approved PNG."""
    from PIL import Image, ImageDraw, ImageFont
    import qrcode

    image = Image.open(io.BytesIO(master_bytes)).convert("RGBA")
    # Text replacement is restricted to approved sample-data rectangles.
    # Use an opaque, approved panel tone: sampling neighbouring rows can copy
    # anti-aliased pixels from the master sample text back into a new record.
    # Never fill a section border or static icon.
    def clear_dynamic(box):
        x0,y0,x1,y1=box
        # Approved static dividers at 533/577/622/668/713 must remain.
        # A prior blanket +35px expansion erased table separator lines.
        summary_rules = (533, 534, 577, 578, 622, 623, 668, 713)
        if 480 <= y0 < 752 and any(y0 <= rule < y1 for rule in summary_rules):
            raise ValueError("Summary dynamic area overlaps approved table rules")
        ImageDraw.Draw(image).rectangle((x0, y0, x1 - 1, y1 - 1), fill="#f7fbff")

    def font(size, bold=False):
        # The browser renderer uses Arial. Resolve the same reviewed family on
        # Windows, then the existing Linux CI families. Never silently fall
        # back to an arbitrary system font.
        names = []
        if sys.platform.startswith("win"):
            names.append(str(Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")))
        names.extend(("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
                      "LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf"))
        for name in names:
            try:
                return ImageFont.truetype(name,size)
            except OSError:
                pass
        raise RuntimeError("Font unavailable; do not substitute an unreviewed font")

    ink="#15235c"
    draw = ImageDraw.Draw(image)
    def write(box, value, size=16, bold=False, color=ink, max_width=None):
        clear_dynamic(box)
        use=font(size,bold)
        x0,y0,x1,y1=box
        text=str(value)
        limit=max_width or (x1-x0-4)
        while draw.textlength(text,font=use) > limit and size > 10:
            size-=1
            use=font(size,bold)
        require(draw.textlength(text,font=use) <= limit,
                "Dynamic value does not fit locked approved layout")
        y=y0+max(0,(y1-y0-size)//2)-2
        draw.text((x0+1,y),text,font=use,fill=color)

    timestamp=datetime.fromtimestamp(evidence["timestamp"],tz=timezone.utc)
    short_id="WMC-"+str(timestamp.year)+"-"+evidence["sha256"][:12].upper()
    issue_date=timestamp.strftime("%Y-%m-%d")
    utc_date=timestamp.strftime("%Y-%m-%d %H:%M:%S")
    write((567,113,782,140),short_id,15,bold=True)
    write((567,185,778,211),issue_date,16,bold=True)
    write((340,490,907,526),short_id,17,bold=True)
    write((340,536,907,572),title,17)
    write((340,580,907,617),subject,17)
    write((340,625,907,662),issuer,15,bold=True)
    write((340,670,907,706),issue_date,17)
    write((340,716,907,751),"PDF (SHA-256 Verified)",17)

    sha=evidence["sha256"].upper()
    clear_dynamic((348,989,897,1029))
    draw.text((349,989),sha[:32],font=font(15),fill="#32468e")
    draw.text((349,1008),sha[32:],font=font(15),fill="#32468e")
    write((348,1049,898,1075),evidence["registration_tx"],12)
    write((348,1089,898,1118),"#"+str(evidence["block_number"]),17)
    write((348,1132,898,1161),utc_date,16)
    write((348,1175,898,1205),evidence["issuer_wallet"],14)
    write((348,1217,898,1250),"Winmar Chain Mainnet",17)
    # QR stores the complete canonical route; the fixed, single-line artwork
    # can only carry a short human-readable reference without redesigning it.
    display_url = "scan.winmarchain.io/verify/" + evidence["sha256"][:10] + "..."
    write((349,1265,768,1298),display_url,11,color="#086cfa")
    write((98,1377,348,1409),short_id,16,bold=True)
    write((487,1377,640,1409),str(page_number)+" of "+str(page_number),17,bold=True)

    qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,border=0)
    qr.add_data(evidence["verification_url"])
    qr.make(fit=True)
    code=qr.make_image(fill_color="black",back_color="white").convert("RGBA")
    code=code.resize((110,110),Image.Resampling.NEAREST)
    # The frame, SCAN TO VERIFY label, logo and footer remain from the master.
    image.paste(code,(831,83))
    return image


def build_pdf(source_path, master_path, output_path, payment_tx, document_type, subject, issuer):
    # Do NOT produce official output unless the owner-approved exact source
    # is installed and live blockchain state is independently checked.
    master = approve_exact_master(master_path)
    original = Path(source_path).read_bytes()
    require(0 < len(original) <= MAX_BYTES and original.startswith(b"%PDF-"),
            "Source PDF missing, malformed or exceeds maximum 10 MB")
    doc_id = "0x" + hashlib.sha256(original).hexdigest()
    evidence = verify_document(PublicRpc(), doc_id, payment_tx)
    # pypdf (BSD) + ReportLab (BSD), rather than a copyleft PDF engine.
    # Copy original pages into a NEW document without editing their content.
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    reader = PdfReader(io.BytesIO(original), strict=True)
    require(not reader.is_encrypted and 0 < len(reader.pages) <= 500,
            "Unreadable, encrypted or excessive-page source PDF")
    fields = reader.get_fields() or {}
    is_signed = any(str(field.get("/FT")) == "/Sig" for field in fields.values())
    require(not is_signed and b"/ByteRange" not in original,
            "Signed source PDF cannot be appended without invalidating its signature")

    page_number = len(reader.pages) + 1
    artwork = make_certificate_image(
        master, evidence, clean(document_type), clean(subject), clean(issuer), page_number)
    image_bytes = io.BytesIO()
    artwork.save(image_bytes, format="PNG", optimize=True)
    certificate_pdf = io.BytesIO()
    painter = canvas.Canvas(certificate_pdf, pagesize=A4, pageCompression=1)
    painter.drawImage(ImageReader(io.BytesIO(image_bytes.getvalue())),
                      0, 0, width=A4[0], height=A4[1], mask="auto")
    painter.showPage()
    painter.save()
    certificate_pdf.seek(0)

    writer = PdfWriter()
    writer.append(reader, import_outline=False)
    single_page = PdfReader(certificate_pdf, strict=True)
    require(len(single_page.pages) == 1, "Expected exactly one certificate page")
    writer.add_page(single_page.pages[0])
    require(len(writer.pages) == page_number, "PDF page-count invariant failed")
    dest = Path(output_path)
    require(dest.resolve() != Path(source_path).resolve(), "Cannot overwrite the source document")
    require(not dest.exists(), "Output path already exists; refusing overwrite")
    dest.parent.mkdir(parents=True, exist_ok=True)
    # Caller owns the output directory and retention; no remote PDF upload occurs.
    with dest.open("xb") as handle:
        writer.write(handle)
    return {"output":str(output_path),"pages":page_number,"sha256":doc_id,"registrationTx":evidence["registration_tx"]}


def main():
    parser=argparse.ArgumentParser(description="Issue a verified Winmar A4 certificate appended to original PDF")
    parser.add_argument("--source-pdf",required=True)
    parser.add_argument("--approved-master",required=True)
    parser.add_argument("--payment-tx",required=True)
    parser.add_argument("--document-type",required=True)
    parser.add_argument("--subject",required=True)
    parser.add_argument("--issuer",required=True)
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    result=build_pdf(args.source_pdf,args.approved_master,args.output,
                     args.payment_tx,args.document_type,args.subject,args.issuer)
    print(json.dumps(result,indent=2))


if __name__ == "__main__":
    main()
