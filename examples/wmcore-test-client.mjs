import { Wallet } from "ethers";
import { WinmarClient } from "../packages/winmarchain-sdk/dist/index.js";

const client = new WinmarClient({
  baseUrl: process.env.WMC_API_URL || "http://127.0.0.1:8790",
  environment: "testnet",
  signer: Wallet.createRandom()
});

console.log(await client.status());
console.log(await client.markets());
console.log(await client.placeOrder({
  market: "BTC-USD-PERP",
  side: "BUY",
  type: "LIMIT",
  price: "94000",
  size: "0.01",
  leverage: 2
}));
