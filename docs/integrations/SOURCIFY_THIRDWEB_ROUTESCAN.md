# Winmar Chain — Sourcify, thirdweb, and Routescan onboarding

Last reviewed: 2026-11-07. All statuses are conservative; no listing or provider endorsement is claimed without confirmation.

## Canonical network identity

- Network: **Winmar Chain**, Chain ID **12142816** (`0xB948E0`)
- Native asset: **Winmar Coin (WMC)**, 18 decimals; *no token contract address*
- RPC: https://rpc.winmarchain.io
- Explorer (keep as canonical): https://scan.winmarchain.io
- Website: https://winmarchain.io
- **Native coin logo**: https://winmarchain.io/logo/wmc.png, 401 × 401 PNG, SHA-256 `dbbd58c8a18c730825a3931c0bf41f133abca76c140f27d8c4ba0b2f58deafee`
- Network icon (separate): `winmar` registered through DefiLlama icons

## 1. thirdweb — developer SDK usable; directory inclusion pending

Developer config: [`integrations/thirdweb/winmar-chain.ts`](../../integrations/thirdweb/winmar-chain.ts) uses `defineChain` with custom RPC, nativeCurrency, and explorer. A JSON companion enables independent metadata tests. This lets developers **configure** thirdweb SDK for Winmar Chain; it does **not** assert official thirdweb chain directory presence, Bridge routing, hosted RPC support, Insight indexing, or Wallet support.

- SDK docs: https://portal.thirdweb.com/typescript/v5/defineChain
- Chain profile claim / official onboarding: https://share.hsforms.com/1o01TyfsZRAao2eCrzuXSVgea58c
- Alternative provider support: https://thirdweb.com/support

**Action:** Owner-authorized operator submits chain-claim request or uses an authorized thirdweb account/API for formal registration. Capture submission acknowledgement/chain profile URL; verify directory listing and exact fields before changing status.

## 2. Sourcify — direct chain override ready; upstream PR pending

Sourcify's current `sourcify-chains` repository explicitly allows a chain to be included through `chain-overrides.json` even when it is not auto-discovered. Therefore Ethereum Lists PR #8740 is useful ecosystem metadata but is **not a blocker** for the direct Sourcify override.

- Official process: https://docs.sourcify.dev/docs/chain-support/
- Upstream repo: https://github.com/argotorg/sourcify, branch `staging`
- Proposed config **only after source registry is available**:

```json
{
  "12142816": {
    "sourcifyName": "Winmar Chain",
    "supported": true,
    "rpc": ["https://rpc.winmarchain.io"],
    "fetchContractCreationTxUsing": {
      "blockscoutApi": { "url": "https://scan.winmarchain.io/" }
    }
  }
}
```

**Fork branch prepared:** `eriqueedw-star/sourcify-chains:add-chain-12142816`, refreshed from the current upstream `chain-overrides.json`, adds only `sourcifyName` and the canonical RPC. The connected GitHub integration cannot create a PR in the upstream repository because it has read-only upstream permissions. An owner-authenticated GitHub UI action is still required to open the upstream PR. No Blockscout API or trace-support claim is included until independently verified.

## 3. Routescan — indexing / directory inclusion requires provider agreement

Routescan exposes indexed data only for networks that it supports. Merely pointing its public API at a new chain ID does not onboard a new blockchain, and does not replace Winmar Chain's own Blockscout explorer.

- Official contact: https://routescan.io/contactus
- Main explorer remains https://scan.winmarchain.io
- Request target: additional network indexing / discoverability and API support for chain 12142816, preserving the primary explorer.
- Submit with verified canonical metadata and ask for technical prerequisites, SLAs, rate limits and any applicable pricing. No contract or signed vendor commitment is assumed.

## Verification and safety

- GitHub & GitLab CI should check **metadata**, RPC `eth_chainId`, Chainlist feed, and WMC logo URL, never funds or keys.
- Track individual vendor acknowledgements and real service availability. Do not mark `listed`, `indexed`, `verified`, or `integrated` until the provider publicly confirms it.
- Do not alter chain consensus, chain ID, validator configuration, gas currency, or native coin logo to satisfy a directory.
- Thirdweb contract publishing, Routescan data indexing and Sourcify smart-contract verification are independent processes.
