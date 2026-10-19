#!/usr/bin/env python3
"""Build a reviewed, static-only Winmar Explorer document verification release.

This does NOT deploy to production, access secrets, sign transactions, modify
smart contracts or publish customer documents. Everything comes from the same
reviewed Git checkout. Only a fixed allowlist of assets is included.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "services" / "winmar-document-verification" / "web"
ALLOWLIST = (
    "verify.html",
    "verify.css",
    "verify.js",
    "verification-proof.js",
    "winmar-chain-logo-framed-v2.png",
)
SAMPLE_DOC_ID = (
    "0x477a80f1f39d85e3b746f621a5271a17c3aa1b6adc9d88401cc7bbf58ae209fc"
)


def assemble(destination: Path) -> dict[str, object]:
    out = destination.resolve()
    if out == ROOT or ROOT in out.parents and out == WEB:
        raise ValueError("Cannot use source repository/web folder as release destination")
    if out.exists() and any(out.iterdir()):
        raise ValueError("Refusing nonempty release destination; use a fresh directory")

    assets = out / "site" / "document-verification"
    assets.mkdir(parents=True, exist_ok=True)
    digests = {}
    for basename in ALLOWLIST:
        source = WEB / basename
        if not source.is_file() or source.is_symlink():
            raise FileNotFoundError(f"Missing approved verifier asset: {basename}")
        content = source.read_bytes()
        if not content:
            raise ValueError(f"Empty verifier asset: {basename}")
        target = assets / basename
        target.write_bytes(content)
        digests[f"document-verification/{basename}"] = hashlib.sha256(content).hexdigest()

    # The /verify/<documentId> Nginx location serves /verify.html. The HTML's
    # <base> directs JS/CSS/logo to /document-verification/, a separate static
    # alias that does not replace Blockscout's main / route.
    html = (assets / "verify.html").read_text(encoding="utf-8")
    for phrase in ('<base href="/document-verification/">',
                   'src="./verification-proof.js"',
                   'src="./verify.js"',
                   'href="./verify.css"'):
        if phrase not in html:
            raise ValueError(f"Verifier asset path is inconsistent: {phrase}")

    js = (assets / "verify.js").read_text(encoding="utf-8")
    proof = (assets / "verification-proof.js").read_text(encoding="utf-8")
    if "WinmarVerificationProof.lookup" not in js or "eth_chainId" not in proof:
        raise ValueError("Missing read-only blockchain verification logic")
    if "eth_sendTransaction" in js or "eth_sendRawTransaction" in js:
        raise ValueError("Public document verifier must be read-only")
    if 'https://scan.winmarchain.io/verify/' not in proof:
        raise ValueError("Certificate verifier uses an unapproved public route")
    if 'https://rpc.winmarchain.io/' not in js:
        raise ValueError("Browser lookup is not pointed to the official read-only RPC")

    route_entry = out / "site" / "verify.html"
    shutil.copyfile(assets / "verify.html", route_entry)
    digests["verify.html"] = hashlib.sha256(route_entry.read_bytes()).hexdigest()

    release = {
        "name": "winmar-chain-public-document-verifier",
        "status": "review-only-not-deployed",
        "public_url": "https://scan.winmarchain.io/verify/<documentId>",
        "sample_url": f"https://scan.winmarchain.io/verify/{SAMPLE_DOC_ID}",
        "public_files": sorted(digests),
        "sha256": digests,
        "private_keys": False,
        "changes_blockchain_state": False,
        "requires_operator_nginx_review": True,
    }
    (out / "manifest.json").write_text(
        json.dumps(release, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (out / "SHA256SUMS").write_text(
        "".join(f"{digest}  site/{name}\n" for name, digest in sorted(digests.items())),
        encoding="utf-8",
    )
    return release


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="build/document-verification-explorer")
    options = parser.parse_args()
    result = assemble(Path(options.output))
    print(json.dumps({"status": "BUNDLE_READY_NOT_DEPLOYED",
                      "file_count": len(result["public_files"]),
                      "output": options.output,
                      "sample_url": result["sample_url"]}, indent=2))


if __name__ == "__main__":
    main()
