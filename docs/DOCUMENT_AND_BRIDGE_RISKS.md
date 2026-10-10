# Document anchor / wrapped asset risk disclosure

## Document anchor evidence

DocumentRegistry is a self-attestation service, not an identity provider. Every issuer is a wallet address. It verifies matching SHA-256 bytes and public issuer participation; it does not verify who controls that wallet in the real world. Before someone relies on a claim from a purported institution, independently authenticate the wallet address and its signing authority. Never put private documents or sensitive personal data on-chain. SHA-256 file hashes can reveal equality of low-entropy or widely shared documents.

Suggested record: document hash, issuer wallet, chain ID, contract address, anchored transaction hash, block number, UTC chain timestamp and latest revocation status. Do not invent timestamps or transaction hashes.

## Wrapped asset risk

A bridged asset is a representation of a claim on underlying assets; a contract named USDT/USDC/ETH is not automatically endorsed by those issuers. Source token contract, custody, audit, caps, transfer mechanics, validator trust, relayer signatures, finality, and monitoring must be verified. Mainnet bridge transfer must stay disabled until approved separately.

This suite does NOT claim independent audit, issuer endorsement, source-chain settlement, stablecoin backing, or production readiness.
