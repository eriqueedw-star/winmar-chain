# Winmar Chain — Sourcify, thirdweb, and Routescan onboarding

Last reviewed: 2026-10-23. All statuses are conservative; no listing or provider endorsement is claimed without confirmation.

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

## 2. Sourcify — blocked pending ethereum-lists registration + test contract evidence

Sourcify says its `chains.json` is synchronized with `ethereum-lists/chains` and must not be hand-edited. Winmar Chain's upstream metadata correction is tracked in https://github.com/ethereum-lists/chains/pull/8740 (still open when checked).

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

**Not submitted**: Must validate that the installed explorer actually supports required Blockscout API routes and supply a deployed public test contract (or a pre-existing permitted CreateX/Multicall deployment). **Do not deploy any smart contract or use validator keys without explicit operational approval.** After upstream metadata merge, prepare branch `add-chain-12142816` from Sourcify `staging`, add chain details and test contract evidence, run prescribed tests, then open upstream PR.

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
