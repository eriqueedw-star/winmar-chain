// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title WinmarFixedPriceOracle
/// @notice Chainlink AggregatorV3-compatible fixed WMC/USD reference feed.
/// @dev The admin should be the deployed 2-of-2 company multisig. This is a
///      reference price, not a market price or a promise of liquidity.
contract WinmarFixedPriceOracle {
    error NotAdmin();
    error ZeroAddress();
    error InvalidPrice();
    error InvalidHeartbeat();

    uint8 public constant overrideDecimals = 8;
    string public constant description = "WMC / USD fixed reference price";

    address public admin;
    uint80 private _roundId;
    int256 private _answer;
    uint256 private _updatedAt;
    uint256 public immutable heartbeat;

    event PriceUpdated(uint80 indexed roundId, int256 answer, uint256 updatedAt);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    constructor(address admin_, uint256 heartbeat_, int256 initialAnswer_) {
        if (admin_ == address(0)) revert ZeroAddress();
        if (heartbeat_ == 0) revert InvalidHeartbeat();
        if (initialAnswer_ <= 0) revert InvalidPrice();
        admin = admin_;
        heartbeat = heartbeat_;
        _roundId = 1;
        _answer = initialAnswer_;
        _updatedAt = block.timestamp;
        emit PriceUpdated(_roundId, _answer, _updatedAt);
    }

    function decimals() external pure returns (uint8) { return overrideDecimals; }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        if (block.timestamp > _updatedAt + heartbeat) revert InvalidHeartbeat();
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }

    function setPrice(int256 newAnswer) external {
        if (msg.sender != admin) revert NotAdmin();
        if (newAnswer <= 0) revert InvalidPrice();
        unchecked { ++_roundId; }
        _answer = newAnswer;
        _updatedAt = block.timestamp;
        emit PriceUpdated(_roundId, _answer, _updatedAt);
    }

    function transferAdmin(address newAdmin) external {
        if (msg.sender != admin) revert NotAdmin();
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}
