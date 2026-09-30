#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-build/developer-tools}"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

npx --yes solc@0.8.30 \
  --base-path . \
  --include-path contracts \
  --bin --abi \
  contracts/WinmarTokenFactory.sol contracts/WinmarFaucet.sol \
  -o "$OUT_DIR"

test -s "$OUT_DIR/WinmarTokenFactory_sol_WinmarTokenFactory.bin"
test -s "$OUT_DIR/WinmarTokenFactory_sol_WinmarTokenFactory.abi"
test -s "$OUT_DIR/WinmarFaucet_sol_WinmarFaucet.bin"
test -s "$OUT_DIR/WinmarFaucet_sol_WinmarFaucet.abi"

echo "Developer contract artifacts built in $OUT_DIR"
