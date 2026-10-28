# Winmar Chain monitor for ESP32 CYD 2.8-inch touchscreen

This sketch is for the yellow ESP32-2432S028 / CYD board in the supplied photo. It uses the built-in 240×320 ILI9341 screen and XPT2046 resistive touch panel. It reads only the public Winmar Chain RPC endpoints; it does not administer validators, send transactions, or use a wallet/private key.

It checks chain ID, latest block, `eth_syncing`, and (when allowed by the gateway) the peer count reported by each public RPC. Touch the display to request an immediate refresh; otherwise it checks every 20 seconds. A new block observed at either RPC briefly lights the logo panel. Alerts identify RPC or network-level problems.

Important: this can monitor the public RPC gateways, not Besu separately on each validator. The peer count is the count reported by the RPC gateway, not a per-validator count. The screen must not be treated as proof that every validator is healthy. Per-node Besu checks need a separate, secured health service; do not expose Besu admin ports to the public internet.

## Arduino IDE

1. Install the Espressif ESP32 board package in Boards Manager.
2. Select `ESP32 Dev Module`, portrait display, and a 4 MB flash setting. Use a USB data cable.
3. Install these libraries through Library Manager:
   - Arduino_GFX_Library
   - ArduinoJson (v7)
   - XPT2046_Touchscreen by Paul Stoffregen
4. Copy `secrets.example.h` to `secrets.h` in this folder. Put your Wi-Fi name/password in `secrets.h` locally; do not paste them into chat or publish that file.
5. Open `esp32-cyd-monitor.ino`, choose the board's serial port, then upload. If upload fails, hold BOOT while starting upload and release when writing begins.
6. Open Serial Monitor at 115200 baud for endpoint details.

No extra wiring is required. The sketch uses the board's built-in TFT pins (ILI9341: GPIO 2, 15, 14, 13, 12 on HSPI) and touch-controller pins (XPT2046: GPIO 25, 32, 39, 33, 36 on the separate VSPI bus). The first boot waits six seconds, connects to Wi-Fi, waits for secure time (needed for TLS certificate validation), then reads both RPCs. If Wi-Fi is unavailable it shows an alert and retries. Touch anywhere on the screen to request a fresh check immediately.

## Read the screen

- `ONLINE`: that public RPC answered with the expected chain ID and returned block/sync data.
- `OFFLINE`: the RPC request failed or returned an unexpected chain ID.
- `SYNCING`: an RPC reports synchronization in progress.
- `RPC DEGRADED`: an endpoint failed, or the public RPC block heights differ by more than five blocks.
- `BLOCK STALLED`: neither public RPC has shown block progress for three minutes.
- `RPC PEERS`: peer count returned by the primary public RPC, if that method is enabled.

These are public endpoint checks. Confirm an alert in AWS and inspect the relevant Besu service before taking action.
