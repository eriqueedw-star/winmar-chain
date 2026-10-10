# Winmar Chain ecosystem suite — implementation and release controls

Date: 2026-10-10. Development branch only. NO production deployment authorized.

## Existing verified repository components

- Native WMC Faucet contract: contracts/WinmarFaucet.sol.
- WMC-20 token template and factory (ERC-20 compatible): contracts/WinmarToken.sol and contracts/WinmarTokenFactory.sol.
- Basic developer interface: apps/developer-tools/index.html.
- Mainnet deploy workflow exists but must NOT be triggered by this change.
- Faucet and Token Maker deployment addresses are currently NOT recorded; config flags remain false.

## New components in this development increment

- Document SHA-256 self-attestation registry: contracts/WinmarDocumentRegistry.sol.
- Read-only bridged asset route catalog: contracts/WinmarBridgeAssetRegistry.sol.
- Integrated four-feature prototype: apps/developer-tools/index.html.
- Fail-closed feature switches: config/developer-tools.json.

## Four modules

### Faucet

Distributor for previously funded native WMC, not a WMC minter. For mainnet, use an independently governed treasury and a small, approved daily cap. Contract cooldown is per recipient; it does NOT prevent Sybil claims, so CAPTCHA / IP and abuse controls require a secure backend before public funding. The contract additionally provides an **optional admin-appointed gas sponsor relayer**, disabled by default; `claimFor` lets the backend sponsor a recipient's claim if their WMC balance is zero. An off-chain relayer service with wallet ownership challenges, replay protection, anti-bot hooks and quotas exists as PRE-RELEASE source but has NOT been deployed or independently audited. Trusted infrastructure, reconciliation, key custody and monitoring are pending. Status: NOT DEPLOYED / NOT FUNDED.

### Token Creator

Transparent factory for WMC-20 tokens (ERC-20 compatible). The WMC-20 v1.0.0 specification is in docs/standards/WMC-20.md. Issuer controls optional mint/pause powers, which must be displayed prominently. Token deployer pays WMC gas. A factory deployment, verified source, test suite and assessment are required before a public enablement. Token creation does NOT certify or endorse third-party tokens. Status: NOT DEPLOYED.

### Wrapped Assets and Cross-chain Bridge

Read-only route explorer and metadata-only contract. The route catalog is not a bridge and cannot transfer, custody, mint or release cross-chain assets. Existing bridge.winmarchain.io UI presence is not proof of a safe bridge. Do not mint representations of USDT, USDC or other third-party brands or promote these as issuer-backed without explicit authorization. Every route is disabled; asset movements must remain disabled pending source-chain proof verification, replay protection, double-spend resistance, source finality, custody model, mint/burn reconciliation, verified counterpart contracts, independent audit, monitoring, and emergency controls.

### Document Verifier

User's browser computes SHA-256 from local document bytes. No document is sent to a server by this interface. Optional wallet-signed on-chain anchor stores the 32-byte digest against the issuing wallet; record and revocation are visible by block explorer. SHA-256 equality plus wallet signature proves only existence of matching bytes anchored by THAT wallet no later than the block time. This is NOT proof of legal authenticity, official Winmar verification, copyright ownership, signature validity, KYC identity, or regulatory approval. A separate vetted issuer registry would be required for an institutional Verified by Winmar claim. Hashes and wallet addresses are public and persistent; do not upload sensitive document content to chain.

## Activation requirements (no automatic production writes)

1. Obtain independent contract reviews and reproducible builds; run unit, integration, and abuse tests.
2. Record exact production chainId 12142816 and genesis, RPC eth_chainId and contract bytecode.
3. Deploy with dedicated least-privilege operational accounts, not validator signing keys.
4. Verify deployed source, addresses, tx hashes, role ownership and upgrade assumptions.
5. Submit a separate reviewed PR setting only verified contract addresses and configured flags.
6. Faucet: fund or authorize a relayer only after verified private proxy ingress, authenticated durable Redis, transaction-reconciliation operations, wallet challenges, IP quotas, approved allocation and alarm testing.
7. Bridge: only proceed after independent audit and controlled pilot with capped assets; the current suite contains no live transfers.
8. Document registry: independent review and privacy risk assessment before on-chain anchoring goes live.

Public-facing domains are planned only. Do not claim faucet.winmarchain.io, create.winmarchain.io or verify.winmarchain.io are live unless DNS, TLS, deployment, and end-to-end functions are verified. Production endpoints must use the winmarchain.io family only.

## Verification acceptance criteria

- CI compiles both new contracts and existing faucet / token factory.
- New interface loads with all unsafe transaction buttons disabled by default.
- SHA-256 test vector: empty input must yield e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.
- Document anchor records are scoped by both signer AND SHA-256 digest; third parties may independently verify via getRecord.
- Duplicate anchors revert, only original wallet can revoke its own record, revocation remains on-chain.
- Bridge registry starts paused with every route disabled and no transfer function.
- Frontend never requests a private key, mnemonic, validator or cloud credential.
- No automatic deployment of WMC, foreign tokens, or signing transactions.
