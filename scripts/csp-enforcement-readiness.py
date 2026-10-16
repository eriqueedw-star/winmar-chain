#!/usr/bin/env python3
"""Read-only public CSP readiness evidence; never enforces or changes headers."""
import datetime
import json
import ssl
import sys
import urllib.error
import urllib.request

HOSTS = ("winmarchain.io", "scan.winmarchain.io", "bridge.winmarchain.io")
TIMEOUT = 15

def check(host):
    result = {"hostname": host, "reachable": False, "https_valid": False, "http_status": None,
              "hsts_present": False, "hsts_max_age": None, "csp_enforced": False,
              "csp_report_only": False, "frame_protection": False, "nosniff": False,
              "referrer_policy": False, "errors": []}
    req = urllib.request.Request("https://" + host + "/", headers={"User-Agent": "WinmarCSPReadinessAudit/1.0"})
    try:
        try:
            response = urllib.request.urlopen(req, timeout=TIMEOUT, context=ssl.create_default_context())
        except urllib.error.HTTPError as exc:
            response = exc
        with response:
            h = response.headers
            result["reachable"] = 200 <= response.status < 400
            result["https_valid"] = response.url.startswith("https://")
            result["http_status"] = response.status
            hsts = h.get("Strict-Transport-Security", "")
            result["hsts_present"] = bool(hsts)
            for part in hsts.split(";"):
                if part.strip().lower().startswith("max-age="):
                    try:
                        result["hsts_max_age"] = int(part.split("=", 1)[1].strip())
                    except ValueError:
                        pass
            csp = h.get("Content-Security-Policy", "")
            result["csp_enforced"] = bool(csp)
            result["csp_report_only"] = bool(h.get("Content-Security-Policy-Report-Only"))
            result["frame_protection"] = bool(h.get("X-Frame-Options") or "frame-ancestors" in csp.lower())
            result["nosniff"] = h.get("X-Content-Type-Options", "").lower() == "nosniff"
            result["referrer_policy"] = bool(h.get("Referrer-Policy"))
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        result["errors"].append(type(exc).__name__)
    result["enforcement_readiness"] = "not_determined_by_headers_alone"
    return result

def main():
    results = [check(host) for host in HOSTS]
    output = {"audit": "public_csp_enforcement_readiness", "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "scope": "public_read_only_headers_only", "results": results,
              "limitations": ["No authenticated Cognito tests", "No wallet or bridge transaction tests",
                              "No browser CSP violation telemetry", "No mobile visual regression"]}
    print(json.dumps(output, indent=2))
    # A green run means evidence collected, not that enforced CSP is safe to deploy.
    return 0

if __name__ == "__main__":
    sys.exit(main())
