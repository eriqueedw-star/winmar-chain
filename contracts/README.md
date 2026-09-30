# Winmar developer contracts

This directory contains the first-party smart-contract layer for the Winmar developer tools.

## Contracts

### WinmarToken.sol

A transparent ERC-20-compatible token template.

Supported options are explicit constructor flags:

- mintable;
- burnable;
- pausable.

The template intentionally has no transfer tax, blacklist, hidden mint path, reflection logic, honeypot behavior, or arbitrary transfer restriction.

### WinmarTokenFactory.sol

Permissionless factory for WinmarToken.

- no protocol fee;
- no factory owner;
- creator becomes token owner;
- standard contract deployment;
- creator-scoped salt registry to prevent accidental duplicate deployments.

The factory cannot mint, pause, or seize tokens after deployment.

### WinmarFaucet.sol

Native WMC faucet for a dedicated developer testnet/devnet treasury.

- does not mint WMC;
- must be funded with native WMC;
- per-wallet cooldown;
- global daily distribution cap;
- pause switch;
- admin treasury withdrawal;
- no validator or wallet private key is stored in the repository.

## Production boundary

These contracts are source code only until independently compiled, reviewed, deployed, and verified.

Do not deploy WinmarFaucet against the production/mainnet WMC treasury. The intended faucet environment is a dedicated testnet/devnet.

The token factory may be deployed on a public network only after contract review and a deployment-specific verification record.
