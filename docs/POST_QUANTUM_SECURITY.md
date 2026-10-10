# Post-Quantum Security Foundation

Status: **Phase 1 foundation — experimental, not consensus-enforced**

Winmar Chain remains an EVM-compatible Hyperledger Besu network using QBFT Proof of Authority. This document defines the migration path toward a hybrid classical + post-quantum transaction assurance layer without misrepresenting the current production consensus.

## Objective

The target architecture preserves normal EVM compatibility while adding an independently verifiable post-quantum signature proof for selected transactions and validator identities.

Target profile:

- Network: Winmar Chain
- Chain ID: `12142816`
- Consensus: QBFT Proof of Authority
- Classical account signature: ECDSA / secp256k1
- Post-quantum target: ML-DSA under NIST FIPS 204
- Security mode target: hybrid classical + post-quantum
- Deployment principle: additive and backward-compatible

## Phase 1 implemented in this repository

Phase 1 adds:

1. A public post-quantum architecture and evidence model.
2. `WinmarPQProofRegistry.sol`, an on-chain registry that binds a Winmar transaction hash to a cryptographic proof commitment and an approved verifier attestation.
3. Explicit separation between:
   - cryptographic verification performed by an audited ML-DSA verifier, and
   - the on-chain attestation/commitment recorded by the registry.
4. A future explorer surface for displaying PQ assurance status.

The registry **does not itself implement ML-DSA verification**. A record in the registry is an attestation by an approved verifier and must not be described as native consensus-level post-quantum verification.

## Target verification flow

```text
EVM transaction
  |
  +-- ECDSA/secp256k1 signature -> normal EVM validity
  |
  +-- canonical PQ message
       |
       +-- ML-DSA signature
       |
       +-- audited verifier
             |
             +-- proof commitment
             +-- algorithm identifier
             +-- verifier identity
             |
             +-- WinmarPQProofRegistry
                     |
                     +-- explorer / API evidence
```

## Canonical message domain

A post-quantum signature must be domain-separated so that a signature cannot be replayed across networks or protocols.

Recommended canonical payload:

```text
WINMAR_PQ_V1
chainId=12142816
txHash=<32-byte transaction hash>
account=<20-byte EVM account>
nonce=<uint256>
expiresAt=<unix timestamp or 0>
```

The exact byte encoding must be frozen in a versioned specification before production use. JSON stringification must not be used as the canonical byte encoding unless every serialization detail is normative.

## Evidence requirements

A production claim of "quantum-resistant" requires all of the following:

- ML-DSA implementation sourced from a maintained cryptographic library.
- Published algorithm/profile identifier and parameter set.
- Deterministic canonical-message specification.
- Positive and negative test vectors.
- Cross-implementation verification where practical.
- Independent security review of integration code.
- Proof that the verifier used for an attestation matches the audited build.
- On-chain proof commitment linked to the transaction hash.
- Explorer/API output that exposes algorithm, verifier, commitment, and verification timestamp.
- Operational controls for verifier authorization, key rotation, compromise response, and revocation.

## Claim policy

Until the production gates above are complete:

Allowed:
- "Post-quantum foundation"
- "Hybrid post-quantum architecture in development"
- "Designed for quantum-resilient transaction assurance"

Not yet allowed as a production fact:
- "Quantum-secure blockchain"
- "All Winmar Chain transactions are quantum-resistant"
- "ML-DSA is enforced by QBFT consensus"

## Phase 2

Phase 2 should add the actual ML-DSA verification service/library integration, reproducible test vectors, signed build provenance, and explorer/API integration.

## Phase 3

Phase 3 should evaluate consensus-level or account-abstraction enforcement for transaction classes that require both ECDSA and ML-DSA authorization.
