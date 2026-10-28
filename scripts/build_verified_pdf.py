from io import BytesIO
from pathlib import Path
from datetime import datetime, timezone

import qrcode
from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output' / 'pdf' / 'winmar-chain-fee-mechanism.pdf'
MASTER = ROOT / 'assets' / 'winmar-verification-certificate-master.png'
OUTPUT = ROOT / 'output' / 'pdf' / 'winmar-chain-fee-mechanism-verified-test.pdf'

DOCUMENT_ID = '0x477a80f1f39d85e3b746f621a5271a17c3aa1b6adc9d88401cc7bbf58ae209fc'
SHA256 = DOCUMENT_ID[2:]
ISSUER = '0x853a35B5318FD219eBf98B2a12Ca346A9853D975'
PAYMENT_TX = '0x7262d0c54da9d32d88be4cef11c6cb191ef627b639967f4eaf4a18f101325e65'
VERIFICATION_TX = '0xbe95962ea545e9fd714e2dc971bd8300dba5c7da52e2aa6cfebb509a7ffbfb68'
BLOCK = '781524'
CHAIN_ID = '12142816'
NETWORK = 'Winmar Chain Mainnet'
VERIFY_URL = f'https://scan.winmarchain.io/verify/{DOCUMENT_ID}'

NAVY = colors.HexColor('#071d4b')
BLUE = colors.HexColor('#1769ff')
MUTED = colors.HexColor('#5d6c9d')
LINE = colors.HexColor('#cfe0fa')
GREEN = colors.HexColor('#059447')
LIGHT_BLUE = colors.HexColor('#f3f8ff')


def make_emblem():
    image = Image.open(MASTER).convert('RGB')
    # The approved emblem is the circular mark in the upper-left of the master.
    crop = image.crop((58, 62, 238, 242))
    stream = BytesIO()
    crop.save(stream, format='PNG')
    stream.seek(0)
    return ImageReader(stream)


def make_qr():
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(VERIFY_URL)
    qr.make(fit=True)
    image = qr.make_image(fill_color='black', back_color='white').convert('RGB')
    stream = BytesIO()
    image.save(stream, format='PNG')
    stream.seek(0)
    return ImageReader(stream)


def text(c, x, y, value, size=9, color=NAVY, font='Helvetica'):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, value)


def field(c, x, y, label, value, label_width=126, size=8.3):
    text(c, x, y, label.upper(), 8.2, BLUE, 'Helvetica-Bold')
    text(c, x + label_width, y, value, size, NAVY)
    c.setStrokeColor(LINE)
    c.setLineWidth(.6)
    c.line(x, y - 10, 552, y - 10)


def build_certificate():
    page_w, page_h = A4
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    c.setFillColor(colors.white)
    c.rect(0, page_h - 125, page_w, 125, fill=1, stroke=0)
    c.drawImage(make_emblem(), 42, page_h - 112, 92, 92, mask='auto')
    text(c, 148, page_h - 48, 'WINMAR', 28, NAVY, 'Helvetica-Bold')
    text(c, 148, page_h - 70, 'DOCUMENT VERIFICATION', 13, NAVY, 'Helvetica')
    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.line(310, page_h - 30, 310, page_h - 105)
    text(c, 330, page_h - 43, 'REPORT NO.', 8, BLUE, 'Helvetica-Bold')
    text(c, 330, page_h - 61, 'WMC-2026-000001', 9.5, NAVY, 'Helvetica-Bold')
    text(c, 330, page_h - 80, 'ISSUE DATE', 8, BLUE, 'Helvetica-Bold')
    text(c, 330, page_h - 98, datetime.now(timezone.utc).strftime('%Y-%m-%d'), 9.5, NAVY, 'Helvetica-Bold')
    c.drawImage(make_qr(), 484, page_h - 105, 68, 68, mask='auto')
    text(c, 476, page_h - 115, 'SCAN TO VERIFY', 7.3, NAVY, 'Helvetica-Bold')
    text(c, 475, page_h - 127, 'scan.winmarchain.io', 7.1, NAVY)

    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.line(45, page_h - 145, 550, page_h - 145)
    text(c, 45, page_h - 180, 'DOCUMENT AUTHENTICITY CERTIFICATE', 21, NAVY, 'Helvetica-Bold')
    c.line(45, page_h - 192, 550, page_h - 192)
    text(c, 98, page_h - 218, 'THIS CERTIFICATE CONFIRMS THAT THE DOCUMENT REFERENCED BELOW HAS BEEN', 8.2, MUTED, 'Helvetica')
    text(c, 126, page_h - 234, 'VERIFIED AND ANCHORED ON THE WINMAR CHAIN BLOCKCHAIN.', 8.2, MUTED, 'Helvetica')

    box_y = page_h - 430
    c.setFillColor(LIGHT_BLUE)
    c.setStrokeColor(LINE)
    c.roundRect(45, box_y, 510, 155, 7, fill=1, stroke=1)
    text(c, 63, box_y + 133, 'DOCUMENT SUMMARY', 10, BLUE, 'Helvetica-Bold')
    c.setStrokeColor(BLUE)
    c.line(63, box_y + 124, 537, box_y + 124)
    issue_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    field(c, 63, box_y + 104, 'DOCUMENT ID', DOCUMENT_ID, 125, 7.5)
    field(c, 63, box_y + 81, 'DOCUMENT TYPE', 'Winmar Chain Fee Mechanism', 125, 8.3)
    field(c, 63, box_y + 58, 'ISSUER', 'Winmar Chain', 125, 8.3)
    field(c, 63, box_y + 35, 'ISSUE DATE', issue_date, 125, 8.3)
    field(c, 63, box_y + 12, 'FILE FORMAT', 'PDF (SHA-256 Verified)', 125, 8.3)

    status_y = box_y - 67
    c.setFillColor(colors.HexColor('#e8fbf1'))
    c.setStrokeColor(colors.HexColor('#82e1b0'))
    c.roundRect(45, status_y, 510, 48, 7, fill=1, stroke=1)
    c.setFillColor(GREEN)
    c.circle(75, status_y + 24, 14, fill=1, stroke=0)
    text(c, 68, status_y + 19, '✓', 18, colors.white, 'Helvetica-Bold')
    text(c, 102, status_y + 29, 'DOCUMENT STATUS', 7.5, NAVY, 'Helvetica-Bold')
    text(c, 102, status_y + 12, 'VERIFIED ON-CHAIN', 15, GREEN, 'Helvetica-Bold')
    c.setStrokeColor(colors.HexColor('#82e1b0'))
    c.line(292, status_y + 10, 292, status_y + 38)
    text(c, 312, status_y + 27, 'This document has been cryptographically hashed,', 7.3, NAVY)
    text(c, 312, status_y + 15, 'anchored on the Winmar Chain blockchain, and verified.', 7.3, NAVY)

    details_y = status_y - 28
    text(c, 45, details_y, 'BLOCKCHAIN VERIFICATION DETAILS', 10, BLUE, 'Helvetica-Bold')
    c.setStrokeColor(BLUE)
    c.line(45, details_y - 8, 555, details_y - 8)
    rows = [
        ('SHA-256 FINGERPRINT', SHA256),
        ('VERIFICATION TX', VERIFICATION_TX),
        ('PAYMENT TX', PAYMENT_TX),
        ('BLOCK NUMBER', f'#{BLOCK}'),
        ('ISSUER WALLET', ISSUER),
        ('NETWORK', f'{NETWORK} · Chain ID {CHAIN_ID}'),
        ('EXPLORER LINK', VERIFY_URL),
    ]
    y = details_y - 28
    for label, value in rows:
        field(c, 62, y, label, value, 137, 7.1 if len(value) > 58 else 8.0)
        y -= 27
    c.setFillColor(LIGHT_BLUE)
    c.roundRect(45, 76, 245, 62, 7, fill=1, stroke=0)
    text(c, 58, 120, 'VERIFICATION NOTE', 8.2, BLUE, 'Helvetica-Bold')
    text(c, 58, 103, 'The chain stores the SHA-256 fingerprint,', 7.1, MUTED)
    text(c, 58, 91, 'not the private contents of the document.', 7.1, MUTED)
    c.setFillColor(colors.HexColor('#edf4fb'))
    c.rect(0, 0, page_w, 34, fill=1, stroke=0)
    text(c, 45, 13, 'WINMAR CHAIN · DOCUMENT VERIFICATION', 7.3, MUTED)
    text(c, 465, 13, 'Verified record · Mainnet', 7.3, MUTED)
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer


def main():
    reader = PdfReader(str(SOURCE))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    certificate = PdfReader(build_certificate())
    writer.add_page(certificate.pages[0])
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open('wb') as stream:
        writer.write(stream)
    print(OUTPUT)


if __name__ == '__main__':
    main()
