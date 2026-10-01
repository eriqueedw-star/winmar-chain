# Mainnet allocation evidence

## Scope

This record applies only to Winmar Chain mainnet, Chain ID `12142816`.

## Addresses observed

| Address | Explorer observation |
|---|---:|
| `0xF66287c43Eb62f238c333393b4c29Da19001E97F` | 25,000,000 WMC |
| `0x2A94dfdbaf51c71f5E554260D56Fff14Fee43624` | 25,000,000 WMC |

Explorer references:

- `https://scan.winmarchain.io/address/0xF66287c43Eb62f238c333393b4c29Da19001E97F`
- `https://scan.winmarchain.io/address/0x2A94dfdbaf51c71f5E554260D56Fff14Fee43624`

The two addresses were observed as EOAs with zero transaction count in the explorer during the operator verification session. The explorer displayed a last-balance-update block of `477861` for the first address and `477857` for the second.

## Validator genesis observation

On the authorized Besu validator host, `/etc/besu/validator.toml` was observed to reference:

- data path: `/var/lib/besu`;
- genesis file: `/etc/besu/genesis.json`;
- network ID: `12142816`.

The validator's `genesis.json` was observed to contain the same two addresses under `alloc`, each with the hexadecimal balance `0x14adf4b7320334b90000000`.

That hexadecimal value corresponds to `400,000,000 WMC` when interpreted as 18-decimal wei.

## Reconciliation status

**OPEN — do not treat this record as a canonical supply statement yet.**

The explorer observations and validator-local RPC results did not agree during the same verification session: local `eth_getBalance` returned `0x0` for both addresses, while the explorer displayed `25,000,000 WMC` for each.

Historical `eth_getBalance` queries at `0x0` returned `null` from the local RPC, so the local node did not provide sufficient historical-state evidence to reconcile the genesis allocation with the current explorer state.

Therefore this document records observations, not an independently verified treasury or supply conclusion.

## Required reconciliation

Before publishing a canonical supply/allocation statement, obtain all of the following:

1. Genesis block hash and state root from an authorized mainnet node.
2. The exact production genesis file checksum.
3. Current balance for both addresses from the canonical RPC used by the explorer.
4. Current block height and sync status of the validator.
5. Explorer/indexer source confirmation or database reconciliation.
6. A second reviewer confirmation.

Do not add these addresses to `config/developer-tools.json` as faucet treasury addresses until ownership and intended operational role are independently confirmed.

## Security boundary

Only public addresses and public balances are recorded here. Never add private keys, keystore files, seed phrases, passwords, RPC credentials, or validator recovery material.
