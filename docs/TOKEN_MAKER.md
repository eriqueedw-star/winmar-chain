# Winmar WMC-20 Token Creator

## Purpose

Winmar Token Creator issues **WMC-20** fungible tokens on **Winmar Chain** using the first-party WinmarTokenFactory. WMC-20 is the Winmar Chain ecosystem token standard, technically compatible with ERC-20 wallets and tooling. It is not a separate blockchain or native coin.

See [WMC-20 v1.0.0 standard](standards/WMC-20.md). Gas is paid in native **WMC**, which is distinct from WMC-20 contract tokens.

## Creation fields

- Token name
- Symbol
- Decimals
- Initial supply
- Initial holder
- Mintable
- Burnable
- Pausable
- Creator salt (duplicate-deployment guard)

## Token behavior

The generated token has:

- standard transfer;
- allowance/approval;
- transferFrom;
- optional owner-controlled mint;
- optional holder burn;
- optional owner-controlled pause;
- ownership transfer/renounce.

It intentionally does not include:

- transfer tax;
- blacklist;
- hidden mint;
- hidden owner balance;
- honeypot restriction;
- reflection;
- arbitrary transfer hooks;
- confiscation logic.

## Ownership warning

If mintable or pausable is enabled, the creator retains the corresponding owner powers until ownership is transferred or renounced.

The UI must display these powers clearly before deployment.

## Deployment

The factory address is intentionally unset until a reviewed deployment exists.

Current state:

- network: Winmar Chain;
- chain ID: 12142816;
- factory deployed: no deployment recorded yet.

After deployment, record:

- factory address;
- deployment transaction;
- compiler version;
- compiler settings;
- verified source URL;
- deployment date;
- audit/review reference.

## User flow

Connect Wallet -> Configure Token -> Preview Powers -> Deploy -> Verify -> Show Explorer

The UI must never request a private key or seed phrase.
