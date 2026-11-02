// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title WinmarTwoOfTwoMultisig
/// @notice Minimal 2-of-2 transaction vault for Winmar Chain.
/// @dev Draft only: do not deploy or fund before independent security review.
contract WinmarTwoOfTwoMultisig {
    error NotSigner();
    error InvalidSignatureCount();
    error DuplicateSigner();
    error InvalidSignature();
    error CallFailed();

    address public immutable signerA;
    address public immutable signerB;
    uint256 public nonce;

    event Executed(uint256 indexed nonce, address indexed to, uint256 value, bytes data);

    constructor(address signerA_, address signerB_) {
        require(signerA_ != address(0) && signerB_ != address(0), "zero signer");
        require(signerA_ != signerB_, "duplicate signer");
        signerA = signerA_;
        signerB = signerB_;
    }

    function transactionHash(address to, uint256 value, bytes calldata data)
        public
        view
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(
            "WINMAR_MULTISIG_V1",
            block.chainid,
            address(this),
            nonce,
            to,
            value,
            keccak256(data)
        ));
    }

    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signatureA,
        bytes calldata signatureB
    ) external returns (bytes memory result) {
        bytes32 digest = transactionHash(to, value, data);
        address recoveredA = _recover(digest, signatureA);
        address recoveredB = _recover(digest, signatureB);
        if (recoveredA != signerA && recoveredA != signerB) revert NotSigner();
        if (recoveredB != signerA && recoveredB != signerB) revert NotSigner();
        if (recoveredA == recoveredB) revert DuplicateSigner();

        unchecked { ++nonce; }
        (bool ok, bytes memory returned) = to.call{value: value}(data);
        if (!ok) revert CallFailed();
        emit Executed(nonce - 1, to, value, data);
        return returned;
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert InvalidSignatureCount();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert InvalidSignature();
        address recovered = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)), v, r, s);
        if (recovered == address(0)) revert InvalidSignature();
        return recovered;
    }

    receive() external payable {}
}
