// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title WinmarPQProofRegistry
/// @notice Anchors post-quantum verification attestations to Winmar Chain transactions.
/// @dev This contract does NOT implement ML-DSA verification. Approved verifier services
///      perform cryptographic verification off-chain and commit the result on-chain.
contract WinmarPQProofRegistry {
    struct Proof {
        bytes32 commitment;
        bytes32 algorithmId;
        address verifier;
        uint64 verifiedAt;
        bool valid;
    }

    address public admin;
    mapping(address => bool) public approvedVerifier;
    mapping(bytes32 => Proof) private proofs;

    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event VerifierAuthorizationChanged(address indexed verifier, bool approved);
    event ProofRecorded(
        bytes32 indexed txHash,
        bytes32 indexed commitment,
        bytes32 indexed algorithmId,
        address verifier,
        uint64 verifiedAt
    );
    event ProofRevoked(bytes32 indexed txHash, address indexed verifier);

    error Unauthorized();
    error ZeroAddress();
    error ZeroValue();
    error ProofAlreadyExists();
    error ProofNotFound();

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert ZeroAddress();
        admin = initialAdmin;
        emit AdminTransferred(address(0), initialAdmin);
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier onlyVerifier() {
        if (!approvedVerifier[msg.sender]) revert Unauthorized();
        _;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        address previous = admin;
        admin = newAdmin;
        emit AdminTransferred(previous, newAdmin);
    }

    function setVerifier(address verifier, bool approved) external onlyAdmin {
        if (verifier == address(0)) revert ZeroAddress();
        approvedVerifier[verifier] = approved;
        emit VerifierAuthorizationChanged(verifier, approved);
    }

    function recordProof(
        bytes32 txHash,
        bytes32 commitment,
        bytes32 algorithmId
    ) external onlyVerifier {
        if (txHash == bytes32(0) || commitment == bytes32(0) || algorithmId == bytes32(0)) {
            revert ZeroValue();
        }
        if (proofs[txHash].verifiedAt != 0) revert ProofAlreadyExists();

        uint64 timestamp = uint64(block.timestamp);
        proofs[txHash] = Proof({
            commitment: commitment,
            algorithmId: algorithmId,
            verifier: msg.sender,
            verifiedAt: timestamp,
            valid: true
        });

        emit ProofRecorded(txHash, commitment, algorithmId, msg.sender, timestamp);
    }

    function revokeProof(bytes32 txHash) external {
        Proof storage proof = proofs[txHash];
        if (proof.verifiedAt == 0) revert ProofNotFound();
        if (msg.sender != admin && msg.sender != proof.verifier) revert Unauthorized();

        proof.valid = false;
        emit ProofRevoked(txHash, msg.sender);
    }

    function getProof(bytes32 txHash) external view returns (Proof memory) {
        return proofs[txHash];
    }

    function isPQAttested(bytes32 txHash) external view returns (bool) {
        Proof memory proof = proofs[txHash];
        return proof.valid && approvedVerifier[proof.verifier];
    }
}
