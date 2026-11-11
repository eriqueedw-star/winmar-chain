#!/usr/bin/env bash
# Keep this script LF-only so GitHub's Linux runners can execute it directly.
set -euo pipefail

OUT_DIR="${1:-build/developer-tools}"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

npx --yes solc@0.8.19 \
  --base-path . \
  --include-path contracts \
  --optimize \
  --bin --abi \
  contracts/WinmarTokenFactory.sol contracts/WinmarFaucet.sol \
  -o "$OUT_DIR"

test -s "$OUT_DIR/contracts_WinmarTokenFactory_sol_WinmarTokenFactory.bin"
test -s "$OUT_DIR/contracts_WinmarTokenFactory_sol_WinmarTokenFactory.abi"
test -s "$OUT_DIR/contracts_WinmarFaucet_sol_WinmarFaucet.bin"
test -s "$OUT_DIR/contracts_WinmarFaucet_sol_WinmarFaucet.abi"

echo "Developer contract artifacts built in $OUT_DIR"
