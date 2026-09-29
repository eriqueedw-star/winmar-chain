#!/usr/bin/env python3
"""Audit public-release privacy conditions without printing sensitive values."""

from __future__ import annotations

import pathlib
import struct
import subprocess
import sys
from collections import Counter


ROOT = pathlib.Path(__file__).resolve().parents[1]
LOGO = ROOT / "winmar-chain-logo-framed-v2.png"
RECOVERY_FILE = ROOT / "ops" / "static-nodes-recovery.json"

PERSONAL_EMAIL_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "icloud.com",
    "me.com",
    "proton.me",
    "protonmail.com",
}

SENSITIVE_PNG_CHUNKS = {"tEXt", "zTXt", "iTXt", "eXIf"}


def git_email_domains() -> Counter[str]:
    result = subprocess.run(
        ["git", "log", "--format=%ae%n%ce"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    domains: Counter[str] = Counter()
    for raw in result.stdout.splitlines():
        email = raw.strip().lower()
        if "@" not in email:
            continue
        domains[email.rsplit("@", 1)[1]] += 1
    return domains


def png_chunks(path: pathlib.Path) -> list[tuple[str, bytes]]:
    data = path.read_bytes()
    signature = b"\x89PNG\r\n\x1a\n"
    if not data.startswith(signature):
        raise ValueError(f"{path.name} is not a valid PNG")

    chunks: list[tuple[str, bytes]] = []
    offset = len(signature)
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError("truncated PNG chunk")
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        kind = data[offset + 4 : offset + 8].decode("latin-1")
        start = offset + 8
        end = start + length
        if end + 4 > len(data):
            raise ValueError("truncated PNG payload")
        chunks.append((kind, data[start:end]))
        offset = end + 4
        if kind == "IEND":
            break
    return chunks


def text_keyword(kind: str, payload: bytes) -> str:
    if kind in {"tEXt", "zTXt"}:
        return payload.split(b"\x00", 1)[0].decode("latin-1", errors="replace")
    if kind == "iTXt":
        return payload.split(b"\x00", 1)[0].decode("utf-8", errors="replace")
    return ""


def main() -> int:
    failures: list[str] = []

    print("Publication audit")
    print("=================")

    if RECOVERY_FILE.exists():
        failures.append("public recovery topology file is tracked")
        print("recovery_topology_absent=false")
    else:
        print("recovery_topology_absent=true")

    domains = git_email_domains()
    personal = {domain: count for domain, count in domains.items() if domain in PERSONAL_EMAIL_DOMAINS}
    print(f"git_email_domain_count={len(domains)}")
    print(f"personal_email_domain_count={len(personal)}")
    if personal:
        failures.append("personal email domain found in Git history")
        for domain in sorted(personal):
            print(f"personal_email_domain={domain};occurrences={personal[domain]}")

    if not LOGO.exists():
        failures.append("logo file is missing")
        print("logo_present=false")
    else:
        print("logo_present=true")
        try:
            chunks = png_chunks(LOGO)
        except ValueError as exc:
            failures.append(str(exc))
            print("logo_png_valid=false")
        else:
            print("logo_png_valid=true")
            sensitive = [(kind, text_keyword(kind, payload)) for kind, payload in chunks if kind in SENSITIVE_PNG_CHUNKS]
            print(f"logo_sensitive_metadata_chunk_count={len(sensitive)}")
            for kind, keyword in sensitive:
                safe_keyword = keyword.replace("\n", " ").replace("\r", " ")[:80]
                print(f"logo_metadata_chunk={kind};keyword={safe_keyword}")
            if sensitive:
                failures.append("logo contains text or EXIF metadata chunks")

    if failures:
        print("publication_audit_pass=false")
        for item in failures:
            print(f"failure={item}")
        return 1

    print("publication_audit_pass=true")
    return 0


if __name__ == "__main__":
    sys.exit(main())
