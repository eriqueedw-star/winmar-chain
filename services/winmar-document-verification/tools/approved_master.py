#!/usr/bin/env python3
"""Fail-closed asset provenance check for the owner-approved certificate master.

This NEVER edits artwork. Intended to be run before every certificate render.
Requires Pillow for independent decoded-pixel checks (not for SHA256 checking).
"""
from __future__ import annotations

import hashlib
from pathlib import Path

APPROVED_SHA256 = "e6f621c211c389398377f251c533b522e3f76117c8428624a5e43407ab5fe5d3"
APPROVED_SIZE_BYTES = 2_199_597
APPROVED_DIMS = (1055, 1491)


def approve_exact_master(path: str | Path) -> bytes:
    source = Path(path)
    raw = source.read_bytes()
    actual = hashlib.sha256(raw).hexdigest()
    if actual != APPROVED_SHA256 or len(raw) != APPROVED_SIZE_BYTES:
        raise ValueError(
            "Certificate master FAIL: uploaded approved original PNG required. "
            "Do not fall back to a repository image, similar artwork, or a regenerated template."
        )
    if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Certificate master FAIL: invalid PNG signature")
    # IHDR dimensions at PNG bytes 16:24, big-endian.
    width = int.from_bytes(raw[16:20], "big")
    height = int.from_bytes(raw[20:24], "big")
    if (width, height) != APPROVED_DIMS:
        raise ValueError("Certificate master FAIL: wrong dimensions")
    return raw


def compare_decoded_pixels(approved: str | Path, candidate: str | Path) -> bool:
    """Diagnostic only. Passing pixels does NOT bypass strict approved SHA gate."""
    from PIL import Image, ImageChops
    with Image.open(approved) as original, Image.open(candidate) as trial:
        if original.size != APPROVED_DIMS or trial.size != APPROVED_DIMS:
            return False
        return ImageChops.difference(original.convert("RGBA"), trial.convert("RGBA")).getbbox() is None


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Check exact owner-approved Winmar certificate master")
    p.add_argument("candidate", help="Path to candidate PNG")
    p.add_argument("--compare-approved", help="Optional original approved PNG for pixel diagnostic")
    args = p.parse_args()
    try:
        approve_exact_master(args.candidate)
    except (ValueError, OSError) as exc:
        print("FAIL:", exc)
        raise SystemExit(1)
    print("PASS: owner-approved Winmar certificate master SHA-256, length and dimensions")
    if args.compare_approved:
        same = compare_decoded_pixels(args.compare_approved, args.candidate)
        print("PASS: decoded RGBA pixels identical" if same else "FAIL: decoded RGBA pixels differ")
        if not same:
            raise SystemExit(1)
