#!/usr/bin/env python3
"""Offline repository inventory: hints only, never proves live DNS/CDN ownership."""
from pathlib import Path
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HOSTS = ("bridge.winmarchain.io", "winmarchain.io", "scan.winmarchain.io")
EXCLUDE = {".git", "node_modules", ".terraform", "_site", "dist", "build"}
EXTENSIONS = {".yml", ".yaml", ".tf", ".json", ".md", ".toml", ".conf", ".config", ".js", ".ts", ".py", ".sh", ".html", ".txt"}
PATTERNS = {
    "cloudflare": re.compile(r"cloudflare|cloudflare_pages|cf-ray", re.I),
    "aws": re.compile(r"cloudfront|route53|aws_(?:route53|cloudfront|alb|lb|acm)|amazonaws", re.I),
    "netlify": re.compile(r"netlify", re.I),
    "vercel": re.compile(r"vercel", re.I),
    "nginx": re.compile(r"nginx|add_header|proxy_pass", re.I),
    "caddy": re.compile(r"caddy|header\s*\{", re.I),
    "github_pages": re.compile(r"deploy-pages|github-pages|pages\.github\.io", re.I),
    "security_headers": re.compile(r"content-security-policy|strict-transport-security|x-frame-options|frame-ancestors", re.I),
}
def main():
    hits = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
            continue
        rel = path.relative_to(ROOT)
        if any(part in EXCLUDE for part in rel.parts):
            continue
        # Avoid printing secrets or sensitive content: paths, line numbers, category only.
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeError, OSError):
            continue
        for line_no, line in enumerate(content.splitlines(), 1):
            categories = [key for key, pattern in PATTERNS.items() if pattern.search(line)]
            domains = [host for host in HOSTS if host in line]
            if categories or domains:
                hits.append({"file": str(rel), "line": line_no, "categories": categories, "host_references": domains})
    print(json.dumps({
        "audit": "repository_hosting_configuration_inventory",
        "scope": "repository_files_only",
        "production_host_ownership": "unverified",
        "live_dns_tls_http_probes": "not_performed",
        "hostnames": list(HOSTS),
        "findings": hits[:500],
        "truncated": len(hits) > 500,
        "finding_count": len(hits),
    }, indent=2))
    return 0
if __name__ == "__main__":
    sys.exit(main())
