// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Winmar Document Verification Fee Payment
/// @notice Collects the application fee in native WMC and forwards it to the
///         approved Document Verification Treasury.
/// @dev Gas is charged separately by the network. This contract only handles
///      the application-level document fee.
contract DocumentFeePayment {
    error NotAdmin();
    error ZeroAddress();
    error InvalidFee();
    error IncorrectPayment();
    error EmptyDocumentId();
    error AlreadyPaid();
    error TransferFailed();

    address public admin;
    address payable public treasury;
    uint256 public documentFee;
    mapping(bytes32 documentId => bool paid) public paidDocuments;

    event FeePaid(bytes32 indexed documentId, address indexed payer, address indexed treasury, uint256 amount);
    event FeeConfigUpdated(address indexed treasury, uint256 documentFee);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address payable initialTreasury, uint256 initialFee) {
        if (initialTreasury == address(0)) revert ZeroAddress();
        if (initialFee == 0) revert InvalidFee();
        admin = msg.sender;
        treasury = initialTreasury;
        documentFee = initialFee;
        emit FeeConfigUpdated(initialTreasury, initialFee);
    }

    function pay(bytes32 documentId) external payable {
        if (documentId == bytes32(0)) revert EmptyDocumentId();
        if (paidDocuments[documentId]) revert AlreadyPaid();
        if (msg.value != documentFee) revert IncorrectPayment();

        paidDocuments[documentId] = true;
        (bool sent,) = treasury.call{value: msg.value}("");
        if (!sent) revert TransferFailed();
        emit FeePaid(documentId, msg.sender, treasury, msg.value);
    }

    function setFeeConfig(address payable newTreasury, uint256 newFee) external onlyAdmin {
        if (newTreasury == address(0)) revert ZeroAddress();
        if (newFee == 0) revert InvalidFee();
        treasury = newTreasury;
        documentFee = newFee;
        emit FeeConfigUpdated(newTreasury, newFee);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    receive() external payable { revert IncorrectPayment(); }
    fallback() external payable { revert IncorrectPayment(); }
}
