import type { Signer } from "ethers";

export const WMCORE_PROTOCOL = "wmcore" as const;
export const WMCORE_VERSION = 1 as const;
export const WMCORE_ENVIRONMENT = "testnet" as const;
export const LEVERAGE_TIERS = [1, 2, 3, 5, 10, 20, 25, 50, 75, 100] as const;

export type Side = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type Leverage = typeof LEVERAGE_TIERS[number];

export interface PlaceOrder {
  market: string;
  side: Side;
  type: OrderType;
  price?: string;
  size: string;
  leverage: Leverage;
  reduceOnly?: boolean;
}

export interface SignedEnvelope<T = unknown> {
  protocol: typeof WMCORE_PROTOCOL;
  version: typeof WMCORE_VERSION;
  environment: typeof WMCORE_ENVIRONMENT;
  account: string;
  action: string;
  nonce: number;
  expiresAt: string;
  payload: T;
}

export interface SignedAction<T = unknown> {
  envelope: SignedEnvelope<T>;
  signature: string;
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map((key) => JSON.stringify(key) + ":" + stable(object[key])).join(",") + "}";
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signingMessage<T>(envelope: SignedEnvelope<T>): Promise<string> {
  if (envelope.protocol !== WMCORE_PROTOCOL || envelope.version !== WMCORE_VERSION || envelope.environment !== WMCORE_ENVIRONMENT) {
    throw new Error("WRONG_SIGNING_DOMAIN");
  }
  const hash = await sha256Hex(stable(envelope.payload));
  return [
    "Winmar Chain Financial Action",
    "Protocol: " + WMCORE_PROTOCOL,
    "Version: " + WMCORE_VERSION,
    "Environment: " + WMCORE_ENVIRONMENT,
    "Account: " + envelope.account,
    "Action: " + envelope.action,
    "Nonce: " + envelope.nonce,
    "Expires At: " + new Date(envelope.expiresAt).toISOString(),
    "Payload SHA256: " + hash
  ].join("\n");
}

export class WinmarClient {
  readonly baseUrl: string;
  private readonly signer?: Signer;
  private nonce = 0;

  constructor(options: { baseUrl: string; signer?: Signer; environment?: "testnet" }) {
    if (options.environment && options.environment !== "testnet") throw new Error("SDK_SKELETON_IS_TESTNET_ONLY");
    const parsed = new URL(options.baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("INVALID_BASE_URL");
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.signer = options.signer;
  }

  async status() { return this.request("/api/v1/status"); }
  async markets() { return this.request("/api/v1/markets"); }
  async market(symbol: string) { return this.request("/api/v1/markets/" + encodeURIComponent(symbol)); }
  async orderbook(symbol: string) { return this.request("/api/v1/orderbook/" + encodeURIComponent(symbol)); }
  async oracle(symbol: string) { return this.request("/api/v1/oracle/" + encodeURIComponent(symbol)); }
  async latestCommitment() { return this.request("/api/v1/commitments/latest"); }

  async orders(account?: string) {
    const address = account || await this.requireSigner().getAddress();
    return this.request("/api/v1/orders?account=" + encodeURIComponent(address));
  }

  async placeOrder(order: PlaceOrder) {
    return this.request("/api/v1/orders", { method: "POST", body: JSON.stringify(await this.sign("order.place", order)) });
  }

  async cancelOrder(orderId: string) {
    return this.request("/api/v1/orders/" + encodeURIComponent(orderId) + "/cancel", {
      method: "POST",
      body: JSON.stringify(await this.sign("order.cancel", { orderId }))
    });
  }

  websocketUrl(): string {
    const url = new URL(this.baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/api/v1/ws";
    url.search = "";
    return url.toString();
  }

  private requireSigner(): Signer {
    if (!this.signer) throw new Error("SIGNER_REQUIRED");
    return this.signer;
  }

  private async sign<T>(action: string, payload: T): Promise<SignedAction<T>> {
    const signer = this.requireSigner();
    const envelope: SignedEnvelope<T> = {
      protocol: WMCORE_PROTOCOL,
      version: WMCORE_VERSION,
      environment: WMCORE_ENVIRONMENT,
      account: await signer.getAddress(),
      action,
      nonce: ++this.nonce,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      payload
    };
    return { envelope, signature: await signer.signMessage(await signingMessage(envelope)) };
  }

  private async request(path: string, init?: RequestInit) {
    const response = await fetch(this.baseUrl + path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(String(data.error || "WINMAR_API_ERROR"));
    return data;
  }
}
