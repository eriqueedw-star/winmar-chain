# Winmar Developer Tools UI

This static page provides the wallet-facing UI for the Winmar Faucet, **WMC-20 Token Creator** (ERC-20 compatible), wrapped-asset catalog and SHA-256 document hash tool.

WMC-20 is the Winmar Chain fungible token standard. Native WMC remains the gas coin. Read [`docs/standards/WMC-20.md`](../../docs/standards/WMC-20.md).

## Current deployment state

The UI is intentionally shipped with both contract addresses unset in config/developer-tools.json.

Faucet claims remain disabled until a security-reviewed, gas-sponsored claim service and separate funded treasury are configured for public mainnet use. WMC-20 token deployment remains disabled until the WinmarTokenFactory is reviewed, deployed and its address verified. Bridge transfers and document anchoring are also disabled until explicitly approved.

The UI never asks for private keys or seed phrases.

## Hosting

The page is static and can be hosted by Netlify, Cloudflare Pages, GitHub Pages, or another static host.

After deployment, update config/developer-tools.json with reviewed contract addresses.
