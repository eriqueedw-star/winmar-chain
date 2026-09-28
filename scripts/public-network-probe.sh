#!/usr/bin/env bash
set -euo pipefail

CHAIN_ID_DECIMAL="12142816"
CHAIN_ID_HEX="0xB948E0"
WEBSITE_URL="https://winmarchain.io"
RPC_URL="https://rpc.winmarchain.io"
EXPLORER_URL="https://scan.winmarchain.io"
BRIDGE_URL="https://bridge.winmarchain.io"

http_code() {
  curl --silent --show-error --location \
    --connect-timeout 10 --max-time 30 \
    --output /dev/null --write-out '%{http_code}' "$1"
}

require_web_service() {
  local name="$1"
  local url="$2"
  local code
  code="$(http_code "$url")"
  printf '%s_http_status=%s\n' "$name" "$code"
  case "$code" in
    2??|3??) ;;
    *)
      printf '%s_reachable=false\n' "$name"
      return 1
      ;;
  esac
  printf '%s_reachable=true\n' "$name"
}

printf 'probe_timestamp_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
printf 'expected_chain_id_decimal=%s\n' "$CHAIN_ID_DECIMAL"
printf 'expected_chain_id_hex=%s\n' "$CHAIN_ID_HEX"

require_web_service website "$WEBSITE_URL"
require_web_service explorer "$EXPLORER_URL"

bridge_code="$(http_code "$BRIDGE_URL" || true)"
printf 'bridge_http_status=%s\n' "${bridge_code:-unavailable}"
case "${bridge_code:-}" in
  2??|3??) printf 'bridge_reachable=true\n' ;;
  *) printf 'bridge_reachable=false\n' ;;
esac
printf 'bridge_release_gate=informational_only\n'

rpc_response="$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  "$RPC_URL")"

RPC_RESPONSE="$rpc_response" python3 - <<'PY'
import json
import os
import sys

expected = 12142816
raw = os.environ["RPC_RESPONSE"]
try:
    payload = json.loads(raw)
except json.JSONDecodeError as exc:
    print("rpc_json_valid=false")
    print(f"rpc_error={exc}")
    sys.exit(1)

result = payload.get("result")
if not isinstance(result, str):
    print("rpc_json_valid=true")
    print("rpc_chain_id_present=false")
    sys.exit(1)

try:
    actual = int(result, 16)
except ValueError:
    print("rpc_json_valid=true")
    print("rpc_chain_id_present=true")
    print("rpc_chain_id_parseable=false")
    sys.exit(1)

print("rpc_json_valid=true")
print("rpc_chain_id_present=true")
print("rpc_chain_id_parseable=true")
print(f"rpc_chain_id_hex={result}")
print(f"rpc_chain_id_decimal={actual}")
print(f"rpc_chain_id_matches_expected={'true' if actual == expected else 'false'}")
if actual != expected:
    sys.exit(1)
PY

block_response="$(curl --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":2}' \
  "$RPC_URL")"

BLOCK_RESPONSE="$block_response" python3 - <<'PY'
import json
import os
import sys

raw = os.environ["BLOCK_RESPONSE"]
try:
    payload = json.loads(raw)
    result = payload.get("result")
    height = int(result, 16)
except Exception as exc:
    print("rpc_block_number_valid=false")
    print(f"rpc_block_number_error={exc}")
    sys.exit(1)

print("rpc_block_number_valid=true")
print(f"rpc_block_number_hex={result}")
print(f"rpc_block_number_decimal={height}")
PY
