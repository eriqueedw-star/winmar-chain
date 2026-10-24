# WMCore Testnet Trading Terminal

Visual testnet client for the Winmar Chain Financial API and SDK.

## Safety

- Testnet financial actions only.
- Connect Wallet is used for account identity and signed WMCore actions.
- The preview does not automatically switch networks or send a Winmar Chain mainnet transaction.
- Test collateral and market prices are simulation values until real testnet oracle and settlement services are connected.

## Run

Terminal 1:

```bash
cd services/wmcore-api
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npm start
```

Terminal 2:

```bash
cd packages/winmarchain-sdk
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npm run build

cd ../../apps/wmcore-terminal
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npm run dev
```

Open `http://127.0.0.1:4174`.

## Leverage caps

- BTC-USD-PERP: 100x
- ETH-USD-PERP: 100x
- GOLD-USD-PERP: 50x
- WMC-USD-PERP: 25x

These are testnet risk parameters, not a promise of future production leverage.
