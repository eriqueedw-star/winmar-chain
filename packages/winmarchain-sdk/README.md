# Winmar Chain SDK

Reference TypeScript SDK for the testnet-first Winmar Chain Financial API and
WMCore.

This package is intentionally private and testnet-only while WIP-001 and
WIP-005 remain Draft.

## Development

```bash
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npm run check
npm run build
```

## Example

```ts
import { Wallet } from "ethers";
import { WinmarClient } from "@winmarchain/sdk";

const signer = new Wallet(process.env.TESTNET_DEMO_KEY!);
const client = new WinmarClient({
  baseUrl: "http://127.0.0.1:8790",
  environment: "testnet",
  signer
});

await client.placeOrder({
  market: "BTC-USD-PERP",
  side: "BUY",
  type: "LIMIT",
  price: "94000",
  size: "0.01",
  leverage: 2
});
```

Never place production private keys in source code or repository secrets used
by pull-request CI.
