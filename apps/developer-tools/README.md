# Winmar Developer Tools UI

This static page provides the wallet-facing UI for the Winmar Faucet and Token Maker.

## Current deployment state

The UI is intentionally shipped with both contract addresses unset in config/developer-tools.json.

Faucet claims remain disabled until a dedicated testnet/devnet faucet is deployed and configured. Token deployment remains disabled until the WinmarTokenFactory is deployed and its address is reviewed.

The UI never asks for private keys or seed phrases.

## Hosting

The page is static and can be hosted by Netlify, Cloudflare Pages, GitHub Pages, or another static host.

After deployment, update config/developer-tools.json with reviewed contract addresses.
