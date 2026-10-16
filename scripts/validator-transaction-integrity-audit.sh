#!/usr/bin/env bash
set -euo pipefail
# Read-only: no keys, signatures, or transaction submissions.
rpc() {
  curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
    -H 'Content-Type: application/json' \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"$2\",\"params\":$3,\"id\":1}" "$1"
}
printf 'audit_timestamp_utc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
for role in primary backup; do
  if [[ "$role" == primary ]]; then url="https://rpc.winmarchain.io"; else url="https://rpc.winmarchain.com"; fi
  printf 'rpc_%s_url=%s\n' "$role" "$url"
  for method in eth_chainId eth_blockNumber eth_syncing; do
    response="$(rpc "$url" "$method" '[]')"
    ROLE="$role" METHOD="$method" RESPONSE="$response" python3 - <<'PY'
import json, os, sys
role, method = os.environ["ROLE"], os.environ["METHOD"]
try:
    result = json.loads(os.environ["RESPONSE"])["result"]
    if method == "eth_chainId":
        if int(result, 16) != 12142816: raise ValueError("chain ID mismatch")
    elif method == "eth_blockNumber":
        if int(result, 16) < 0: raise ValueError("invalid block number")
    elif result is not False:
        raise ValueError("syncing or invalid eth_syncing")
    print("rpc_%s_%s_valid=true" % (role, method))
    print("rpc_%s_%s_value=%s" % (role, method, str(result).lower()))
except (ValueError, KeyError, TypeError) as exc:
    print("rpc_%s_%s_error=%s" % (role, method, exc))
    sys.exit(1)
PY
  done
done
primary_tip="$(rpc https://rpc.winmarchain.io eth_blockNumber '[]')"
backup_tip="$(rpc https://rpc.winmarchain.com eth_blockNumber '[]')"
common_height="$(PRIMARY="$primary_tip" BACKUP="$backup_tip" python3 - <<'PY'
import json, os
print(hex(min(int(json.loads(os.environ[k])["result"], 16) for k in ("PRIMARY", "BACKUP"))))
PY
)"
printf 'rpc_common_height=%s\n' "$common_height"
primary_block="$(rpc https://rpc.winmarchain.io eth_getBlockByNumber "[\"$common_height\",true]")"
backup_block="$(rpc https://rpc.winmarchain.com eth_getBlockByNumber "[\"$common_height\",true]")"
PRIMARY_BLOCK="$primary_block" BACKUP_BLOCK="$backup_block" python3 - <<'PY'
import json, os, sys
expected = "0x82f43cfcd8c9152bae9bde20af3e790451ad1d778707f506b5794335c065c2fd"
try:
    a, b = [json.loads(os.environ[k])["result"] for k in ("PRIMARY_BLOCK", "BACKUP_BLOCK")]
    if not isinstance(a, dict) or not isinstance(b, dict) or not a.get("hash") or a["hash"] != b.get("hash"):
        raise ValueError("common block hash mismatch")
    print("rpc_common_block_hash_matches=true")
    print("rpc_common_block_hash=%s" % a["hash"])
    txs = a.get("transactions", [])
    if not isinstance(txs, list): raise ValueError("invalid transactions")
    print("rpc_common_block_transaction_count=%d" % len(txs))
    if txs:
        if not isinstance(txs[0], dict) or not isinstance(txs[0].get("hash"), str):
            raise ValueError("invalid transaction")
        print("rpc_sample_transaction_hash=%s" % txs[0]["hash"])
    else:
        print("rpc_sample_transaction_status=no_transactions_in_sample_block")
except (ValueError, TypeError, KeyError) as exc:
    print("rpc_common_block_error=%s" % exc)
    sys.exit(1)
PY
for role in primary backup; do
  if [[ "$role" == primary ]]; then url=https://rpc.winmarchain.io; else url=https://rpc.winmarchain.com; fi
  response="$(rpc "$url" eth_getBlockByNumber '["0x0",false]')"
  ROLE="$role" RESPONSE="$response" python3 - <<'PY'
import json, os, sys
try:
    block = json.loads(os.environ["RESPONSE"])["result"]
    expected = "0x82f43cfcd8c9152bae9bde20af3e790451ad1d778707f506b5794335c065c2fd"
    if block["number"] != "0x0" or block["hash"].lower() != expected: raise ValueError("genesis mismatch")
    print("rpc_%s_genesis_matches=true" % os.environ["ROLE"])
except (ValueError, TypeError, KeyError) as exc:
    print("rpc_%s_genesis_error=%s" % (os.environ["ROLE"], exc))
    sys.exit(1)
PY
done
printf 'validator_set_verification=not_performed\n'
printf 'bridge_end_to_end_verification=not_performed\n'
