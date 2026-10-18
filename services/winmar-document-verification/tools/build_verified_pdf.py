#!/usr/bin/env python3
"""Build a Winmar verified A4 certificate ONLY after checking live on-chain proof.

Read-only RPC; no signing, contract deployment, issuer key, payment, or backend
API authentication. Requires the exact approved PNG asset. Produces a new PDF:
the original file remains untouched, the original pages remain visually intact,
and exactly one certificate page is appended. Signed PDFs are rejected because
copying/merging would invalidate their digital signature.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
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


def make_certificate_image(master_bytes, evidence, title, subject, page_number):
    """Modify only sample data positions on the exact owner-approved PNG."""
    from PIL import Image, ImageDraw, ImageFont
    import qrcode

    image = Image.open(io.BytesIO(master_bytes)).convert("RGBA")
    # Text replacement is restricted to approved sample-data rectangles.
    # Smoothly interpolate each rectangle's background from intact top/bottom
    # neighboring rows; never fill a section border or static icon.
    def clear_dynamic(box):
        x0,y0,x1,y1=box
        for y in range(y0,y1):
            scale=(y-y0+1)/(y1-y0+1)
            for x in range(x0,x1):
                a=image.getpixel((x,y0-2))
                b=image.getpixel((x,y1+2))
                image.putpixel((x,y),tuple(round(a[c]*(1-scale)+b[c]*scale) for c in range(4)))

    def font(size, bold=False):
        for name in (("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
                     ("LiberationSans-Bold.ttf" if bold else "LiberationSans-Regular.ttf")):
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
    write((340,483,907,513),short_id,17,bold=True)
    write((340,526,907,558),title,17)
    write((340,571,907,600),subject,17)
    write((340,614,907,643),"Authorized Winmar Chain Issuer",15,bold=True)
    write((340,658,907,688),issue_date,17)
    write((340,702,907,728),"PDF (SHA-256 Verified)",17)

    sha=evidence["sha256"].upper()
    clear_dynamic((348,954,897,994))
    draw.text((349,954),sha[:32],font=font(15),fill="#32468e")
    draw.text((349,973),sha[32:],font=font(15),fill="#32468e")
    write((348,1014,898,1040),evidence["registration_tx"],12)
    write((348,1054,898,1083),"#"+str(evidence["block_number"]),17)
    write((348,1097,898,1126),utc_date,16)
    write((348,1140,898,1170),evidence["issuer_wallet"],14)
    write((348,1182,898,1215),"Winmar Chain Mainnet",17)
    # Keep the original Explorer button and its icon; only replace link text.
    write((349,1230,768,1263),evidence["verification_url"],11,color="#086cfa")
    write((98,1342,348,1374),short_id,16,bold=True)
    write((487,1342,640,1374),str(page_number)+" of "+str(page_number),17,bold=True)

    qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,border=0)
    qr.add_data(evidence["verification_url"])
    qr.make(fit=True)
    code=qr.make_image(fill_color="black",back_color="white").convert("RGBA")
    code=code.resize((110,110),Image.Resampling.NEAREST)
    # The frame, SCAN TO VERIFY label, logo and footer remain from the master.
    image.paste(code,(831,83))
    return image


def build_pdf(source_path, master_path, output_path, payment_tx, document_type, subject):
    # Do NOT produce official output unless the owner-approved exact source
    # is installed and live blockchain state is independently checked.
    master = approve_exact_master(master_path)
    original = Path(source_path).read_bytes()
    require(0 < len(original) <= MAX_BYTES and original.startswith(b"%PDF-"),
            "Source PDF missing, malformed or exceeds maximum 10 MB")
    doc_id = "0x" + hashlib.sha256(original).hexdigest()
    evidence = verify_document(PublicRpc(), doc_id, payment_tx)
    import fitz
    source = fitz.open(stream=original,filetype="pdf")
    try:
        require(not source.is_encrypted and 0 < source.page_count <= 500,
                "Unreadable, encrypted or excessive-page source PDF")
        require(not source.get_sigflags(), "Digitally signed source PDF cannot be merged without invalidating its signature")
        page_number=source.page_count+1
        artwork=make_certificate_image(master,evidence,clean(document_type),clean(subject),page_number)
        image_bytes=io.BytesIO()
        artwork.save(image_bytes,format="PNG",optimize=True)
        result=fitz.open()
        try:
            result.insert_pdf(source)
            page=result.new_page(width=A4[0],height=A4[1])
            page.insert_image(page.rect,stream=image_bytes.getvalue(),keep_proportion=False)
            require(result.page_count == page_number, "PDF page-count invariant failed")
            dest=Path(output_path)
            require(dest.resolve() != Path(source_path).resolve(), "Cannot overwrite the source document")
            require(not dest.exists(), "Output path already exists; refusing overwrite")
            dest.parent.mkdir(parents=True,exist_ok=True)
            # No incremental update; write a new independently named output.
            result.save(str(dest),garbage=3,deflate=True)
        finally:
            result.close()
    finally:
        source.close()
    return {"output":str(output_path),"pages":page_number,"sha256":doc_id,"registrationTx":evidence["registration_tx"]}


def main():
    parser=argparse.ArgumentParser(description="Issue a verified Winmar A4 certificate appended to original PDF")
    parser.add_argument("--source-pdf",required=True)
    parser.add_argument("--approved-master",required=True)
    parser.add_argument("--payment-tx",required=True)
    parser.add_argument("--document-type",required=True)
    parser.add_argument("--subject",required=True)
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    result=build_pdf(args.source_pdf,args.approved_master,args.output,
                     args.payment_tx,args.document_type,args.subject)
    print(json.dumps(result,indent=2))


if __name__ == "__main__":
    main()
