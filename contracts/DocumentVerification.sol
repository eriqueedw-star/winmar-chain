// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Winmar Document Verification
/// @notice Anchors SHA-256 digests of off-chain documents on Winmar Chain.
/// @dev The contract never stores document contents or personal data.
contract DocumentVerification {
    struct Document {
        bytes32 documentHash;
        address issuer;
        uint64 issuedAt;
        uint64 revokedAt;
        bytes32 metadataHash;
    }

    error NotOwner();
    error NotIssuer();
    error ZeroAddress();
    error EmptyDocumentId();
    error EmptyDocumentHash();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyRevoked();

    address public owner;
    address public pendingOwner;
    mapping(address issuer => bool authorized) public issuers;
    mapping(bytes32 documentId => Document record) private documents;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event IssuerUpdated(address indexed issuer, bool authorized);
    event DocumentRegistered(
        bytes32 indexed documentId,
        bytes32 indexed documentHash,
        address indexed issuer,
        uint64 issuedAt,
        bytes32 metadataHash
    );
    event DocumentRevoked(bytes32 indexed documentId, address indexed issuer, uint64 revokedAt);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyIssuer() {
        if (!issuers[msg.sender]) revert NotIssuer();
        _;
    }

    modifier onlyIssuerOrOwner() {
        if (!issuers[msg.sender] && msg.sender != owner) revert NotIssuer();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function setIssuer(address issuer, bool authorized) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddress();
        issuers[issuer] = authorized;
        emit IssuerUpdated(issuer, authorized);
    }

    function registerDocument(
        bytes32 documentId,
        bytes32 documentHash,
        bytes32 metadataHash
    ) external onlyIssuer {
        if (documentId == bytes32(0)) revert EmptyDocumentId();
        if (documentHash == bytes32(0)) revert EmptyDocumentHash();
        if (documents[documentId].issuedAt != 0) revert AlreadyRegistered();

        uint64 issuedAt = uint64(block.timestamp);
        documents[documentId] = Document({
            documentHash: documentHash,
            issuer: msg.sender,
            issuedAt: issuedAt,
            revokedAt: 0,
            metadataHash: metadataHash
        });

        emit DocumentRegistered(documentId, documentHash, msg.sender, issuedAt, metadataHash);
    }

    function revokeDocument(bytes32 documentId) external onlyIssuerOrOwner {
        Document storage record = documents[documentId];
        if (record.issuedAt == 0) revert NotRegistered();
        if (record.revokedAt != 0) revert AlreadyRevoked();
        if (record.issuer != msg.sender && msg.sender != owner) revert NotIssuer();

        record.revokedAt = uint64(block.timestamp);
        emit DocumentRevoked(documentId, msg.sender, record.revokedAt);
    }

    function getDocument(bytes32 documentId) external view returns (Document memory) {
        if (documents[documentId].issuedAt == 0) revert NotRegistered();
        return documents[documentId];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotOwner();
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }
}
