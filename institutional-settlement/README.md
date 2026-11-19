# Winmar Institutional Settlement — Sandbox (MVP)

**Status: prototype only, not audited, not deployed.**

An independent experimental institutional settlement module for the EVM-compatible
**Winmar Chain**, chain ID `12142816`. It is inspired by established tokenisation
and delivery-versus-payment (DvP) concepts explored in central-bank research, but
**is not Project Ubin source code, MAS software, SGD Testnet, SG Digital Ledger,
or an integration with the Monetary Authority of Singapore (MAS)**.

**Do not use with real money, customer assets, central-bank liabilities, or
production issuance.** No financial or regulatory permission is implied.

## Components

| Contract | Purpose |
| --- | --- |
| `InstitutionRegistry.sol` | Admin-controlled participant and approved-token registry |
| `PermissionedToken.sol` | Issuer-controlled, six-decimal optional demo settlement token and generic WMC-20/ ERC-20 asset |
| `AtomicDvP.sol` | Two-party accepted trade; pay and deliver in one atomic EVM transaction |
| `ScheduledPayment.sol` | Execute a previously instructed token payment in a specified time window |

Sample demo token names in tests:

- `dSGD-W` — Winmar simulated SGD accounting unit (**not SGD**, not redeemable, not MAS-issued).
- `dRWA-W` — simulated tokenised asset.

Token amounts use smallest units: a six-decimal token represents 1 unit as `1000000`.
WMC remains the chain's native gas asset. The demo tokens use its ERC-20-compatible
WMC-20 format, not the native WMC coin.

## How atomic settlement works

1. Registry admin marks institutional test wallets active and allowlists reviewed demo token contracts. This does **not** verify KYC.
2. Prototype issuer mints simulated assets and payment units to registered wallets.
3. Seller proposes a trade with immutable terms and an expiry.
4. Buyer explicitly accepts on-chain.
5. Seller approves the asset allowance to `AtomicDvP`; buyer approves payment allowance.
6. Anyone can call `settle(id)` before expiry. Both transfers execute in one
   EVM transaction; if either fails, neither transfer succeeds.
7. Settlement emits `TradeSettled`. A completed or cancelled trade cannot be replayed.

No cross-chain atomicity, bridge, real-fiat funding, reserve proof, compliance
assessment, bank integration, or MAS wholesale CBDC access is implemented.

## Development

From `institutional-settlement/`:

```sh
forge build
forge test -vv
```

Use Foundry with Solidity compiler `0.8.24`; no external Solidity library
dependencies are required. Tests cover successful DvP, buyer consent, expiry,
cancellation, atomic failure, eligibility revocation and scheduled payments.

## Operational risk and security

- Registry decisions and mint authority are centralized sandbox powers.
- Do not issue real-value tokens, use production keys or publish a public
  faucet for demo settlement tokens.
- No verified fiat reserves or redemption mechanism exists.
- Demo units must be visibly marked as simulated, especially in wallets/explorers.
- Tokens and allowances are not escrowed: scheduled execution can fail if the payer
  revokes approval or spends its balance.
- External contracts must be vetted and limited to reviewed settlement-token
  implementations before any production version is considered.
- A compromised registry admin or issuer can materially affect participants.
- All contract logic, role design, governance, upgrades, compliance, recovery and
  operational controls need professional review and third-party audit.

**Mainnet deployment gate:** keep deployment disabled until design review,
regulatory assessment, independent audit, key management, full CI tests and
an explicitly approved deployment plan are complete.

## Follow-on roadmap

- Governance/multisig, issuer lifecycle and formal token codehash/audit verification.
- Institutional onboarding and off-chain KYC/AML evidence with privacy controls.
- Payment-versus-payment (PvP), escrow, liquidity/reserve reconciliation.
- Cross-ledger messaging standards and optional secure interoperability adapter.
- Independent security assessment and privacy/security threat modeling.
- Reporting and on-chain SHA-256-equivalent `bytes32` reference anchoring.

See the Winmar Chain public project documentation and security notices in the
root README for the mainnet identity and existing deployment restrictions.
