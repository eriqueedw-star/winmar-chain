#!/usr/bin/env python3
"""Read-only QBFT/receipt audit; no signing or transaction submission."""
import json
import os
import sys
import time
import urllib.error
import urllib.request

RPC = {"primary": "https://rpc.winmarchain.io", "backup": "https://rpc.winmarchain.com"}
LOOKBACK = min(max(int(os.environ.get("AUDIT_LOOKBACK_BLOCKS", "120")), 1), 300)
TIMEOUT = 15

def emit(key, value):
    print(f"{key}={str(value).lower() if isinstance(value, bool) else value}", flush=True)

def rpc(url, method, params):
    data = json.dumps({"jsonrpc": "2.0", "method": method, "params": params, "id": 1}).encode()
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            payload = json.load(response)
        if not isinstance(payload, dict) or "error" in payload or "result" not in payload:
            return None, "rpc_error_or_missing_result"
        return payload["result"], None
    except (urllib.error.URLError, ValueError, OSError, TimeoutError) as exc:
        return None, type(exc).__name__

def main():
    emit("audit_timestamp_utc", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    emit("audit_mode", "read_only")
    emit("audit_lookback_blocks", LOOKBACK)
    heads = {}
    for name, url in RPC.items():
        chain, error = rpc(url, "eth_chainId", [])
        if error or not isinstance(chain, str) or int(chain, 16) != 12142816:
            emit(f"{name}_chain_id_verified", False)
            return 1
        head, error = rpc(url, "eth_blockNumber", [])
        if error or not isinstance(head, str):
            emit(f"{name}_head_verified", False)
            return 1
        heads[name] = int(head, 16)
        emit(f"{name}_head", heads[name])
        emit(f"{name}_chain_id_verified", True)

    # Besu QBFT method is optional on public endpoints. An RPC error means unknown, not zero validators.
    for name, url in RPC.items():
        value, error = rpc(url, "qbft_getValidatorsByBlockNumber", ["latest"])
        if error:
            emit(f"{name}_qbft_validator_status", "unavailable")
            emit(f"{name}_qbft_validator_reason", error)
        elif isinstance(value, list) and all(isinstance(x, str) for x in value):
            emit(f"{name}_qbft_validator_status", "reported")
            emit(f"{name}_qbft_validator_count", len(value))
            emit(f"{name}_qbft_validator_addresses", ",".join(value))
        else:
            emit(f"{name}_qbft_validator_status", "indeterminate")

    end = min(heads.values())
    start = max(0, end - LOOKBACK + 1)
    emit("receipt_scan_start_block", start)
    emit("receipt_scan_end_block", end)
    inspected = 0
    found = 0
    verified = 0
    for height in range(end, start - 1, -1):
        block, error = rpc(RPC["primary"], "eth_getBlockByNumber", [hex(height), False])
        if error or not isinstance(block, dict):
            emit("receipt_scan_status", "incomplete")
            emit("receipt_scan_error_block", height)
            return 1
        inspected += 1
        txs = block.get("transactions", [])
        if not isinstance(txs, list):
            emit("receipt_scan_status", "invalid_transaction_list")
            return 1
        for txhash in txs[:3]:
            if not isinstance(txhash, str):
                continue
            found += 1
            a, ea = rpc(RPC["primary"], "eth_getTransactionReceipt", [txhash])
            b, eb = rpc(RPC["backup"], "eth_getTransactionReceipt", [txhash])
            if ea or eb or not isinstance(a, dict) or not isinstance(b, dict):
                emit("receipt_sample_status", "unavailable")
                continue
            expected_hash = block.get("hash")
            if (a.get("transactionHash", "").lower() == txhash.lower()
                and b.get("transactionHash", "").lower() == txhash.lower()
                and a.get("blockHash") == expected_hash
                and b.get("blockHash") == expected_hash
                and a.get("status") in ("0x0", "0x1")
                and a.get("status") == b.get("status")):
                verified += 1
                emit("receipt_sample_transaction_hash", txhash)
                emit("receipt_sample_execution_status", "success" if a["status"] == "0x1" else "reverted")
                emit("receipt_sample_consistent", True)
            else:
                emit("receipt_sample_consistent", False)
                return 1
            if verified >= 3:
                break
        if verified >= 3:
            break
    emit("receipt_blocks_inspected", inspected)
    emit("receipt_transactions_seen", found)
    emit("receipt_samples_verified", verified)
    emit("receipt_scan_status", "verified" if verified else "no_verifiable_receipts_in_sample")
    emit("qbft_consensus_health", "not_proven_by_rpc_method_alone")
    emit("bridge_end_to_end", "not_tested")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, TypeError, OverflowError) as exc:
        emit("audit_error", type(exc).__name__)
        sys.exit(1)
