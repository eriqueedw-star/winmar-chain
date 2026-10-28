# Winmar Chain monitor for ESP32 CYD 2.8-inch touchscreen

This sketch is for the yellow ESP32-2432S028 / CYD board in the supplied photo. It uses the built-in 240×320 ILI9341 screen and XPT2046 resistive touch panel. It reads only the public Winmar Chain RPC endpoints; it does not administer validators, send transactions, or use a wallet/private key.

It checks chain ID, latest block, `eth_syncing`, and (when allowed by the gateway) the peer count reported by each public RPC. Tap the display to request an immediate refresh; otherwise it checks every 20 seconds. Swipe left or right to switch between the live RPC dashboard and a network-flow visualization. The flow page displays the WMC coin mark beside RPC status and the WINT coin mark beside the chain ID. Its animation is triggered by a newly observed RPC block, but its five city markers are illustrative only: the public RPC does not provide per-validator telemetry or identify which validator proposed a block. Alerts identify RPC or network-level problems.

The dashboard also shows the age of the last successful RPC data, Wi-Fi signal strength, and approximate block progress over the recent three-minute sample window. Cached block values remain visible during an outage, but the endpoint status and data age identify them as stale. Healthy is green, degraded/syncing/stalled is amber, and full RPC or Wi-Fi outage is red. A change between stable states flashes the status banner for several seconds. Press and hold the touchscreen for about one second to cycle through four display brightness levels; the selected level is saved on the device. No buzzer pin is assumed.

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

No extra wiring is required. The sketch uses the board's built-in TFT pins (ILI9341: GPIO 2, 15, 14, 13, 12 on HSPI) and touch-controller pins (XPT2046: GPIO 25, 32, 39, 33, 36 on the separate VSPI bus). The first boot waits six seconds and connects to Wi-Fi. It then makes a bounded attempt to obtain secure time (needed for TLS certificate validation). If NTP is slow or unavailable, the dashboard still opens with `TIME SYNC WAIT`; it keeps checking in the background and starts the TLS RPC checks automatically once time is valid. It never waits on the splash screen indefinitely. If Wi-Fi is unavailable it shows an alert and retries. Tap anywhere to request a fresh check once secure time is ready; press and hold for one second to cycle brightness. The selected brightness persists locally.

## Read the screen

- `ONLINE`: that public RPC answered with the expected chain ID and returned block/sync data.
- `OFFLINE`: the RPC request failed or returned an unexpected chain ID.
- `SYNCING`: an RPC reports synchronization in progress.
- `RPC DEGRADED`: an endpoint failed, or the public RPC block heights differ by more than five blocks.
- `BLOCK STALLED`: neither public RPC has shown block progress for three minutes.
- `RPC PEERS`: peer count returned by the primary public RPC, if that method is enabled.
- `LAST DATA`: age of the most recent successful response from either RPC; cached block numbers are not necessarily current during an outage.
- `3M BLOCKS`: observed change in the highest RPC block over the recent sample window, not a validator-specific production count.
- `WIFI`: the ESP32's local Wi-Fi signal strength in dBm.

These are public endpoint checks. Confirm an alert in AWS and inspect the relevant Besu service before taking action.
