#!/usr/bin/env bash
set -e
rpc() {
  curl -s -X POST -H 'Content-Type: application/json' \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"$1\",\"params\":$2,\"id\":1}" \
    http://127.0.0.1:8545
  echo
}
hostname
systemctl is-active besu-validator.service
rpc eth_blockNumber '[]'
rpc net_peerCount '[]'
rpc eth_syncing '[]'
rpc qbft_getValidatorsByBlockNumber '["latest"]'
