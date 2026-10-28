# Winmar Chain ESP32 network monitor

This read-only monitor checks the public primary and backup RPC endpoints every 20 seconds. It verifies chain ID `12142816`, reads each endpoint's block height and sync state, compares their tip heights, and optionally displays the peer count reported by the RPC gateway. A stalled chain tip for 90 seconds, an unavailable endpoint, unexpected chain ID, syncing response, or RPC divergence over five blocks raises the onboard LED alert. It never sends transactions or connects to validator administration.

## Hardware

- ESP32 DevKit (ESP32-WROOM-32 or compatible)
- 128×64 SSD1306 I²C OLED, commonly sold as a 0.96-inch module
- Optional: external LED plus 220–330 Ω resistor if the board has no onboard LED

OLED wiring on a typical ESP32 DevKit:

| OLED | ESP32 |
|---|---|
| VCC | 3V3 |
| GND | GND |
| SDA | GPIO 21 |
| SCL | GPIO 22 |

The sketch assumes OLED I²C address `0x3C` and an onboard alert LED on GPIO 2. Change `OLED_ADDRESS` or `ALERT_LED_PIN` near the top of the sketch for different hardware.

## Arduino IDE setup

1. Install Espressif's `esp32` board package and select the matching ESP32 board.
2. Install libraries `ArduinoJson` (v7), `Adafruit GFX Library`, and `Adafruit SSD1306` from Library Manager.
3. Copy `secrets.example.h` to `secrets.h` in this folder, then set your Wi-Fi name and password there. Do not commit or paste your Wi-Fi password into chat.
4. Open `esp32-network-monitor.ino`, select the correct board/port, and upload. Open Serial Monitor at 115200 baud if you want the detailed endpoint readings.

The sketch validates TLS against the Let's Encrypt ISRG Root X1 CA and uses NTP before polling. If a future endpoint certificate chain uses a different root CA, TLS will fail closed and the sketch will show the endpoint as down; update the trusted CA only from an authoritative certificate source.

## What the display means

- `HEALTHY`: both RPCs answer for the expected chain, report not syncing, and the observed tip advances.
- `RPC DEGRADED`: one RPC failed or the two RPC tips differ by more than five blocks.
- `SYNCING`: at least one RPC reports active synchronization.
- `BLOCK STALLED`: neither endpoint has shown a higher block for 90 seconds.
- `RPC OFFLINE` / `WIFI OFFLINE`: no public RPC or Wi-Fi connection is available.

The `Peers` value is what the primary RPC gateway reports, not the peer count of every validator. These public endpoints cannot confirm each validator's Besu service, sync state, or peer count individually. For that, use a server-side monitoring service that polls each validator over a private, restricted management network and publishes a sanitized, read-only status API; never expose validator/admin RPC ports directly to the internet.
