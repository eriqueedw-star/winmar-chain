# Winmar Faucet

## Purpose

The Winmar Faucet distributes native WMC from a funded faucet treasury to developers.

The faucet contract does not mint WMC. It only transfers the native currency already deposited into the faucet.

## Safety controls

- per-wallet cooldown;
- global daily distribution cap;
- pause control;
- explicit admin withdrawal;
- no validator private key;
- no wallet seed phrase;
- no unrestricted RPC administration.

The web UI should additionally use:

- CAPTCHA or equivalent bot protection;
- IP/request rate limiting;
- wallet abuse detection;
- optional minimum wallet-age or activity rules;
- monitoring and alerting for treasury depletion.

These off-chain controls are intentionally not embedded in the contract.

## Deployment policy

**Controlled mainnet deployment.**

The current deployment workflow targets Winmar Chain mainnet through the protected `production` environment. The faucet must use a dedicated operational funding wallet or treasury allocation; do not use a validator signing key.

Before deployment:

1. compile with the pinned Solidity compiler;
2. review constructor parameters;
3. deploy from a dedicated faucet-admin account;
4. fund the contract with a bounded WMC amount;
5. verify the contract source;
6. record the deployed address and transaction hash;
7. configure the web UI;
8. test claim, cooldown, cap, pause, and withdrawal behavior.

## Initial controlled configuration

These are examples, not production defaults:

- claim amount: 0.1 WMC;
- cooldown: 24 hours;
- daily cap: 100 WMC.

The actual values must be approved by the mainnet operator before funding.

## User flow

Connect Wallet -> Verify network -> Anti-bot check -> Claim WMC -> Explorer receipt

The UI must never request a user's private key or seed phrase.
