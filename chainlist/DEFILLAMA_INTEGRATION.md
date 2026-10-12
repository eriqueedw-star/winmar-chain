# DefiLlama Chainlist integration

## Canonical Winmar Chain production identity

All Winmar Chain network integrations must use the **.io** production
domain. Earlier Winmar domain variants are deprecated and must not be
published as active RPC, explorer, or website endpoints.

| Field | Canonical value |
| --- | --- |
| Network | Winmar Chain |
| Chain ID | `12142816` |
| Native currency | WMC |
| RPC | `https://rpc.winmarchain.io` |
| Explorer | `https://scan.winmarchain.io` |
| Website | `https://winmarchain.io` |
| Logo | `https://winmarchain.io/logo/` |

The authoritative checked-in metadata is
[`config/network.json`](../config/network.json).

## Upstream publication tracking

Checked on 2026-10-10:

1. [Ethereum Lists PR #8740](https://github.com/ethereum-lists/chains/pull/8740)
   is open and proposes the canonical .io URLs and chain icon metadata.
2. [DefiLlama Chainlist PR #3209](https://github.com/DefiLlama/chainlist/pull/3209)
   is open and proposes the Winmar Chain override, .io RPC/explorer,
   website, `chainSlug: "winmar"`, and network ID 12142816.
3. [DefiLlama Icons PR #2523](https://github.com/DefiLlama/icons/pull/2523)
   is open and proposes the Winmar Chain logo.

These pull requests are **not merged**. A live registry listing does not
prove that its published metadata already matches the proposed changes.
Final publication is controlled by upstream maintainers.

## Local publication artifacts

- `chainlist/defillama-chainlist-12142816.patch`: proposed .io override.
- `chainlist/defillama-icons-winmar.md`: logo publication guidance.
- `chainlist/README.md`: registry and publication tracking.

Never reintroduce a deprecated Winmar domain when preparing wallet,
exchange, explorer, mobile-wallet, RPC provider, or indexer submissions.

## Repository permissions

The connected GitHub integration has read access, but not push access,
to upstream DefiLlama repositories. Maintainers must merge upstream PRs;
the Winmar Chain repository cannot force those changes into production.
