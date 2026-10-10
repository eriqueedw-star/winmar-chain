// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WinmarBridgeAssetRegistry
 * @notice Governance catalog of reviewed origin / destination token pairs.
 * @dev Metadata-only. This contract does NOT move, mint, burn, lock or custody assets.
 *      Every route is DISABLED by default; only a separately reviewed bridge
 *      with verified settlement logic could ever enable asset movement.
 */
contract WinmarBridgeAssetRegistry {
    struct Route {
        uint256 sourceChainId;
        address sourceToken;
        address winmarWrappedToken;
        bool enabled;
    }

    address public admin;
    bool public paused = true;
    mapping(bytes32 => Route) private routes;

    error NotAdmin();
    error ZeroAddress();
    error InvalidRoute();
    error DuplicateRoute();

    event RouteRegistered(bytes32 indexed id, uint256 sourceChainId, address indexed sourceToken, address indexed winmarWrappedToken);
    event RouteStatusChanged(bytes32 indexed id, bool enabled);
    event RegistryPaused(bool paused);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address admin_) {
        if (admin_ == address(0)) revert ZeroAddress();
        admin = admin_;
    }

    function computeRouteId(uint256 sourceChainId, address sourceToken)
        public pure returns (bytes32)
    {
        return keccak256(abi.encode(sourceChainId, sourceToken));
    }

    function registerRoute(uint256 sourceChainId, address sourceToken, address winmarWrappedToken)
        external onlyAdmin returns (bytes32 id)
    {
        if (sourceChainId == 0 || sourceChainId == 12142816) revert InvalidRoute();
        if (sourceToken == address(0) || winmarWrappedToken == address(0)) revert ZeroAddress();
        id = computeRouteId(sourceChainId, sourceToken);
        if (routes[id].sourceChainId != 0) revert DuplicateRoute();
        routes[id] = Route(sourceChainId, sourceToken, winmarWrappedToken, false);
        emit RouteRegistered(id, sourceChainId, sourceToken, winmarWrappedToken);
    }

    function setRouteEnabled(bytes32 id, bool enabled) external onlyAdmin {
        if (routes[id].sourceChainId == 0) revert InvalidRoute();
        // Fail closed while the registry is globally paused.
        if (enabled && paused) revert InvalidRoute();
        routes[id].enabled = enabled;
        emit RouteStatusChanged(id, enabled);
    }

    function setPaused(bool value) external onlyAdmin {
        paused = value;
        emit RegistryPaused(value);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    function getRoute(bytes32 id) external view returns (Route memory) {
        return routes[id];
    }

    function isRouteActive(bytes32 id) external view returns (bool) {
        return !paused && routes[id].enabled;
    }
}
