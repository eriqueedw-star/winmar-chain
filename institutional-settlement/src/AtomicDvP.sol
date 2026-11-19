// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IInstitutionRegistry} from "./InstitutionRegistry.sol";

interface ISettlementERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @notice Atomic delivery-versus-payment for permissioned demo tokens.
/// @dev Both token transfers execute in the SAME EVM transaction or both revert.
///      No MAS/CBDC integration or cross-chain settlement is implemented here.
contract AtomicDvP {
    struct Trade {
        address seller;
        address buyer;
        address assetToken;
        address paymentToken;
        uint256 assetAmount;
        uint256 paymentAmount;
        uint64 deadline;
        bool buyerAccepted;
        bool completed;
        bool cancelled;
    }

    IInstitutionRegistry public immutable registry;
    uint256 public nextTradeId;
    bool private entered;

    mapping(uint256 => Trade) public trades;

    event TradeProposed(uint256 indexed id, address indexed seller, address indexed buyer);
    event TradeAccepted(uint256 indexed id, address indexed buyer);
    event TradeSettled(uint256 indexed id, address indexed seller, address indexed buyer);
    event TradeCancelled(uint256 indexed id);

    modifier nonReentrant() {
        require(!entered, "DvP: reentrant");
        entered = true;
        _;
        entered = false;
    }

    constructor(address registryAddress) {
        require(registryAddress.code.length > 0, "DvP: invalid registry");
        registry = IInstitutionRegistry(registryAddress);
    }

    function proposeTrade(
        address buyer,
        address assetToken,
        address paymentToken,
        uint256 assetAmount,
        uint256 paymentAmount,
        uint64 deadline
    ) external nonReentrant returns (uint256 id) {
        require(registry.isActive(msg.sender) && registry.isActive(buyer), "DvP: unverified party");
        require(msg.sender != buyer, "DvP: same party");
        require(assetToken != paymentToken, "DvP: same token");
        require(assetToken.code.length > 0 && paymentToken.code.length > 0, "DvP: invalid token");
        require(assetAmount > 0 && paymentAmount > 0, "DvP: zero amount");
        require(uint256(deadline) > block.timestamp, "DvP: invalid deadline");

        id = ++nextTradeId;
        trades[id] = Trade({
            seller: msg.sender,
            buyer: buyer,
            assetToken: assetToken,
            paymentToken: paymentToken,
            assetAmount: assetAmount,
            paymentAmount: paymentAmount,
            deadline: deadline,
            buyerAccepted: false,
            completed: false,
            cancelled: false
        });
        emit TradeProposed(id, msg.sender, buyer);
    }

    function acceptTrade(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        require(t.buyer == msg.sender, "DvP: not buyer");
        require(!t.cancelled && !t.completed && !t.buyerAccepted, "DvP: inactive trade");
        require(block.timestamp <= t.deadline, "DvP: expired");
        require(registry.isActive(t.seller) && registry.isActive(msg.sender), "DvP: unverified party");
        t.buyerAccepted = true;
        emit TradeAccepted(id, msg.sender);
    }

    function cancelTrade(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        require(msg.sender == t.seller || msg.sender == t.buyer, "DvP: not party");
        require(!t.cancelled && !t.completed, "DvP: inactive trade");
        t.cancelled = true;
        emit TradeCancelled(id);
    }

    /// @notice Either party or an authorized automation can finalize an accepted trade.
    /// @dev ERC-20 transferFrom must return true. The transaction reverts atomically on failure.
    function settle(uint256 id) external nonReentrant {
        Trade storage t = trades[id];
        require(t.seller != address(0) && t.buyerAccepted, "DvP: not accepted");
        require(!t.cancelled && !t.completed, "DvP: inactive trade");
        require(block.timestamp <= t.deadline, "DvP: expired");
        require(registry.isActive(t.seller) && registry.isActive(t.buyer), "DvP: unverified party");
        t.completed = true; // effects before interactions; revert restores state and balances

        require(
            ISettlementERC20(t.assetToken).transferFrom(t.seller, t.buyer, t.assetAmount),
            "DvP: asset transfer failed"
        );
        require(
            ISettlementERC20(t.paymentToken).transferFrom(t.buyer, t.seller, t.paymentAmount),
            "DvP: payment transfer failed"
        );
        emit TradeSettled(id, t.seller, t.buyer);
    }
}
