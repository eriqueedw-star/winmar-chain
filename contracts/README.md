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

Native WMC faucet for a controlled Winmar Chain mainnet deployment.

- does not mint WMC;
- must be funded separately with bounded native WMC;
- per-wallet cooldown;
- global daily distribution cap;
- pause switch;
- admin treasury withdrawal;
- no validator or wallet private key is stored in the repository.

## Production boundary

These contracts are source code only until independently compiled, reviewed, deployed, and verified.

Mainnet deployment is controlled through the protected `production` GitHub environment. The faucet is deployed unfunded; funding is a separate operational transaction after address review.

Do not use a validator signing key as the deployment key.

The token factory may be deployed on a public network only after contract review and a deployment-specific verification record.
