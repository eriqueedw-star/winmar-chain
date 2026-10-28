// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Winmar Oracle Router
/// @notice Testnet-first price-feed registry for WMCore.
/// @dev A relayer writes validated prices. Consumers must reject stale/paused feeds.
contract WinmarOracleRouter {
    error NotOwner();
    error NotUpdater();
    error FeedMissing();
    error FeedIsPaused();
    error BadPrice();
    error BadTimestamp();
    error StaleFeed();
    error DeviationExceeded();
    error BadConfig();

    struct Feed {
        int256 answer;
        uint8 decimals;
        uint64 updatedAt;
        uint64 heartbeat;
        uint16 maxDeviationBps;
        bool exists;
        bool paused;
    }

    address public owner;
    mapping(address => bool) public isUpdater;
    mapping(bytes32 => Feed) private feeds;
    mapping(bytes32 => uint80) private rounds;

    event UpdaterSet(address indexed updater, bool enabled);
    event FeedConfigured(bytes32 indexed feedId, uint8 decimals, uint64 heartbeat, uint16 maxDeviationBps);
    event PriceUpdated(bytes32 indexed feedId, uint80 indexed roundId, int256 answer, uint64 updatedAt);
    event FeedPaused(bytes32 indexed feedId, bool paused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyUpdater() {
        if (!isUpdater[msg.sender]) revert NotUpdater();
        _;
    }

    constructor(address initialUpdater) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
        if (initialUpdater != address(0)) {
            isUpdater[initialUpdater] = true;
            emit UpdaterSet(initialUpdater, true);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert BadConfig();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setUpdater(address updater, bool enabled) external onlyOwner {
        if (updater == address(0)) revert BadConfig();
        isUpdater[updater] = enabled;
        emit UpdaterSet(updater, enabled);
    }

    function configureFeed(
        bytes32 feedId,
        uint8 decimals_,
        uint64 heartbeat,
        uint16 maxDeviationBps
    ) external onlyOwner {
        if (feedId == bytes32(0) || heartbeat == 0 || maxDeviationBps == 0 || maxDeviationBps > 10_000) revert BadConfig();
        Feed storage feed = feeds[feedId];
        feed.decimals = decimals_;
        feed.heartbeat = heartbeat;
        feed.maxDeviationBps = maxDeviationBps;
        feed.exists = true;
        emit FeedConfigured(feedId, decimals_, heartbeat, maxDeviationBps);
    }

    function setFeedPaused(bytes32 feedId, bool paused) external onlyOwner {
        Feed storage feed = feeds[feedId];
        if (!feed.exists) revert FeedMissing();
        feed.paused = paused;
        emit FeedPaused(feedId, paused);
    }

    function updatePrice(bytes32 feedId, int256 answer, uint64 observedAt) external onlyUpdater {
        Feed storage feed = feeds[feedId];
        if (!feed.exists) revert FeedMissing();
        if (feed.paused) revert FeedIsPaused();
        if (answer <= 0) revert BadPrice();
        if (observedAt == 0 || observedAt > block.timestamp) revert BadTimestamp();
        if (feed.updatedAt != 0) {
            uint256 previous = uint256(feed.answer);
            uint256 delta = answer >= feed.answer ? uint256(answer) - previous : previous - uint256(answer);
            if (delta * 10_000 > previous * feed.maxDeviationBps) revert DeviationExceeded();
        }
        uint80 roundId = rounds[feedId] + 1;
        rounds[feedId] = roundId;
        feed.answer = answer;
        feed.updatedAt = observedAt;
        emit PriceUpdated(feedId, roundId, answer, observedAt);
    }

    function getPrice(bytes32 feedId) external view returns (int256 answer, uint8 decimals_, uint64 updatedAt) {
        Feed memory feed = feeds[feedId];
        if (!feed.exists) revert FeedMissing();
        if (feed.paused) revert FeedIsPaused();
        if (feed.updatedAt == 0 || block.timestamp - feed.updatedAt > feed.heartbeat) revert StaleFeed();
        return (feed.answer, feed.decimals, feed.updatedAt);
    }

    function latestRoundData(bytes32 feedId) external view returns (uint80 roundId, int256 answer, uint8 decimals_, uint64 updatedAt) {
        (answer, decimals_, updatedAt) = this.getPrice(feedId);
        return (rounds[feedId], answer, decimals_, updatedAt);
    }

    function feedConfig(bytes32 feedId) external view returns (Feed memory) {
        Feed memory feed = feeds[feedId];
        if (!feed.exists) revert FeedMissing();
        return feed;
    }
}
