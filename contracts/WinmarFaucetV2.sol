// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title WinmarFaucetV2
 * @notice Native WMC faucet with one lifetime claim per recipient.
 *
 * The faucet never mints WMC. It distributes only native WMC deposited into
 * this contract. A new deployment starts paused and must remain paused until
 * funding, monitoring, and any required relayer controls are ready.
 */
contract WinmarFaucetV2 {
    address public immutable admin;
    address public relayer;
    bool private claiming;
    uint256 public claimAmount;
    uint256 public dailyCap;
    bool public paused;

    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public claimedTotal;

    uint256 public currentDay;
    uint256 public distributedToday;

    error NotAdmin();
    error NotRelayer();
    error ReentrantClaim();
    error FaucetPaused();
    error InvalidConfig();
    error AlreadyClaimed();
    error DailyCapExceeded();
    error InsufficientFaucetBalance();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier nonReentrant() {
        if (claiming) revert ReentrantClaim();
        claiming = true;
        _;
        claiming = false;
    }

    constructor(address admin_, uint256 claimAmount_, uint256 dailyCap_) {
        if (admin_ == address(0) || claimAmount_ == 0 || dailyCap_ < claimAmount_) {
            revert InvalidConfig();
        }
        admin = admin_;
        claimAmount = claimAmount_;
        dailyCap = dailyCap_;
        currentDay = block.timestamp / 1 days;
        paused = true;
    }

    receive() external payable {}

    function claim() external nonReentrant {
        _claim(msg.sender);
    }

    /**
     * @dev Only a trusted service wallet can sponsor gas on behalf of a
     * recipient. Enable a relayer only after independent anti-abuse controls
     * and operational key custody have been reviewed.
     */
    function claimFor(address recipient) external nonReentrant {
        if (msg.sender != relayer || relayer == address(0)) revert NotRelayer();
        if (recipient == address(0)) revert ZeroAddress();
        _claim(recipient);
    }

    function _claim(address recipient) internal {
        if (paused) revert FaucetPaused();
        if (hasClaimed[recipient]) revert AlreadyClaimed();

        uint256 day = block.timestamp / 1 days;
        if (day != currentDay) {
            currentDay = day;
            distributedToday = 0;
        }

        if (distributedToday + claimAmount > dailyCap) revert DailyCapExceeded();
        if (address(this).balance < claimAmount) revert InsufficientFaucetBalance();

        hasClaimed[recipient] = true;
        claimedTotal[recipient] = claimAmount;
        distributedToday += claimAmount;

        (bool ok,) = payable(recipient).call{value: claimAmount}("");
        if (!ok) revert TransferFailed();
        emit Claim(recipient, claimAmount, block.timestamp);
    }

    function setRelayer(address relayer_) external onlyAdmin {
        address previous = relayer;
        relayer = relayer_;
        emit RelayerUpdated(previous, relayer_);
    }

    function setParameters(uint256 claimAmount_, uint256 dailyCap_) external onlyAdmin {
        if (claimAmount_ == 0 || dailyCap_ < claimAmount_) revert InvalidConfig();
        claimAmount = claimAmount_;
        dailyCap = dailyCap_;
        emit ParametersUpdated(claimAmount_, dailyCap_);
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
    event RelayerUpdated(address indexed previousRelayer, address indexed newRelayer);
    event ParametersUpdated(uint256 claimAmount, uint256 dailyCap);
    event PausedStateChanged(bool paused);
    event TreasuryWithdrawal(address indexed recipient, uint256 amount);
}
