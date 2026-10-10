// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WinmarDocumentRegistry
 * @notice Permissionless self-attestation of a locally computed SHA-256 document hash.
 * @dev An anchor proves that a wallet submitted a digest at a block timestamp.
 *      It does NOT prove document contents, legal authenticity, ownership, or
 *      institutional endorsement. Files and personal information are never uploaded.
 */
contract WinmarDocumentRegistry {
    struct Anchor {
        uint64 anchoredAt;
        uint64 revokedAt;
    }

    // Issuer wallet => SHA-256 hash => recorded attestation.
    mapping(address => mapping(bytes32 => Anchor)) private anchors;

    error EmptyHash();
    error AlreadyAnchored();
    error NotAnchored();
    error AlreadyRevoked();

    event DocumentAnchored(address indexed issuer, bytes32 indexed sha256, uint256 timestamp);
    event DocumentRevoked(address indexed issuer, bytes32 indexed sha256, uint256 timestamp);

    function anchor(bytes32 sha256) external {
        if (sha256 == bytes32(0)) revert EmptyHash();
        Anchor storage item = anchors[msg.sender][sha256];
        if (item.anchoredAt != 0) revert AlreadyAnchored();
        item.anchoredAt = uint64(block.timestamp);
        emit DocumentAnchored(msg.sender, sha256, block.timestamp);
    }

    function revoke(bytes32 sha256) external {
        Anchor storage item = anchors[msg.sender][sha256];
        if (item.anchoredAt == 0) revert NotAnchored();
        if (item.revokedAt != 0) revert AlreadyRevoked();
        item.revokedAt = uint64(block.timestamp);
        emit DocumentRevoked(msg.sender, sha256, block.timestamp);
    }

    function getRecord(address issuer, bytes32 sha256)
        external
        view
        returns (uint64 anchoredAt, uint64 revokedAt)
    {
        Anchor memory item = anchors[issuer][sha256];
        return (item.anchoredAt, item.revokedAt);
    }

    function isActive(address issuer, bytes32 sha256) external view returns (bool) {
        Anchor memory item = anchors[issuer][sha256];
        return item.anchoredAt != 0 && item.revokedAt == 0;
    }
}
