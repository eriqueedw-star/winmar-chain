import { Wallet } from "ethers";
import { WinmarClient } from "../dist/index.js";

const client = new WinmarClient({
  baseUrl: process.env.WMC_API_URL || "http://127.0.0.1:8790",
  environment: "testnet",
  signer: Wallet.createRandom()
});

const status = await client.status();
if (status.environment !== "testnet") throw new Error("Unexpected API environment");

const marketResponse = await client.markets();
if (!Array.isArray(marketResponse.markets) || marketResponse.markets.length !== 4) {
  throw new Error("Expected four initial markets");
}

const order = await client.placeOrder({
  market: "BTC-USD-PERP",
  side: "BUY",
  type: "LIMIT",
  price: "94000",
  size: "0.01",
  leverage: 2
});

if (order.status !== "OPEN") throw new Error("Signed order was not accepted");

const orders = await client.orders();
if (!orders.orders.some((item) => item.id === order.id)) throw new Error("Order query did not return placed order");

const canceled = await client.cancelOrder(order.id);
if (canceled.status !== "CANCELED") throw new Error("Signed cancel was not accepted");

process.stdout.write("PASS: SDK -> signed action -> WMCore API smoke test\n");
