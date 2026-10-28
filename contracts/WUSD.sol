// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";

/// @title Winmar USD Stablecoin
/// @notice Reserve-backed settlement token for approved Winmar applications.
/// @dev This contract does not prove off-chain reserves. Mint authority must be
///      held by an approved multisig/custodian and reconciled against reserves.
contract WMUSD is ERC20, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    error ZeroAddress();
    error EmptyReserveReference();
    error ReserveAlreadyUsed();
    error MintCapExceeded();
    error MintingDisabled();

    uint256 public mintCap;
    bool public mintingEnabled;
    uint256 public totalMintedAgainstReserve;
    mapping(bytes32 reserveReference => bool used) public reserveReferences;

    event ReserveMinted(
        address indexed account,
        uint256 amount,
        bytes32 indexed reserveReference,
        address indexed operator
    );
    event RedemptionBurned(address indexed account, uint256 amount, bytes32 indexed redemptionReference, address indexed operator);
    event MintCapUpdated(uint256 previousCap, uint256 newCap);
    event MintingStatusUpdated(bool enabled);

    constructor(address admin, address minter, address burner, address pauser, uint256 initialMintCap)
        ERC20("Winmar USD Stablecoin", "WMUSD")
    {
        if (admin == address(0) || minter == address(0) || burner == address(0) || pauser == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(BURNER_ROLE, burner);
        _grantRole(PAUSER_ROLE, pauser);
        mintCap = initialMintCap;
        mintingEnabled = false;
        emit MintCapUpdated(0, initialMintCap);
        emit MintingStatusUpdated(false);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mintAgainstReserve(address account, uint256 amount, bytes32 reserveReference)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        if (!mintingEnabled) revert MintingDisabled();
        if (account == address(0)) revert ZeroAddress();
        if (reserveReference == bytes32(0)) revert EmptyReserveReference();
        if (reserveReferences[reserveReference]) revert ReserveAlreadyUsed();
        if (mintCap == 0 || totalMintedAgainstReserve + amount > mintCap) revert MintCapExceeded();

        reserveReferences[reserveReference] = true;
        totalMintedAgainstReserve += amount;
        _mint(account, amount);
        emit ReserveMinted(account, amount, reserveReference, msg.sender);
    }

    function burnForRedemption(address account, uint256 amount, bytes32 redemptionReference)
        external
        onlyRole(BURNER_ROLE)
        whenNotPaused
    {
        if (account == address(0)) revert ZeroAddress();
        if (redemptionReference == bytes32(0)) revert EmptyReserveReference();
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        emit RedemptionBurned(account, amount, redemptionReference, msg.sender);
    }

    function setMintCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 previous = mintCap;
        mintCap = newCap;
        emit MintCapUpdated(previous, newCap);
    }

    /// @notice Enables or disables reserve-backed minting after legal, reserve,
    ///         attestation, and operational approvals are complete.
    function setMintingEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintingEnabled = enabled;
        emit MintingStatusUpdated(enabled);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
