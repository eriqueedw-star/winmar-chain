#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Arduino_GFX_Library.h>
#include <SPI.h>
#include <XPT2046_Touchscreen.h>
#include <time.h>
#include <stdlib.h>
#include <Preferences.h>

#include "secrets.h"  // Copy secrets.example.h to secrets.h and set Wi-Fi locally.
#include "winmar_logo_64.h"
#include "token_logos_30.h"

namespace {
constexpr char PRIMARY_RPC[] = "https://rpc.winmarchain.io";
constexpr char BACKUP_RPC[] = "https://rpc.winmarchain.com";
constexpr uint32_t EXPECTED_CHAIN_ID = 12142816;
constexpr uint32_t POLL_INTERVAL_MS = 20000;
constexpr uint32_t CLOCK_CHECK_INTERVAL_MS = 1000;
constexpr uint32_t CLOCK_BOOT_WAIT_MS = 12000;
constexpr uint32_t STALL_AFTER_MS = 180000;
constexpr uint32_t RPC_TIMEOUT_MS = 6000;
constexpr uint8_t DISPLAY_BACKLIGHT_PIN = 21;
constexpr uint8_t BRIGHTNESS_LEVELS[] = {88, 56, 32, 128};
constexpr uint8_t BRIGHTNESS_LEVEL_COUNT = sizeof(BRIGHTNESS_LEVELS) / sizeof(BRIGHTNESS_LEVELS[0]);
constexpr int TOUCH_SCK_PIN = 25;
constexpr int TOUCH_MISO_PIN = 39;
constexpr int TOUCH_MOSI_PIN = 32;
constexpr int TOUCH_CS_PIN = 33;
constexpr int TOUCH_IRQ_PIN = 36;

constexpr uint16_t C_BG = 0x0884;
constexpr uint16_t C_PANEL = 0x1107;
constexpr uint16_t C_WHITE = 0xFFFF;
constexpr uint16_t C_MUTED = 0x9D3B;
constexpr uint16_t C_CYAN = 0x5DFF;
constexpr uint16_t C_BLUE = 0x34BF;
constexpr uint16_t C_GOLD = 0xFEA0;
constexpr uint16_t C_GREEN = 0x5F55;
constexpr uint16_t C_RED = 0xF986;

// ESP32-2432S028 / CYD 2.8-inch ILI9341 TFT pins.
Arduino_DataBus *displayBus = new Arduino_ESP32SPI(2, 15, 14, 13, 12, HSPI);
Arduino_GFX *display = new Arduino_ILI9341(displayBus, -1, 0);
SPIClass touchSPI(VSPI);
// Poll the touch controller over SPI instead of relying on the IRQ line.
XPT2046_Touchscreen touchscreen(TOUCH_CS_PIN);
Preferences preferences;

// ISRG Root X1. TLS verification stays enabled; do not replace with setInsecure().
const char ROOT_CA[] PROGMEM = R"CERT(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)CERT";

struct EndpointStatus {
  bool available = false;
  bool syncing = false;
  bool peerCountKnown = false;
  uint32_t chainId = 0;
  uint64_t block = 0;
  uint64_t peers = 0;
};

EndpointStatus primary;
EndpointStatus backup;
String networkState = "STARTING";
uint32_t lastPollAt = 0;
uint32_t lastProgressAt = 0;
uint32_t lastDrawAt = 0;
uint32_t logoGlowUntil = 0;
uint32_t alertUntil = 0;
uint32_t noticeUntil = 0;
uint32_t lastDataAt = 0;
uint64_t lastSeenTip = 0;
uint64_t lastPrimaryObservedBlock = 0;
uint64_t lastBackupObservedBlock = 0;
uint64_t blockHistory[10] = {};
uint32_t blockHistoryAt[10] = {};
uint8_t blockHistoryCount = 0;
uint8_t blockHistoryNext = 0;
uint8_t brightnessIndex = 0;
bool hasRpcData = false;
bool firstPoll = true;
bool touchWasDown = false;
bool manualRefreshRequested = false;
bool clockReady = false;
uint32_t lastClockCheckAt = 0;
uint8_t currentPage = 0;
int16_t touchStartX = 0;
int16_t touchStartY = 0;
int16_t touchLastX = 0;
int16_t touchLastY = 0;
uint32_t touchStartAt = 0;
String alertMessage;
String uiNotice;
String lastStableState = "STARTING";

bool isStableNetworkState(const String &state) {
  return state == "HEALTHY" || state == "RPC DEGRADED" || state == "RPC OFFLINE" ||
         state == "WIFI OFFLINE" || state == "BLOCK STALLED" || state == "SYNCING";
}

void setNetworkState(const String &nextState) {
  if (nextState == networkState) return;
  if (isStableNetworkState(nextState)) {
    if (isStableNetworkState(lastStableState) && nextState != lastStableState) {
      alertMessage = nextState;
      alertUntil = millis() + 7000;
    }
    lastStableState = nextState;
  }
  networkState = nextState;
}

uint16_t networkStateColor() {
  if (networkState == "HEALTHY") return C_GREEN;
  if (networkState == "RPC OFFLINE" || networkState == "WIFI OFFLINE") return C_RED;
  return C_GOLD;
}

String dataAgeText() {
  if (!hasRpcData) return "LAST DATA  --";
  const uint32_t ageSeconds = (millis() - lastDataAt) / 1000;
  if (ageSeconds < 100) return "LAST DATA  " + String(ageSeconds) + "S AGO";
  return "LAST DATA  " + String(ageSeconds / 60) + "M AGO";
}

String wifiSignalText() {
  if (WiFi.status() != WL_CONNECTED) return "WIFI OFF";
  return "WIFI " + String(WiFi.RSSI()) + "dBm";
}

bool blocksAdvancedRecently(uint64_t &delta) {
  delta = 0;
  if (blockHistoryCount < 2) return false;
  const uint8_t latestIndex = (blockHistoryNext + 9) % 10;
  if (millis() - blockHistoryAt[latestIndex] > 180000) return false;
  uint8_t oldestIndex = latestIndex;
  uint32_t oldestAge = 0;
  for (uint8_t i = 0; i < blockHistoryCount; ++i) {
    const uint32_t age = millis() - blockHistoryAt[i];
    if (age <= 180000 && age > oldestAge) {
      oldestAge = age;
      oldestIndex = i;
    }
  }
  if (oldestAge < 20000) return false;
  if (blockHistory[latestIndex] >= blockHistory[oldestIndex])
    delta = blockHistory[latestIndex] - blockHistory[oldestIndex];
  return true;
}

void drawStatusBanner(int16_t y, int16_t height) {
  const uint16_t color = networkStateColor();
  display->fillRoundRect(12, y, 216, height, 6, color);
  if (static_cast<int32_t>(alertUntil - millis()) > 0 && millis() % 600 < 300)
    display->drawRoundRect(12, y, 216, height, 6, C_WHITE);
  display->setTextColor(C_BG);
  display->setTextSize(1);
  display->setCursor(20, y + (height - 8) / 2);
  if (static_cast<int32_t>(noticeUntil - millis()) > 0) {
    display->print(uiNotice);
  } else if (static_cast<int32_t>(alertUntil - millis()) > 0) {
    display->print("ALERT  "); display->print(alertMessage);
  } else {
    display->print("STATUS  "); display->print(networkState);
  }
}

uint64_t parseHex(const String &value) {
  if (!value.startsWith("0x") || value.length() < 3) return 0;
  return strtoull(value.c_str() + 2, nullptr, 16);
}

uint64_t currentTip() {
  if (primary.available && backup.available) return max(primary.block, backup.block);
  if (primary.available) return primary.block;
  if (backup.available) return backup.block;
  return max(primary.block, backup.block); // Cached last-known value during total outage.
}

bool rpcCall(const char *endpoint, const char *method, String &result) {
  WiFiClientSecure tls;
  tls.setCACert(ROOT_CA);
  HTTPClient http;
  http.setConnectTimeout(RPC_TIMEOUT_MS);
  http.setTimeout(RPC_TIMEOUT_MS);
  if (!http.begin(tls, endpoint)) {
    Serial.printf("RPC %s %s: HTTP begin failed\n", endpoint, method);
    return false;
  }

  JsonDocument request;
  request["jsonrpc"] = "2.0";
  request["method"] = method;
  request["params"].to<JsonArray>();
  request["id"] = 1;
  String payload;
  serializeJson(request, payload);
  http.addHeader("Content-Type", "application/json");
  const int code = http.POST(payload);
  if (code < 200 || code >= 300) {
    char tlsError[128] = "";
    const int tlsErrorCode = tls.lastError(tlsError, sizeof(tlsError));
    Serial.printf("RPC %s %s: HTTP %d (%s); TLS %d: %s; Wi-Fi status %d RSSI %d dBm\n",
      endpoint, method, code, http.errorToString(code).c_str(), tlsErrorCode, tlsError,
      static_cast<int>(WiFi.status()), WiFi.RSSI());
    http.end();
    return false;
  }

  const String responseBody = http.getString();
  http.end();
  JsonDocument response;
  const DeserializationError error = deserializeJson(response, responseBody);
  if (error) {
    const String preview = responseBody.substring(0, 160);
    Serial.printf("RPC %s %s: JSON parse failed: %s; body bytes=%u; preview=%s\n",
      endpoint, method, error.c_str(), static_cast<unsigned>(responseBody.length()), preview.c_str());
    return false;
  }
  if (response["error"].is<JsonObject>()) {
    String rpcError;
    serializeJson(response["error"], rpcError);
    Serial.printf("RPC %s %s: JSON-RPC error %s\n", endpoint, method, rpcError.c_str());
    return false;
  }
  if (response["result"].isUnbound()) {
    Serial.printf("RPC %s %s: response has no result field\n", endpoint, method);
    return false;
  }
  const JsonVariantConst value = response["result"];
  if (value.is<const char *>()) result = value.as<const char *>();
  else serializeJson(value, result);
  return true;
}

bool readEndpoint(const char *url, EndpointStatus &status) {
  String result;
  // Keep the last known values visible during outages; `available` and the
  // last-data age make it clear that those values are cached, not live.
  status.available = false;
  status.syncing = false;
  status.peerCountKnown = false;
  if (!rpcCall(url, "eth_chainId", result)) return false;
  status.chainId = static_cast<uint32_t>(parseHex(result));
  if (status.chainId != EXPECTED_CHAIN_ID) return false;
  if (!rpcCall(url, "eth_blockNumber", result)) return false;
  status.block = parseHex(result);
  if (status.block == 0) return false;
  if (!rpcCall(url, "eth_syncing", result)) return false;
  status.syncing = result != "false";
  if (rpcCall(url, "net_peerCount", result)) {
    status.peers = parseHex(result);
    status.peerCountKnown = true;
  }
  status.available = true;
  return true;
}

void drawBrandMark(int16_t x, int16_t y) {
  display->draw16bitRGBBitmap(x, y, WINMAR_LOGO_64, 64, 64);
}

void drawSplash(const char *message, uint8_t progress) {
  display->fillScreen(C_BG);
  display->drawRoundRect(10, 10, 220, 300, 14, C_BLUE);
  display->drawRoundRect(14, 14, 212, 292, 11, C_CYAN);
  drawBrandMark(88, 53);
  display->setTextColor(C_WHITE); display->setTextSize(2); display->setCursor(48, 135);
  display->print("WINMAR CHAIN");
  display->setTextColor(C_MUTED); display->setTextSize(1); display->setCursor(51, 168);
  display->print("CAPITAL  -  TECHNOLOGY");
  display->setCursor(84, 181); display->print("INTELLIGENCE");
  display->setTextColor(C_CYAN); display->setCursor(42, 220); display->print(message);
  display->drawRoundRect(36, 248, 168, 9, 4, C_MUTED);
  display->fillRoundRect(38, 250, (160 * progress) / 100, 5, 2, C_CYAN);
  display->setTextColor(C_MUTED); display->setCursor(89, 269); display->print("STARTING");
}

void drawEndpointRow(int y, const char *label, const EndpointStatus &s, uint16_t accent) {
  const uint16_t color = s.available ? (s.syncing ? C_GOLD : C_GREEN) : C_RED;
  display->fillRoundRect(12, y, 216, 25, 5, C_PANEL);
  display->fillRoundRect(12, y, 3, 25, 1, accent);
  display->setTextColor(C_WHITE); display->setTextSize(1); display->setCursor(21, y + 8); display->print(label);
  display->setTextColor(color); display->setCursor(176, y + 8);
  display->print(!s.available ? "OFFLINE" : (s.syncing ? "SYNCING" : "ONLINE"));
}

void drawFlowDashboard() {
  display->fillScreen(C_BG);
  display->setTextColor(C_WHITE); display->setTextSize(2); display->setCursor(12, 10); display->print("WINMAR CHAIN");
  display->setTextColor(C_MUTED); display->setTextSize(1); display->setCursor(13, 29); display->print("ILLUSTRATIVE RPC BLOCK FLOW");
  display->drawFastHLine(10, 41, 220, C_BLUE);
  display->drawRoundRect(10, 45, 220, 155, 10, C_BLUE);

  const int16_t nodeX[] = {120, 48, 192, 48, 192};
  const int16_t nodeY[] = {70, 116, 116, 169, 169};
  const int16_t targetX[] = {120, 88, 152, 88, 152};
  const int16_t targetY[] = {99, 119, 119, 157, 157};
  const uint16_t nodeColors[] = {C_CYAN, C_GOLD, 0xB89F, C_GREEN, 0xF8B2};
  const char *nodeNames[] = {"SYDNEY", "STOCKHOLM", "SINGAPORE", "TOKYO 2", "TOKYO 7"};
  const int16_t labelX[] = {99, 13, 171, 15, 175};
  const int16_t labelY[] = {53, 96, 96, 183, 183};

  const bool glow = static_cast<int32_t>(logoGlowUntil - millis()) > 0;
  for (uint8_t i = 0; i < 5; ++i) {
    display->drawLine(nodeX[i], nodeY[i], targetX[i], targetY[i], glow ? nodeColors[i] : C_MUTED);
    if (glow) {
      const float progress = (millis() % 720) / 720.0f;
      const int16_t packetX = nodeX[i] + static_cast<int16_t>((targetX[i] - nodeX[i]) * progress);
      const int16_t packetY = nodeY[i] + static_cast<int16_t>((targetY[i] - nodeY[i]) * progress);
      display->fillCircle(packetX, packetY, 3, nodeColors[i]);
    }
    display->fillCircle(nodeX[i], nodeY[i], 4, nodeColors[i]);
    display->setTextColor(C_WHITE); display->setTextSize(1); display->setCursor(labelX[i], labelY[i]); display->print(nodeNames[i]);
  }

  display->drawRoundRect(83, 94, 74, 76, 9, glow ? C_GOLD : C_CYAN);
  if (glow) display->drawRoundRect(86, 97, 68, 70, 7, C_CYAN);
  drawBrandMark(88, 99);
  display->fillRect(84, 163, 72, 35, C_BG);
  display->setTextColor(C_MUTED); display->setTextSize(1); display->setCursor(91, 166); display->print("LATEST BLOCK");
  display->setTextColor(C_WHITE); display->setTextSize(1); display->setCursor(98, 180);
  const uint64_t tip = currentTip();
  if (tip) display->print(static_cast<unsigned long>(tip)); else display->print("--");

  // Separate, aligned information cards keep the tiny display easy to scan.
  display->drawRoundRect(12, 202, 216, 39, 6, C_BLUE);
  display->draw16bitRGBBitmap(16, 206, WMC_COIN_30, 30, 30);
  display->setTextColor(C_WHITE); display->setCursor(51, 207); display->print("WMC  RPC HEALTH");
  display->setTextColor(primary.available ? C_GREEN : C_RED); display->setCursor(51, 220);
  display->print(".IO  "); display->print(primary.available ? "UP" : "DOWN");
  display->setTextColor(backup.available ? C_GREEN : C_RED); display->setCursor(132, 220);
  display->print(".COM  "); display->print(backup.available ? "UP" : "DOWN");
  display->drawFastHLine(51, 231, 174, C_BLUE);
  display->setTextColor(C_MUTED); display->setCursor(51, 233); display->print("PEERS");
  display->setTextColor(C_WHITE); display->setCursor(83, 233);
  if (primary.peerCountKnown) display->print(static_cast<unsigned long>(primary.peers)); else display->print("--");
  display->setTextColor(C_MUTED); display->setCursor(132, 233); display->print("TIP GAP");
  display->setTextColor(C_WHITE); display->setCursor(177, 233);
  if (primary.available && backup.available) {
    const uint64_t gap = primary.block > backup.block ? primary.block - backup.block : backup.block - primary.block;
    display->print(static_cast<unsigned long>(gap));
  } else display->print("--");

  display->drawRoundRect(12, 243, 216, 30, 6, C_BLUE);
  display->draw16bitRGBBitmap(16, 243, WINT_COIN_30, 30, 30);
  display->setTextColor(C_WHITE); display->setCursor(51, 245); display->print("WINT  WINMAR TOKEN");
  display->setTextColor(C_MUTED); display->setCursor(51, 258); display->print("CHAIN ID 12142816");
  display->setTextColor((primary.syncing || backup.syncing) ? C_GOLD : C_GREEN); display->setCursor(166, 258);
  display->print((primary.syncing || backup.syncing) ? "SYNC YES" : "SYNC NO");

  drawStatusBanner(276, 22);
  display->setTextColor(C_MUTED); display->setCursor(16, 302); display->print(dataAgeText());
  display->setCursor(153, 302); display->print(wifiSignalText());
  display->setCursor(34, 312); display->print("SWIPE BACK  |  TAP REFRESH");
}

void drawDashboard() {
  display->fillScreen(C_BG);
  display->drawFastHLine(10, 37, 220, C_BLUE);
  display->setTextColor(C_WHITE); display->setTextSize(2); display->setCursor(12, 10); display->print("WINMAR CHAIN");
  display->setTextColor(C_MUTED); display->setTextSize(1); display->setCursor(13, 29); display->print("READ-ONLY NETWORK WATCH");
  drawEndpointRow(45, "PRIMARY  .IO", primary, C_CYAN);
  drawEndpointRow(74, "BACKUP   .COM", backup, C_GOLD);

  const uint64_t tip = currentTip();
  const bool glow = static_cast<int32_t>(logoGlowUntil - millis()) > 0;
  const uint16_t glowColor = glow ? C_GOLD : C_BLUE;
  display->drawRoundRect(12, 108, 216, 91, 10, glowColor);
  if (glow) display->drawRoundRect(15, 111, 210, 85, 8, C_CYAN);
  drawBrandMark(24, 122);
  display->setTextColor(C_MUTED); display->setTextSize(1); display->setCursor(99, 121); display->print("LATEST BLOCK");
  display->setTextColor(C_WHITE); display->setTextSize(2); display->setCursor(99, 140);
  if (tip) display->print(static_cast<unsigned long>(tip)); else display->print("--");
  display->setTextColor(glow ? C_GOLD : C_CYAN); display->setTextSize(1); display->setCursor(99, 170);
  display->print(glow ? "NEW BLOCK RECEIVED" : "WINMAR MAINNET");

  display->setTextColor(C_MUTED); display->setCursor(14, 214); display->print("CHAIN ID");
  display->setTextColor(C_WHITE); display->setCursor(77, 214); display->print("12142816");
  display->setTextColor(C_MUTED); display->setCursor(14, 234); display->print("SYNC");
  display->setTextColor((primary.syncing || backup.syncing) ? C_GOLD : C_GREEN); display->setCursor(77, 234);
  display->print((primary.syncing || backup.syncing) ? "ACTIVE" : "NO");
  display->setTextColor(C_MUTED); display->setCursor(135, 234); display->print("RPC PEERS");
  display->setTextColor(C_WHITE); display->setCursor(195, 234);
  if (primary.peerCountKnown) display->print(static_cast<unsigned long>(primary.peers)); else display->print("--");

  uint64_t recentBlocks = 0;
  display->setTextColor(C_MUTED); display->setTextSize(1); display->setCursor(14, 249); display->print("3M BLOCKS ");
  display->setTextColor(C_WHITE); display->setCursor(80, 249);
  if (blocksAdvancedRecently(recentBlocks)) { display->print("+"); display->print(static_cast<unsigned long>(recentBlocks)); }
  else display->print("--");
  display->setTextColor(C_CYAN); display->setCursor(145, 249); display->print(wifiSignalText());
  display->setTextColor(C_MUTED); display->setCursor(14, 261); display->print(dataAgeText());
  drawStatusBanner(272, 24);
  display->setTextColor(C_MUTED); display->setCursor(42, 302);
  display->print("SWIPE FLOW  |  TAP REFRESH");
  display->setCursor(42, 312); display->print("HOLD 1 SEC: BRIGHTNESS");
}

void drawCurrentPage() {
  if (currentPage == 1) drawFlowDashboard();
  else drawDashboard();
}

void pollNetwork() {
  const bool pOk = readEndpoint(PRIMARY_RPC, primary);
  const bool bOk = readEndpoint(BACKUP_RPC, backup);
  const bool anyRpc = pOk || bOk;
  const bool bothRpc = pOk && bOk;
  const uint64_t tip = currentTip();
  const uint32_t now = millis();
  if (anyRpc) {
    hasRpcData = true;
    lastDataAt = now;
  }
  if (anyRpc) {
    blockHistory[blockHistoryNext] = tip;
    blockHistoryAt[blockHistoryNext] = now;
    blockHistoryNext = (blockHistoryNext + 1) % 10;
    if (blockHistoryCount < 10) ++blockHistoryCount;
  }
  const bool blockProgress = (pOk && primary.block > lastPrimaryObservedBlock) ||
                             (bOk && backup.block > lastBackupObservedBlock);
  if (pOk) lastPrimaryObservedBlock = primary.block;
  if (bOk) lastBackupObservedBlock = backup.block;
  if (tip > lastSeenTip) {
    if (lastSeenTip != 0) logoGlowUntil = now + 1800;
    lastSeenTip = tip;
  }
  if (blockProgress) {
    lastProgressAt = now;
  }
  if (firstPoll) { lastProgressAt = now; firstPoll = false; }
  const uint64_t gap = bothRpc ? (primary.block > backup.block ? primary.block - backup.block : backup.block - primary.block) : 0;
  const bool syncing = (pOk && primary.syncing) || (bOk && backup.syncing);
  if (!anyRpc) setNetworkState("RPC OFFLINE");
  else if (!bothRpc || gap > 5) setNetworkState("RPC DEGRADED");
  else if (syncing) setNetworkState("SYNCING");
  else if (now - lastProgressAt > STALL_AFTER_MS) setNetworkState("BLOCK STALLED");
  else setNetworkState("HEALTHY");

  Serial.printf(".io %s chain=%lu block=%llu sync=%s peers=%s%llu\n",
    pOk ? "OK" : "DOWN", static_cast<unsigned long>(primary.chainId),
    static_cast<unsigned long long>(primary.block), primary.syncing ? "yes" : "no",
    primary.peerCountKnown ? "" : "n/a ", static_cast<unsigned long long>(primary.peers));
  Serial.printf(".com %s chain=%lu block=%llu sync=%s peers=%s%llu\n",
    bOk ? "OK" : "DOWN", static_cast<unsigned long>(backup.chainId),
    static_cast<unsigned long long>(backup.block), backup.syncing ? "yes" : "no",
    backup.peerCountKnown ? "" : "n/a ", static_cast<unsigned long long>(backup.peers));
  Serial.printf("Network: %s\n", networkState.c_str());
  lastPollAt = now;
}

bool connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 25000) {
    drawSplash("CONNECTING TO WI-FI", static_cast<uint8_t>(min(95UL, (millis() - start) * 95UL / 25000UL)));
    delay(120);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("Wi-Fi connected: %s RSSI %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    return true;
  }
  Serial.printf("Wi-Fi connect timeout; status %d\n", static_cast<int>(WiFi.status()));
  return false;
}

bool syncClock() {
  configTime(0, 0, "pool.ntp.org", "time.cloudflare.com");
  const uint32_t start = millis();
  while (time(nullptr) < 1700000000 && millis() - start < CLOCK_BOOT_WAIT_MS) {
    drawSplash("SETTING SECURE CLOCK", 55 + static_cast<uint8_t>(min(20UL, (millis() - start) * 20UL / CLOCK_BOOT_WAIT_MS)));
    delay(250);
  }
  return time(nullptr) >= 1700000000;
}
} // namespace

void setup() {
  Serial.begin(115200);
  pinMode(DISPLAY_BACKLIGHT_PIN, OUTPUT);
  preferences.begin("wmc-mon", false);
  brightnessIndex = preferences.getUChar("bright", 0);
  if (brightnessIndex >= BRIGHTNESS_LEVEL_COUNT) brightnessIndex = 0;
  analogWrite(DISPLAY_BACKLIGHT_PIN, BRIGHTNESS_LEVELS[brightnessIndex]);
  if (!display->begin()) {
    Serial.println("Display initialization failed; check board variant/controller.");
    while (true) delay(1000);
  }
  display->setRotation(0); // Portrait 240 x 320.
  touchSPI.begin(TOUCH_SCK_PIN, TOUCH_MISO_PIN, TOUCH_MOSI_PIN, TOUCH_CS_PIN);
  const bool touchReady = touchscreen.begin(touchSPI);
  touchscreen.setRotation(0);
  Serial.printf("Touch controller init: %s (polled SPI)\n", touchReady ? "OK" : "FAILED");
  drawSplash("INITIALIZING", 15);
  delay(6000);
  if (!connectWifi()) {
    setNetworkState("WIFI OFFLINE");
    drawDashboard();
    return;
  }
  clockReady = syncClock();
  if (!clockReady) {
    setNetworkState("TIME SYNC WAIT");
    lastClockCheckAt = millis();
    Serial.println("NTP time not available yet; continuing to dashboard and retrying in background.");
  } else {
    pollNetwork();
  }
  drawDashboard();
}

void loop() {
  const bool isTouched = touchscreen.touched();
  if (isTouched) {
    const TS_Point point = touchscreen.getPoint();
    if (!touchWasDown) {
      touchStartX = point.x;
      touchStartY = point.y;
      touchStartAt = millis();
    }
    touchLastX = point.x;
    touchLastY = point.y;
  } else if (touchWasDown) {
    const int16_t dx = abs(touchLastX - touchStartX);
    const int16_t dy = abs(touchLastY - touchStartY);
    if (max(dx, dy) > 650) {
      currentPage = currentPage == 0 ? 1 : 0;
      manualRefreshRequested = false;
      Serial.printf("Swipe detected; showing %s page.\n", currentPage == 1 ? "network flow" : "RPC status");
    } else if (millis() - touchStartAt >= 900) {
      brightnessIndex = (brightnessIndex + 1) % BRIGHTNESS_LEVEL_COUNT;
      analogWrite(DISPLAY_BACKLIGHT_PIN, BRIGHTNESS_LEVELS[brightnessIndex]);
      preferences.putUChar("bright", brightnessIndex);
      uiNotice = "BRIGHTNESS " + String(BRIGHTNESS_LEVELS[brightnessIndex]) + "/255";
      noticeUntil = millis() + 2500;
      Serial.printf("Display brightness changed to %u/255.\n", BRIGHTNESS_LEVELS[brightnessIndex]);
    } else if (clockReady) {
      manualRefreshRequested = true;
      setNetworkState("CHECKING RPC");
      Serial.println("Touch detected; refreshing public RPC status.");
    } else {
      setNetworkState("TIME SYNC WAIT");
      Serial.println("Touch detected; waiting for secure time before TLS RPC checks.");
    }
    drawCurrentPage();
  }
  touchWasDown = isTouched;
  if (WiFi.status() != WL_CONNECTED) {
    setNetworkState("WIFI OFFLINE");
    drawDashboard();
    delay(1000);
    if (!connectWifi()) return;
    clockReady = syncClock();
    lastClockCheckAt = millis();
    if (clockReady) lastPollAt = 0;
    else setNetworkState("TIME SYNC WAIT");
  }
  if (!clockReady && WiFi.status() == WL_CONNECTED && millis() - lastClockCheckAt >= CLOCK_CHECK_INTERVAL_MS) {
    lastClockCheckAt = millis();
    clockReady = time(nullptr) >= 1700000000;
    if (clockReady) {
      Serial.println("Secure clock synchronized; starting RPC checks.");
      lastPollAt = 0;
    } else {
      setNetworkState("TIME SYNC WAIT");
    }
  }
  if (clockReady && (manualRefreshRequested || millis() - lastPollAt >= POLL_INTERVAL_MS)) {
    manualRefreshRequested = false;
    pollNetwork();
  }
  if (millis() - lastDrawAt >= 250) {
    drawCurrentPage();
    lastDrawAt = millis();
  }
  delay(20);
}
