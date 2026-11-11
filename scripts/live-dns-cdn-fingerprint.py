#!/usr/bin/env python3
"""Public, read-only DNS/TLS/HTTP observations; no production mutations."""
import datetime
import json
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

HOSTS = ("winmarchain.io", "bridge.winmarchain.io", "scan.winmarchain.io")
TIMEOUT = 12
USER_AGENT = "WinmarPublicInfraAudit/1.0"

def observe(host):
    result = {"hostname": host, "dns": {}, "tls": {}, "http": {}, "cdn_hints": [], "errors": []}
    try:
        records = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        result["dns"]["resolved_address_families"] = sorted(set("IPv6" if item[0] == socket.AF_INET6 else "IPv4" for item in records))
        result["dns"]["resolved_address_count"] = len(set(item[4][0] for item in records))
        # Avoid archiving public origin addresses; DNS resolution alone cannot prove hosting ownership.
    except (OSError, socket.gaierror) as exc:
        result["errors"].append("dns:" + type(exc).__name__)
    try:
        with socket.create_connection((host, 443), timeout=TIMEOUT) as sock:
            with ssl.create_default_context().wrap_socket(sock, server_hostname=host) as tls:
                cert = tls.getpeercert()
                result["tls"] = {
                    "validated": True,
                    "protocol": tls.version(),
                    "certificate_not_after": cert.get("notAfter"),
                    "certificate_subject": [[list(part) for part in group] for group in cert.get("subject", ())],
                    "certificate_issuer": [[list(part) for part in group] for group in cert.get("issuer", ())],
                }
    except (OSError, ssl.SSLError, ValueError) as exc:
        result["tls"]["validated"] = False
        result["errors"].append("tls:" + type(exc).__name__)
    try:
        request = urllib.request.Request("https://" + host + "/", headers={"User-Agent": USER_AGENT})
        try:
            response = urllib.request.urlopen(request, timeout=TIMEOUT, context=ssl.create_default_context())
        except urllib.error.HTTPError as exc:
            response = exc
        with response:
            headers = response.headers
            result["http"] = {
                "status": response.status,
                "final_url": response.url,
                "https_final": urllib.parse.urlparse(response.url).scheme == "https",
                "strict_transport_security": bool(headers.get("Strict-Transport-Security")),
                "content_security_policy": bool(headers.get("Content-Security-Policy")),
                "content_security_policy_report_only": bool(headers.get("Content-Security-Policy-Report-Only")),
                "frame_protection": bool(headers.get("X-Frame-Options") or "frame-ancestors" in headers.get("Content-Security-Policy", "")),
                "nosniff": headers.get("X-Content-Type-Options", "").lower() == "nosniff",
                "referrer_policy": bool(headers.get("Referrer-Policy")),
            }
            if headers.get("CF-RAY") or headers.get("CF-Cache-Status"):
                result["cdn_hints"].append("cloudflare_response_headers")
            if "cloudflare" in headers.get("Server", "").lower():
                result["cdn_hints"].append("cloudflare_server_header")
            if headers.get("X-Amz-Cf-Id") or headers.get("X-Amz-Cf-Pop"):
                result["cdn_hints"].append("aws_cloudfront_response_headers")
            if headers.get("X-Vercel-Id"):
                result["cdn_hints"].append("vercel_response_headers")
            if headers.get("X-Nf-Request-Id"):
                result["cdn_hints"].append("netlify_response_headers")
    except (OSError, urllib.error.URLError, TimeoutError, ValueError) as exc:
        result["errors"].append("http:" + type(exc).__name__)
    result["cdn_attribution"] = "indicative_only_not_proof_of_origin_or_account_ownership"
    return result

def main():
    output = {
        "audit": "public_dns_tls_http_cdn_fingerprint",
        "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "scope": "public_read_only",
        "note": "System DNS resolution only (not authoritative DNS record enumeration). HTTP/TLS/CDN hints do not establish origin or account ownership.",
        "results": [observe(host) for host in HOSTS],
    }
    print(json.dumps(output, indent=2))
    # Collect evidence even when endpoints fail; findings are represented in JSON.
    return 0

if __name__ == "__main__":
    sys.exit(main())
