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

## Canonical native WMC coin logo — owner-approved (2026-10-23)

The project owner selected the **401 × 401 RGBA PNG** currently served at **https://winmarchain.io/logo/wmc.png** as the single authoritative WMC native-coin logo for public interfaces and wallet submissions.

- **Canonical logo URL:** https://winmarchain.io/logo/wmc.png
- **Exact GitHub asset:** [`assets/wmc.png`](../assets/wmc.png)
- **Owner-uploaded matching image:** `WMC2.png`
- **File:** PNG RGBA; 401 × 401 pixels; 325,280 bytes
- **SHA-256:** `dbbd58c8a18c730825a3931c0bf41f133abca76c140f27d8c4ba0b2f58deafee`
- **Git blob SHA-1:** `440a721729635dbbe06fba3247a2421fe8fbbd2c`
- **Availability:** HTTP 200 from independent GitLab CI

The repository file and owner-supplied `WMC2.png` are **byte-identical** to the official web file. Never invent, edit, recompress, recolor, crop or swap this WMC artwork. **This is native coin artwork, not Winmar Chain network artwork.** The Chainlist network icon `winmar` and its separately approved logo must not be altered.

### Historical sources, not used for live branding

The earlier 1254 × 1254 `WMC.png`, SHA-256 `466e0857dbe99549d9e999afb83e4a22cd6c8cdeb8486e9f571afa7bc2d6c54f`, is retained solely as historic master evidence. Previously prepared `wmc-registration.json` also lists source hash `b04c3538790681d94732b7f59702ecc4f9dd85cce5558f26995604f411279aeb` and resized hash `2f4f25fdbeed12a61fb61e134c73bfa9b0e7481cdcfa6e0a828f02beabac0385`; those older records are not the canonical logo.

Legacy IPFS CID `bafybeieqw6y7ha7ciykcxqz7ttuywix2yaxyffhk5uajxgy7357xdn7liu` remains unverified due to rate limits and must **not** override the canonical HTTPS logo until its contents are independently checked.

**Wallet status:** An accessible, approved WMC PNG and merged Chainlist network icon do not imply that MetaMask, Trust Wallet or SafePal have approved native WMC icon display.

## Integration routes

- **Trust Wallet:** For the native WMC coin on Winmar Chain, start with official **new EVM chain / Wallet Core** business-development review at `partnerships@trustwallet.com`. Trust Wallet documentation says new chains need an affirmative BD decision; the ordinary ERC-20/BEP-20 asset-logo PR and processing fee are not the correct route for native WMC.
  - https://developer.trustwallet.com/developer/wallet-core/newblockchain
- **MetaMask:** Chainlist/EIP-3085 can add Winmar Chain as a custom EVM network. Custom network registration does not guarantee MetaMask will display native WMC artwork.
  - https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc
- **SafePal:** Users can add the Winmar custom EVM network; native coin artwork and official network listing are vendor-side decisions and should be discussed through SafePal support.
  - https://safepalsupport.zendesk.com/hc/en-us/articles/14688426876443-How-to-add-a-Custom-network-in-the-SafePal-software-wallet

## Approval gates for a WMC logo submission

1. Use the verified [canonical WMC PNG](../assets/wmc.png); do not substitute the Winmar Chain icon or WIM/BEP-20 token.
2. Include canonical SHA-256, MIME, dimensions and approved commercial/trademark use; legacy IPFS comparison remains optional until its bytes are available.
3. Confirm vendor technical eligibility and follow vendor-specific native blockchain support process; avoid duplicate/token-contract submissions.
4. Obtain a vendor receipt/PR/case ID and verify the actual UI on mobile and extension before reporting native WMC icon support.
5. Never claim that an opened PR or custom RPC connection equals a wallet-native listing.

## Registry mirror and internal submission packet

- https://gitlab.com/winmar-chain/winmar-chain-registry/-/merge_requests/2
- https://gitlab.com/winmar-chain/winmar-chain-registry/-/blob/main/networks/winmar-mainnet.json

**Status on 2026-10-23:** Canonical published 401px logo approved and validated; documentation-only repo change, not a wallet-vendor submission or production infrastructure change.
