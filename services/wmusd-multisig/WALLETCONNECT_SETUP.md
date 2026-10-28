# WalletConnect deployment setup

The deployment flow requires a WalletConnect/Reown Project ID. It is intentionally
not stored in source control.

1. Create or copy the Project ID from the WalletConnect/Reown dashboard.
2. Copy `.env.example` to `.env`.
3. Set `WALLETCONNECT_PROJECT_ID` in `.env`.
4. Add `https://winmarchain.io` and the local deployment page to the project's allowed origins.
5. Use the deployment UI to connect SafePal and review the chain ID, signer addresses,
   contract bytecode, and gas before confirming.

The private key is never required or stored by this project.
