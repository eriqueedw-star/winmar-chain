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

rpc_post() {
  local payload="$1"
  curl --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    -H 'Content-Type: application/json' \
    --data "$payload" \
    "$RPC_URL"
}

check_method_exposure() {
  local label="$1"
  local method="$2"
  local params="$3"
  local response

  response="$(rpc_post "{\"jsonrpc\":\"2.0\",\"method\":\"${method}\",\"params\":${params},\"id\":99}" || true)"

  RPC_EXPOSURE_RESPONSE="$response" RPC_EXPOSURE_LABEL="$label" python3 - <<'PY'
import json
import os

label = os.environ["RPC_EXPOSURE_LABEL"]
raw = os.environ.get("RPC_EXPOSURE_RESPONSE", "")

try:
    payload = json.loads(raw)
except Exception:
    print(f"rpc_{label}_check=indeterminate")
    print(f"rpc_{label}_exposed=unknown")
    raise SystemExit(0)

if "result" in payload and "error" not in payload:
    print(f"rpc_{label}_check=success")
    print(f"rpc_{label}_exposed=true")
elif "error" in payload:
    print(f"rpc_{label}_check=success")
    print(f"rpc_{label}_exposed=false")
else:
    print(f"rpc_{label}_check=indeterminate")
    print(f"rpc_{label}_exposed=unknown")
PY
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

rpc_response="$(rpc_post '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}')"

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

block_response="$(rpc_post '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":2}')"

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

genesis_response="$(rpc_post '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x0",false],"id":3}')"

GENESIS_RESPONSE="$genesis_response" python3 - <<'PY'
import json
import os
import sys

raw = os.environ["GENESIS_RESPONSE"]
try:
    payload = json.loads(raw)
    result = payload.get("result")
    if not isinstance(result, dict):
        raise ValueError("genesis block result is not an object")
    block_hash = result.get("hash")
    number = result.get("number")
    if not isinstance(block_hash, str) or not block_hash.startswith("0x"):
        raise ValueError("genesis block hash is missing or invalid")
    if number != "0x0":
        raise ValueError("genesis block number is not 0x0")
except Exception as exc:
    print("rpc_genesis_block_valid=false")
    print(f"rpc_genesis_block_error={exc}")
    sys.exit(1)

print("rpc_genesis_block_valid=true")
print("rpc_genesis_block_number=0")
print(f"rpc_genesis_block_hash={block_hash}")
print("rpc_genesis_fingerprint_scope=block_hash_only")
PY

printf 'rpc_privileged_method_gate=informational_only\n'
check_method_exposure "admin_nodeinfo" "admin_nodeInfo" "[]"
check_method_exposure "personal_listaccounts" "personal_listAccounts" "[]"
