# WMC-20 — Winmar Chain Fungible Token Standard

**Specification ID:** WMC-STD-020  
**Version:** 1.0.0  
**Adopted by:** Winmar Chain ecosystem  
**Adoption date:** 10 October 2026  
**Status:** Ecosystem standard adopted; implementation in pre-release review

## 1. Purpose and terminology

**WMC-20** is the name adopted by Winmar Chain for fungible smart-contract tokens issued **on Winmar Chain**. It is a Winmar-branded **ERC-20-compatible** token profile, not a new blockchain, consensus protocol, EIP number, or replacement for Ethereum's established ERC-20 interface.

- **Blockchain:** Winmar Chain.
- **Network chain ID:** \`12142816\` (hex \`0xB948E0\`).
- **Native coin:** Winmar Coin (\`WMC\`), the gas asset.
- **Token standard:** WMC-20 (fungible contract tokens on Winmar Chain).
- **Underlying ABI and events:** Ethereum ERC-20-compatible.
- **Public RPC:** \`https://rpc.winmarchain.io\`.
- **Explorer:** \`https://scan.winmarchain.io\`.
- **Official website:** \`https://winmarchain.io\`.

WMC is **not** itself an ERC-20 or WMC-20 contract. Standard adoption does not create a new chain ID and does not automatically grant third-party wallet, token list, exchange, bridge, or explorer recognition.

## 2. Normative interface

A WMC-20 token contract **MUST** implement ERC-20-compatible methods with standard arguments and return values:

| Method | Return value |
|---|---|
| \`totalSupply()\` | \`uint256\` |
| \`balanceOf(address account)\` | \`uint256\` |
| \`transfer(address to, uint256 amount)\` | \`bool\` |
| \`allowance(address owner, address spender)\` | \`uint256\` |
| \`approve(address spender, uint256 amount)\` | \`bool\` |
| \`transferFrom(address from, address to, uint256 amount)\` | \`bool\` |

The token contract **MUST** emit the ERC-20-compatible events:

\`\`\`solidity
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
\`\`\`

Token creations **MUST** emit \`Transfer(address(0), recipient, amount)\`; burns **MUST** emit \`Transfer(holder, address(0), amount)\`. For compatibility with wallet interfaces and explorers, WMC-20 contracts **MUST** expose \`name() returns (string)\`, \`symbol() returns (string)\`, and \`decimals() returns (uint8)\`. Decimal precision is chosen per token contract; it does **not** modify WMC's native 18 decimals.

## 3. Optional capabilities

The standard permits clearly disclosed extensions, including \`mint\`, \`burn\`, \`burnFrom\`, \`pause\`, and ownership transfer. These functions are **not part of the mandatory ERC-20 ABI**. They must not alter the behavior of mandatory methods in ways that hide confiscation, undisclosed transfer taxes, privileged balances, or deceptive transfer restrictions.

The first-party \`WinmarToken.sol\` template in this repository currently offers explicitly opted-in **mintable**, **burnable**, and **pausable** behavior, controlled by the token issuer as documented in \`docs/TOKEN_MAKER.md\`. It is a **reference implementation**, not a security certification or guarantee that any third-party token is trustworthy.

## 4. Issuance and identification

To describe a deployment as **WMC-20**, the issuer should supply:

1. Winmar Chain **chain ID 12142816** and deployed token contract address.
2. Verified contract source/ABI where available and consistent compiler settings.
3. Name, symbol, decimals, total supply and creator/ownership configuration.
4. Disclosure of mutable controls, e.g. mint and pause authority.
5. Explorer transaction/address links and project-controlled website/metadata.

**A symbol alone is not a unique token identifier.** Use chain ID plus contract address, and verify source and ownership before displaying trust badges. The issuer remains responsible for project compliance, legal status, and user-facing disclosures. Token creation does not imply endorsement by Winmar Holdings, Winmar Chain or independent auditors.

## 5. Naming and UI conventions

Use **WMC-20 Token Creator**, **Issue a WMC-20 token**, and **WMC-20 Token Standard** as the main product-facing labels. Include **"ERC-20 compatible"** as a visible technical subtitle so wallets, developers, and integrators understand the interface.

Never describe \`WMC-20\` as the native gas coin, a separate network, a formally approved Ethereum EIP, or an independently recognized cross-chain asset. Use **WMC** exclusively for gas and native-balance references.

## 6. Current implementation and rollout

The current implementation uses \`contracts/WinmarToken.sol\` and \`contracts/WinmarTokenFactory.sol\`. Adding WMC-20 branding **does not change their runtime ABI, bytecode behavior, deployed contracts, or consensus**. Existing users can continue using standard ERC-20 ABI tooling over the Winmar Chain RPC.

The corresponding factory address is not yet recorded as a reviewed mainnet deployment in \`config/developer-tools.json\`. The creator remains disabled until independent review, deployment verification, network testing, and an approved configuration change. This standard can be used in repository documentation immediately; public claims of a **live** Token Creator must wait for evidence.

## 7. Versioning

The project may publish future WMC-20 specification revisions under this versioned document. Backward-incompatible interfaces must use a separately named version or profile and cannot silently redefine existing ERC-20-compatible methods. This designation does not imply recognition, certification or listing by MetaMask, Trust Wallet, exchanges or other third parties.
