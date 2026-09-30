// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WinmarFaucet
 * @notice Native WMC developer faucet.
 *
 * Intended for a dedicated testnet/devnet treasury. It is deliberately
 * independent from validator keys and does not mint WMC.
 */
contract WinmarFaucet {
    address public immutable admin;
    uint256 public claimAmount;
    uint256 public cooldown;
    uint256 public dailyCap;
    bool public paused;

    mapping(address => uint256) public lastClaimAt;
    mapping(address => uint256) public claimedTotal;

    uint256 public currentDay;
    uint256 public distributedToday;

    error NotAdmin();
    error FaucetPaused();
    error InvalidConfig();
    error CooldownActive(uint256 nextClaimAt);
    error DailyCapExceeded();
    error InsufficientFaucetBalance();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(
        address admin_,
        uint256 claimAmount_,
        uint256 cooldown_,
        uint256 dailyCap_
    ) {
        if (admin_ == address(0) || claimAmount_ == 0 || dailyCap_ < claimAmount_) {
            revert InvalidConfig();
        }
        admin = admin_;
        claimAmount = claimAmount_;
        cooldown = cooldown_;
        dailyCap = dailyCap_;
        currentDay = block.timestamp / 1 days;
    }

    receive() external payable {}

    function claim() external {
        if (paused) revert FaucetPaused();

        uint256 nowTime = block.timestamp;
        uint256 nextClaimAt = lastClaimAt[msg.sender] + cooldown;
        if (lastClaimAt[msg.sender] != 0 && nowTime < nextClaimAt) {
            revert CooldownActive(nextClaimAt);
        }

        uint256 day = nowTime / 1 days;
        if (day != currentDay) {
            currentDay = day;
            distributedToday = 0;
        }

        if (distributedToday + claimAmount > dailyCap) revert DailyCapExceeded();
        if (address(this).balance < claimAmount) revert InsufficientFaucetBalance();

        lastClaimAt[msg.sender] = nowTime;
        claimedTotal[msg.sender] += claimAmount;
        distributedToday += claimAmount;

        (bool ok,) = payable(msg.sender).call{value: claimAmount}("");
        if (!ok) revert TransferFailed();
        emit Claim(msg.sender, claimAmount, nowTime);
    }

    function setParameters(
        uint256 claimAmount_,
        uint256 cooldown_,
        uint256 dailyCap_
    ) external onlyAdmin {
        if (claimAmount_ == 0 || dailyCap_ < claimAmount_) revert InvalidConfig();
        claimAmount = claimAmount_;
        cooldown = cooldown_;
        dailyCap = dailyCap_;
        emit ParametersUpdated(claimAmount_, cooldown_, dailyCap_);
    }

    function setPaused(bool value) external onlyAdmin {
        paused = value;
        emit PausedStateChanged(value);
    }

    function withdraw(address payable recipient, uint256 amount) external onlyAdmin {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount > address(this).balance) revert InsufficientFaucetBalance();

        (bool ok,) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit TreasuryWithdrawal(recipient, amount);
    }

    function availableBalance() external view returns (uint256) {
        return address(this).balance;
    }

    event Claim(address indexed recipient, uint256 amount, uint256 timestamp);
    event ParametersUpdated(uint256 claimAmount, uint256 cooldown, uint256 dailyCap);
    event PausedStateChanged(bool paused);
    event TreasuryWithdrawal(address indexed recipient, uint256 amount);
}
