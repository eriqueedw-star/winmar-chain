#!/usr/bin/env python3
"""Read-only HTTP/TLS bridge readiness probe. No wallet, signing, or transfers."""
import datetime
import json
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

TARGETS = {
    "bridge": "https://bridge.winmarchain.io",
    "website": "https://winmarchain.io",
    "explorer": "https://scan.winmarchain.io",
}
TIMEOUT = 20

def emit(k, v):
    print(f"{k}={str(v).lower() if isinstance(v, bool) else v}", flush=True)

def probe(name, url):
    req = urllib.request.Request(url, headers={"User-Agent": "Winmar-ReadOnly-Audit/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ssl.create_default_context()) as resp:
            status, final_url, headers = resp.status, resp.url, resp.headers
    except urllib.error.HTTPError as exc:
        status, final_url, headers = exc.code, exc.url, exc.headers
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        emit(f"{name}_reachable", False)
        emit(f"{name}_error_type", type(exc).__name__)
        return False
    parsed = urllib.parse.urlparse(final_url)
    emit(f"{name}_http_status", status)
    emit(f"{name}_final_url", final_url)
    emit(f"{name}_https_final", parsed.scheme == "https")
    emit(f"{name}_reachable", 200 <= status < 400)
    emit(f"{name}_hsts_present", bool(headers.get("Strict-Transport-Security")))
    emit(f"{name}_content_security_policy_present", bool(headers.get("Content-Security-Policy")))
    emit(f"{name}_x_content_type_options_nosniff", headers.get("X-Content-Type-Options", "").lower() == "nosniff")
    emit(f"{name}_referrer_policy_present", bool(headers.get("Referrer-Policy")))
    emit(f"{name}_frame_protection_present", bool(headers.get("X-Frame-Options") or "frame-ancestors" in headers.get("Content-Security-Policy", "")))
    return 200 <= status < 400 and parsed.scheme == "https"

def main():
    emit("audit_timestamp_utc", datetime.datetime.now(datetime.timezone.utc).isoformat())
    emit("audit_scope", "read_only_public_http_tls_and_response_headers")
    ok = True
    for name, url in TARGETS.items():
        emit(f"{name}_expected_url", url)
        if not probe(name, url):
            ok = False
    emit("bridge_transaction_test", "not_performed")
    emit("bridge_contract_verification", "not_performed")
    emit("bridge_liquidity_verification", "not_performed")
    emit("bridge_wallet_connect_test", "not_performed")
    emit("audit_transport_gate_passed", ok)
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
