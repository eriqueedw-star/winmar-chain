# Winmar Coin (WMC) — Native Currency Logo / Wallet Integration

## Identity: NOT an ERC-20/BEP-20/WMC-20 contract

- Blockchain: **Winmar Chain** (EVM-compatible Layer 1; QBFT PoA)
- Chain ID: **12142816** (`0xB948E0`)
- Native gas coin: **Winmar Coin**, symbol **WMC**, decimals **18**
- Contract address: **not applicable** for native WMC; never invent one
- Mainnet RPC: https://rpc.winmarchain.io
- Explorer: https://scan.winmarchain.io
- Website: https://winmarchain.io
- WMC page: https://winmarchain.io/wmc.html
- Chainlist: https://chainlist.org/chain/12142816

## Official logo pointers (not a new or generated logo)

The repository's existing [`config/network.json`](../config/network.json) declares the **native WMC coin image** as `https://winmarchain.io/logo/wmc.png`.

The project owner also provided an IPFS gateway reference:
`https://bafybeieqw6y7ha7ciykcxqz7ttuywix2yaxyffhk5uajxgy7357xdn7liu.ipfs.dweb.link?filename=WMC.png`.

**Logo evidence pending:** These URLs are source references, NOT yet proof that the PNG files are identical, accessible or meet a particular wallet's specifications. A verified original PNG and SHA-256 have **not** been committed to this repository. Preserve the original asset; do not design a surrogate, recolor or distort it.

### Historical artwork fingerprints (NOT yet reproduced)

A previously prepared owner-side `wmc-registration.json` record reports:

- Original/reference image SHA-256: `b04c3538790681d94732b7f59702ecc4f9dd85cce5558f26995604f411279aeb`
- 256 × 256 prepared-image SHA-256: `2f4f25fdbeed12a61fb61e134c73bfa9b0e7481cdcfa6e0a828f02beabac0385`
- Notes indicate the smaller PNG was resized from the reference without visual redesign and retained a white background.

These are **historical, unverified statements from a prior registration manifest**, not hashes independently reproduced from the publicly referenced URLs. Do not assume the two files are identical; the resized export naturally has different bytes. **Do not submit either until the owner-approved source binary is recovered and checked.**

**Separate concepts:** The Chainlist network icon (`winmar`) is already listed via DefiLlama/icons#2523. Its appearance does **not** establish that MetaMask, Trust Wallet or SafePal display a native WMC coin icon.

## Integration routes

- **Trust Wallet:** For the native WMC coin on Winmar Chain, start with official **new EVM chain / Wallet Core** business-development review at `partnerships@trustwallet.com`. Trust Wallet documentation says new chains need an affirmative BD decision; the ordinary ERC-20/BEP-20 asset-logo PR and processing fee are not the correct route for native WMC.
  - https://developer.trustwallet.com/developer/wallet-core/newblockchain
- **MetaMask:** Chainlist/EIP-3085 can add Winmar Chain as a custom EVM network. Custom network registration does not guarantee MetaMask will display native WMC artwork.
  - https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc
- **SafePal:** Users can add the Winmar custom EVM network; native coin artwork and official network listing are vendor-side decisions and should be discussed through SafePal support.
  - https://safepalsupport.zendesk.com/hc/en-us/articles/14688426876443-How-to-add-a-Custom-network-in-the-SafePal-software-wallet

## Approval gates for a WMC logo submission

1. Download the **owner-approved original** coin PNG and confirm it is not the chain icon or an unrelated WIM/BEP-20 token.
2. Record the exact SHA-256, MIME type, dimensions, size, and trademark/use authorization; compare the HTTPS source with the owner-provided IPFS source.
3. Confirm vendor technical eligibility and follow vendor-specific native blockchain support process; avoid duplicate/token-contract submissions.
4. Obtain a vendor receipt/PR/case ID and verify the actual UI on mobile and extension before reporting native WMC icon support.
5. Never claim that an opened PR or custom RPC connection equals a wallet-native listing.

## Registry mirror and internal submission packet

- https://gitlab.com/winmar-chain/winmar-chain-registry/-/merge_requests/2
- https://gitlab.com/winmar-chain/winmar-chain-registry/-/blob/main/networks/winmar-mainnet.json

**Status on 2026-10-22:** Documentation-only, not a vendor submission or production change.
