# WMCore Testnet Trading Terminal

Visual testnet client for the Winmar Chain Financial API, dynamic market registry, and SDK.

## Dynamic market discovery

The terminal does not hard-code its tradable market list. It requests ACTIVE markets from the WMCore Market Registry through the Winmar Chain API.

A new market can therefore appear in compatible clients without shipping a new terminal build after it passes the market lifecycle:

PROPOSED -> REVIEW -> TESTING -> ACTIVE

The testnet seed registry demonstrates crypto, commodity, and Winmar ecosystem perpetual markets. Seed markets are bootstrap data, not a fixed protocol market list.

## Safety

- Testnet financial actions only.
- Connect Wallet is used for account identity and signed WMCore actions.
- The preview does not automatically switch networks or send a Winmar Chain mainnet transaction.
- Test collateral and market prices are simulation values until real testnet oracle and settlement services are connected.
- A signed market proposal is not automatically tradable. Only ACTIVE registry markets can accept orders.

## Run

Terminal 1:

    cd services/wmcore-api
    npm install --ignore-scripts --no-audit --no-fund --package-lock=false
    npm start

Terminal 2:

    cd packages/winmarchain-sdk
    npm install --ignore-scripts --no-audit --no-fund --package-lock=false
    npm run build

    cd ../../apps/wmcore-terminal
    npm install --ignore-scripts --no-audit --no-fund --package-lock=false
    npm run dev

Open http://127.0.0.1:4174.

## Risk parameters

Leverage is a per-market registry parameter and can be configured from 1x up to the protocol testnet ceiling of 100x. The API enforces the market-specific cap.

These are testnet risk parameters, not a promise of future production leverage.
