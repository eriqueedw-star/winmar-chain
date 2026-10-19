#!/usr/bin/env python3
"""Compare a rendered Winmar A4 certificate to the EXACT approved master.

Masks are limited to owner-approved dynamic data rectangles and QR inner box.
Every pixel outside those masks MUST be identical. This is a strict test of
canvas PNG export before PDF rasterization: a PDF renderer may introduce
antialiasing and therefore needs a separate visually inspected tolerance check.
"""
from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

from approved_master import approve_exact_master, APPROVED_DIMS

# Pixel-exclusive rectangles: x0, y0, x1, y1.
# Expand only through explicit owner design review; DO NOT mask logo,
# title, status badge, borders, static icons, section titles or footer labels.
MASKS = [
    # Exact union of review-only browser and Python dynamic value boxes.
    # Never cover the immutable summary rules y=533,577,622,668,713.
    (567, 109, 783, 140),    # header report (browser + CLI)
    (567, 182, 783, 212),    # header issue date
    (339, 490, 907, 526),    # summary document ID
    (339, 536, 907, 572),    # summary document type
    (339, 580, 907, 617),    # summary subject
    (339, 625, 907, 662),    # summary issuer
    (339, 670, 907, 706),    # summary issue date
    (339, 716, 907, 751),    # summary PDF format
    (347, 989, 897, 1029),   # two-line SHA-256 fingerprint
    (347, 1049, 898, 1079),  # registration TX
    (347, 1089, 898, 1119),  # block number
    (347, 1132, 898, 1162),  # UTC timestamp
    (347, 1175, 898, 1205),  # issuer wallet
    (347, 1217, 898, 1250),  # network
    (347, 1265, 768, 1298),  # Explorer text: stops before VIEW ON EXPLORER
    (97, 1377, 351, 1409),   # footer report
    (487, 1377, 640, 1409),  # footer page number
    (831, 83, 944, 197),     # QR pixels only; protect outer border and caption
]


def pixel_diff(original, rendered):
    from PIL import Image, ImageChops, ImageDraw
    import io

    master = Image.open(io.BytesIO(original)).convert("RGBA")
    with Image.open(rendered) as candidate:
        if candidate.size != APPROVED_DIMS:
            raise ValueError("FAIL: rendered certificate dimensions are not 1055x1491")
        actual = candidate.convert("RGBA")

    # Hide ONLY approved variable regions before comparing fixed artwork.
    mask = Image.new("1", APPROVED_DIMS, 0)
    m = ImageDraw.Draw(mask)
    for x0, y0, x1, y1 in MASKS:
        m.rectangle((x0, y0, x1 - 1, y1 - 1), fill=1)
    diff = ImageChops.difference(master, actual)
    outside_mask = ImageChops.invert(mask.convert("L"))
    # Compare ALL channels including alpha; rgba.getbbox() alone would
    # accidentally ignore RGB differences when the alpha difference is zero.
    channels = [ImageChops.multiply(channel, outside_mask) for channel in diff.split()]
    combined = channels[0]
    for channel in channels[1:]:
        combined = ImageChops.lighter(combined, channel)
    return combined.getbbox(), hashlib.sha256(actual.tobytes()).hexdigest()


def main():
    p = argparse.ArgumentParser(description="Fail unless fixed Winmar certificate artwork is unchanged")
    p.add_argument("--approved-master", required=True)
    p.add_argument("--rendered-png", required=True,
                   help="Canvas export BEFORE PDF embedding, 1055x1491 PNG")
    args = p.parse_args()
    original = approve_exact_master(Path(args.approved_master))
    boundary, rendered_hash = pixel_diff(original, args.rendered_png)
    if boundary:
        raise SystemExit(f"FAIL: static approved artwork changed outside dynamic fields: {boundary}")
    print("PASS: immutable Winmar logo, border, title, status panel, icons and footer untouched")
    print("rendered_rgba_sha256=" + rendered_hash)


if __name__ == "__main__":
    main()
