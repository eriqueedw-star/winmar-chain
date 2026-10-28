#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include <stdlib.h>

#include "secrets.h"  // Copy secrets.example.h to secrets.h and enter Wi-Fi locally.

namespace {
constexpr char PRIMARY_RPC[] = "https://rpc.winmarchain.io";
constexpr char BACKUP_RPC[] = "https://rpc.winmarchain.com";
constexpr uint32_t EXPECTED_CHAIN_ID = 12142816;
constexpr uint32_t POLL_INTERVAL_MS = 20000;
constexpr uint32_t STALL_AFTER_MS = 90000;
constexpr uint32_t RPC_TIMEOUT_MS = 7000;

constexpr int OLED_WIDTH = 128;
constexpr int OLED_HEIGHT = 64;
constexpr int OLED_RESET = -1;
constexpr uint8_t OLED_ADDRESS = 0x3C;
constexpr int ALERT_LED_PIN = 2;  // Common ESP32 DevKit onboard LED; change for your board.
constexpr uint8_t LED_ON_LEVEL = HIGH;

// ISRG Root X1, fetched from Let's Encrypt's official certificate repository.
// This validates TLS for the two RPC endpoints observed on 2026-10-14.
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

Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, OLED_RESET);

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
uint64_t lastSeenTip = 0;
uint32_t lastProgressAt = 0;
uint32_t lastPollAt = 0;
bool firstPoll = true;
String networkState = "STARTING";

bool rpcResult(const char* endpoint, const char* method, String& resultJson) {
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
  const int httpCode = http.POST(payload);
  if (httpCode < 200 || httpCode >= 300) {
    http.end();
    return false;
  }

  const String body = http.getString();
  http.end();
  JsonDocument response;
  if (deserializeJson(response, body) || response["error"].is<JsonObject>() || response["result"].isUnbound()) {
    return false;
  }
  const JsonVariantConst value = response["result"];
  if (value.is<const char*>()) resultJson = value.as<const char*>();
  else serializeJson(value, resultJson);
  return true;
}

uint64_t parseHex(const String& value) {
  if (!value.startsWith("0x") || value.length() < 3) return 0;
  return strtoull(value.c_str() + 2, nullptr, 16);
}

bool readEndpoint(const char* endpoint, EndpointStatus& out) {
  String result;
  if (!rpcResult(endpoint, "eth_chainId", result)) return false;
  out.chainId = static_cast<uint32_t>(parseHex(result));
  if (out.chainId != EXPECTED_CHAIN_ID) return false;

  if (!rpcResult(endpoint, "eth_blockNumber", result)) return false;
  out.block = parseHex(result);
  if (out.block == 0) return false;

  if (!rpcResult(endpoint, "eth_syncing", result)) return false;
  out.syncing = (result != "false");

  if (rpcResult(endpoint, "net_peerCount", result)) {
    out.peers = parseHex(result);
    out.peerCountKnown = true;
  }
  out.available = true;
  return true;
}

String endpointLabel(bool ok) { return ok ? "OK" : "DOWN"; }

String shortBlock(uint64_t block) {
  if (block == 0) return "--";
  return String(static_cast<unsigned long>(block));
}

void drawStatus(bool alert) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println(F("WINMAR 0xB948E0"));
  display.drawLine(0, 10, OLED_WIDTH - 1, 10, SSD1306_WHITE);
  display.setCursor(0, 15);
  display.print(F("IO:"));
  display.print(endpointLabel(primary.available));
  display.print(F("  COM:"));
  display.println(endpointLabel(backup.available));
  display.setCursor(0, 27);
  display.print(F("BLK:"));
  display.println(shortBlock(max(primary.block, backup.block)));
  display.setCursor(0, 39);
  display.print(F("SYNC:"));
  display.print((primary.syncing || backup.syncing) ? F("YES") : F("NO"));
  display.print(F(" PEER:"));
  if (primary.peerCountKnown) display.println(static_cast<unsigned long>(primary.peers));
  else display.println(F("n/a"));
  display.setCursor(0, 53);
  display.print(F("STATUS: "));
  if (networkState == "RPC OFFLINE") display.println(F("RPC DOWN"));
  else if (networkState == "RPC DEGRADED") display.println(F("DEGRADED"));
  else if (networkState == "BLOCK STALLED") display.println(F("STALLED"));
  else display.println(networkState);
  display.display();
  digitalWrite(ALERT_LED_PIN, alert ? LED_ON_LEVEL : (LED_ON_LEVEL == HIGH ? LOW : HIGH));
}

void printEndpoint(const char* label, const EndpointStatus& status) {
  Serial.printf("%s: %s", label, status.available ? "OK" : "DOWN");
  if (status.available) {
    Serial.printf(" chain=%lu block=%llu syncing=%s", static_cast<unsigned long>(status.chainId),
                  static_cast<unsigned long long>(status.block), status.syncing ? "true" : "false");
    if (status.peerCountKnown) Serial.printf(" peers=%llu", static_cast<unsigned long long>(status.peers));
  }
  Serial.println();
}

void pollNetwork() {
  primary = EndpointStatus{};
  backup = EndpointStatus{};
  readEndpoint(PRIMARY_RPC, primary);
  readEndpoint(BACKUP_RPC, backup);

  const bool anyRpc = primary.available || backup.available;
  const bool allRpc = primary.available && backup.available;
  const uint64_t tip = max(primary.block, backup.block);
  const uint32_t now = millis();
  if (tip > lastSeenTip) {
    lastSeenTip = tip;
    lastProgressAt = now;
  }
  if (firstPoll) {
    lastProgressAt = now;
    firstPoll = false;
  }

  const bool syncing = primary.syncing || backup.syncing;
  const uint64_t gap = primary.available && backup.available
                           ? (primary.block > backup.block ? primary.block - backup.block : backup.block - primary.block)
                           : 0;
  const bool stalled = (now - lastProgressAt) > STALL_AFTER_MS;
  bool alert = false;
  if (!anyRpc) {
    networkState = "RPC OFFLINE";
    alert = true;
  } else if (!allRpc || gap > 5) {
    networkState = "RPC DEGRADED";
    alert = true;
  } else if (syncing) {
    networkState = "SYNCING";
    alert = true;
  } else if (stalled) {
    networkState = "BLOCK STALLED";
    alert = true;
  } else {
    networkState = "HEALTHY";
  }

  Serial.println();
  printEndpoint("Primary .io", primary);
  printEndpoint("Backup .com", backup);
  Serial.printf("Network status: %s; latest observed block: %llu\n", networkState.c_str(),
                static_cast<unsigned long long>(tip));
  drawStatus(alert);
  lastPollAt = now;
}

void showMessage(const __FlashStringHelper* line1, const __FlashStringHelper* line2) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 18);
  display.println(line1);
  display.setCursor(0, 34);
  display.println(line2);
  display.display();
}

bool connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 25000) {
    delay(250);
  }
  return WiFi.status() == WL_CONNECTED;
}

bool synchronizeClock() {
  configTime(0, 0, "pool.ntp.org", "time.cloudflare.com");
  const uint32_t start = millis();
  while (time(nullptr) < 1700000000 && millis() - start < 30000) delay(250);
  return time(nullptr) >= 1700000000;
}
}  // namespace

void setup() {
  Serial.begin(115200);
  pinMode(ALERT_LED_PIN, OUTPUT);
  digitalWrite(ALERT_LED_PIN, LOW);
  Wire.begin();  // Default ESP32 I2C pins: SDA=21, SCL=22.
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println(F("OLED not found. Check wiring/address (0x3C)."));
  }
  showMessage(F("Winmar Chain monitor"), F("Connecting Wi-Fi..."));
  if (!connectWifi()) {
    networkState = "WIFI OFFLINE";
    showMessage(F("Wi-Fi unavailable"), F("Check secrets.h"));
    digitalWrite(ALERT_LED_PIN, LED_ON_LEVEL);
    return;
  }
  Serial.printf("Wi-Fi connected; IP: %s\n", WiFi.localIP().toString().c_str());
  showMessage(F("Wi-Fi connected"), F("Setting secure clock..."));
  while (!synchronizeClock()) {
    Serial.println(F("NTP failed; retrying."));
    showMessage(F("Clock not ready"), F("Retrying NTP..."));
    delay(5000);
  }
  pollNetwork();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    networkState = "WIFI OFFLINE";
    drawStatus(true);
    delay(1000);
    if (WiFi.status() != WL_CONNECTED) connectWifi();
    return;
  }
  if (millis() - lastPollAt >= POLL_INTERVAL_MS) pollNetwork();
  delay(100);
}
