#!/usr/bin/env python3
"""Fail-closed smoke checks for the pre-release ecosystem console."""
import json
import pathlib
import re
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
conf = json.loads((ROOT / "config/developer-tools.json").read_text(encoding="utf-8"))
assert conf["network"]["chainId"] == 12142816
assert conf["network"]["rpc"] == "https://rpc.winmarchain.io"
assert conf["faucet"]["configured"] is False
assert conf["faucet"]["funded"] is False
assert conf["tokenMaker"]["configured"] is False
assert conf["tokenMaker"]["tokenStandard"] == "WMC-20"
assert conf["tokenMaker"]["technicalCompatibility"] == "ERC-20"
assert conf["documentVerifier"]["configured"] is False
assert conf["bridge"]["transfersEnabled"] is False
assert conf["bridge"]["assetRegistryConfigured"] is False
routes = conf["bridge"]["supportedRoutes"]
assert len(routes) == 1
assert routes[0]["sourceChainId"] == 56
assert routes[0]["sourceToken"].lower() == "0x3fc94a05ed1b7044f666a0342f4b750ab1b2ddd9"
assert routes[0]["status"] == "staging-paused"
assert routes[0]["lockMint"] is False
assert routes[0]["burnRelease"] is False
assert routes[0]["proofVerification"] == "not-deployed"

html = (ROOT / "apps/developer-tools/index.html").read_text(encoding="utf-8")
scripts = [s for s in re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, re.S | re.I) if s.strip()]
assert len(scripts) == 1, "Expected one inline application script"
assert all(f'id="p-{name}"' in html for name in ("faucet", "creator", "bridge", "documents"))
assert "crypto.subtle.digest('SHA-256',buffer)" in html
assert "function getRecord(address issuer,bytes32 sha256)" in html
assert "document.getElementById" in html
assert "WMC-20 Token Creator" in html
assert "ERC-20 compatible" in html
with tempfile.TemporaryDirectory() as folder:
    p = pathlib.Path(folder) / "suite.js"
    p.write_text(scripts[0], encoding="utf-8")
    subprocess.run(["node", "--check", str(p)], check=True)

print("PASS: four-module UI syntax and fail-closed feature configuration")
