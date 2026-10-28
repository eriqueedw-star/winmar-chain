#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Arduino_GFX_Library.h>
#include <SPI.h>
#include <XPT2046_Touchscreen.h>
#include <time.h>
#include <stdlib.h>

#include "secrets.h"  // Copy secrets.example.h to secrets.h and set Wi-Fi locally.
#include "winmar_logo_64.h"

namespace {
constexpr char PRIMARY_RPC[] = "https://rpc.winmarchain.io";
constexpr char BACKUP_RPC[] = "https://rpc.winmarchain.com";
constexpr uint32_t EXPECTED_CHAIN_ID = 12142816;
constexpr uint32_t POLL_INTERVAL_MS = 20000;
constexpr uint32_t STALL_AFTER_MS = 180000;
constexpr uint32_t RPC_TIMEOUT_MS = 6000;
constexpr uint8_t DISPLAY_BACKLIGHT_PIN = 21;
constexpr int TOUCH_SCK_PIN = 25;
constexpr int TOUCH_MISO_PIN = 39;
constexpr int TOUCH_MOSI_PIN = 32;
constexpr int TOUCH_CS_PIN = 33;
constexpr int TOUCH_IRQ_PIN = 36;

constexpr uint16_t C_BG = 0x08A4;
constexpr uint16_t C_PANEL = 0x10A4;
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
XPT2046_Touchscreen touchscreen(TOUCH_CS_PIN, TOUCH_IRQ_PIN);

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
uint64_t lastSeenTip = 0;
bool firstPoll = true;
bool touchWasDown = false;
bool manualRefreshRequested = false;

uint64_t parseHex(const String &value) {
  if (!value.startsWith("0x") || value.length() < 3) return 0;
  return strtoull(value.c_str() + 2, nullptr, 16);
}

bool rpcCall(const char *endpoint, const char *method, String &result) {
  WiFiClientSecure tls;
  tls.setCACert(ROOT_CA);
  HTTPClient http;
  http.setConnectTimeout(RPC_TIMEOUT_MS);
  http.setTimeout(RPC_TIMEOUT_MS);
  if (!http.begin(tls, endpoint)) return false;

  JsonDocument request;
  request["jsonrpc"] = "2.0";
  request["method"] = method;
  request["params"].to<JsonArray>();
  request["id"] = 1;
  String payload;
  serializeJson(request, payload);
  http.addHeader("Content-Type", "application/json");
  const int code = http.POST(payload);
  if (code < 200 || code >= 300) { http.end(); return false; }

  JsonDocument response;
  const DeserializationError error = deserializeJson(response, http.getStream());
  http.end();
  if (error || response["error"].is<JsonObject>() || response["result"].isUnbound()) return false;
  const JsonVariantConst value = response["result"];
  if (value.is<const char *>()) result = value.as<const char *>();
  else serializeJson(value, result);
  return true;
}

bool readEndpoint(const char *url, EndpointStatus &status) {
  String result;
  status = EndpointStatus{};
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
  drawBrandMark(88, 60);
  display->setTextColor(C_WHITE); display->setTextSize(2); display->setCursor(34, 142);
  display->print("WINMAR CHAIN");
  display->setTextColor(C_MUTED); display->setTextSize(1); display->setCursor(49, 171);
  display->print("CAPITAL  TECHNOLOGY  INTELLIGENCE");
  display->setTextColor(C_CYAN); display->setCursor(42, 222); display->print(message);
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

void drawDashboard() {
  display->fillScreen(C_BG);
  display->drawFastHLine(10, 37, 220, C_BLUE);
  display->setTextColor(C_WHITE); display->setTextSize(2); display->setCursor(12, 10); display->print("WINMAR CHAIN");
  display->setTextColor(C_MUTED); display->setTextSize(1); display->setCursor(13, 29); display->print("READ-ONLY NETWORK WATCH");
  drawEndpointRow(45, "PRIMARY  .IO", primary, C_CYAN);
  drawEndpointRow(74, "BACKUP   .COM", backup, C_GOLD);

  const uint64_t tip = max(primary.block, backup.block);
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

  uint16_t stateColor = C_GREEN;
  if (networkState != "HEALTHY") stateColor = (networkState == "BLOCK STALLED" || networkState == "RPC OFFLINE") ? C_RED : C_GOLD;
  display->fillRoundRect(12, 263, 216, 27, 6, stateColor);
  display->setTextColor(C_BG); display->setTextSize(1); display->setCursor(20, 273); display->print("STATUS  "); display->print(networkState);
  display->setTextColor(C_MUTED); display->setCursor(42, 302); display->print("TOUCH TO REFRESH  |  RPC ONLY");
}

void pollNetwork() {
  const bool pOk = readEndpoint(PRIMARY_RPC, primary);
  const bool bOk = readEndpoint(BACKUP_RPC, backup);
  const bool anyRpc = pOk || bOk;
  const bool bothRpc = pOk && bOk;
  const uint64_t tip = max(primary.block, backup.block);
  const uint32_t now = millis();
  if (tip > lastSeenTip) {
    if (lastSeenTip != 0) logoGlowUntil = now + 1800;
    lastSeenTip = tip;
    lastProgressAt = now;
  }
  if (firstPoll) { lastProgressAt = now; firstPoll = false; }
  const uint64_t gap = bothRpc ? (primary.block > backup.block ? primary.block - backup.block : backup.block - primary.block) : 0;
  const bool syncing = (pOk && primary.syncing) || (bOk && backup.syncing);
  if (!anyRpc) networkState = "RPC OFFLINE";
  else if (!bothRpc || gap > 5) networkState = "RPC DEGRADED";
  else if (syncing) networkState = "SYNCING";
  else if (now - lastProgressAt > STALL_AFTER_MS) networkState = "BLOCK STALLED";
  else networkState = "HEALTHY";

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
    Serial.printf("Wi-Fi connected: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }
  return false;
}

bool syncClock() {
  configTime(0, 0, "pool.ntp.org", "time.cloudflare.com");
  const uint32_t start = millis();
  while (time(nullptr) < 1700000000 && millis() - start < 20000) delay(250);
  return time(nullptr) >= 1700000000;
}
} // namespace

void setup() {
  Serial.begin(115200);
  pinMode(DISPLAY_BACKLIGHT_PIN, OUTPUT);
  digitalWrite(DISPLAY_BACKLIGHT_PIN, HIGH);
  if (!display->begin()) {
    Serial.println("Display initialization failed; check board variant/controller.");
    while (true) delay(1000);
  }
  display->setRotation(0); // Portrait 240 x 320.
  touchSPI.begin(TOUCH_SCK_PIN, TOUCH_MISO_PIN, TOUCH_MOSI_PIN, TOUCH_CS_PIN);
  touchscreen.begin(touchSPI);
  touchscreen.setRotation(0);
  drawSplash("INITIALIZING", 15);
  delay(6000);
  if (!connectWifi()) {
    networkState = "WIFI OFFLINE";
    drawDashboard();
    return;
  }
  drawSplash("SETTING SECURE CLOCK", 55);
  while (!syncClock()) {
    Serial.println("NTP unavailable; TLS check waits for a valid clock.");
    drawSplash("WAITING FOR SECURE TIME", 60);
    delay(5000);
  }
  pollNetwork();
  drawDashboard();
}

void loop() {
  const bool isTouched = touchscreen.touched();
  if (isTouched && !touchWasDown) manualRefreshRequested = true;
  touchWasDown = isTouched;
  if (WiFi.status() != WL_CONNECTED) {
    networkState = "WIFI OFFLINE";
    drawDashboard();
    delay(1000);
    if (!connectWifi()) return;
    if (!syncClock()) return;
    lastPollAt = 0;
  }
  if (manualRefreshRequested || millis() - lastPollAt >= POLL_INTERVAL_MS) {
    manualRefreshRequested = false;
    pollNetwork();
  }
  if (millis() - lastDrawAt >= 250) {
    drawDashboard();
    lastDrawAt = millis();
  }
  delay(20);
}
