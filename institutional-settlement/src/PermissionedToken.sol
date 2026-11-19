// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IInstitutionRegistry} from "./InstitutionRegistry.sol";

/// @notice Demo-only permissioned WMC-20/ERC-20 settlement or asset token.
/// @dev No fiat reserves, CBDC claim, government guarantee or redemption right is implied.
contract PermissionedToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    IInstitutionRegistry public immutable registry;
    address public issuer;
    address public pendingIssuer;
    bool public paused;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event IssuerTransferStarted(address indexed previousIssuer, address indexed proposedIssuer);
    event IssuerTransferred(address indexed previousIssuer, address indexed newIssuer);
    event Paused(bool isPaused);

    modifier onlyIssuer() {
        require(msg.sender == issuer, "Token: not issuer");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Token: paused");
        _;
    }

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        address registryAddress,
        address initialIssuer
    ) {
        require(registryAddress.code.length > 0, "Token: invalid registry");
        require(initialIssuer != address(0), "Token: zero issuer");
        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimals;
        registry = IInstitutionRegistry(registryAddress);
        issuer = initialIssuer;
    }

    function mint(address to, uint256 amount) external onlyIssuer whenNotPaused {
        require(to != address(0) && registry.isActive(to), "Token: inactive receiver");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice A holder can destroy its own demo balance; this is NOT fiat redemption.
    function burn(uint256 amount) external whenNotPaused {
        require(registry.isActive(msg.sender), "Token: inactive holder");
        uint256 previousBalance = balanceOf[msg.sender];
        require(previousBalance >= amount, "Token: insufficient balance");
        unchecked {
            balanceOf[msg.sender] = previousBalance - amount;
            totalSupply -= amount;
        }
        emit Transfer(msg.sender, address(0), amount);
    }

    function approve(address spender, uint256 amount) external whenNotPaused returns (bool) {
        require(registry.isActive(msg.sender), "Token: inactive owner");
        require(spender != address(0), "Token: zero spender");
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external whenNotPaused returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external whenNotPaused returns (bool) {
        uint256 approved = allowance[from][msg.sender];
        if (approved != type(uint256).max) {
            require(approved >= amount, "Token: insufficient allowance");
            unchecked {
                allowance[from][msg.sender] = approved - amount;
            }
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(
            from != address(0) && to != address(0)
                && registry.isActive(from) && registry.isActive(to),
            "Token: inactive participant"
        );
        uint256 previousBalance = balanceOf[from];
        require(previousBalance >= amount, "Token: insufficient balance");
        unchecked {
            balanceOf[from] = previousBalance - amount;
        }
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function setPaused(bool value) external onlyIssuer {
        paused = value;
        emit Paused(value);
    }

    function nominateIssuer(address nextIssuer) external onlyIssuer {
        require(nextIssuer != address(0), "Token: zero next issuer");
        pendingIssuer = nextIssuer;
        emit IssuerTransferStarted(issuer, nextIssuer);
    }

    function acceptIssuer() external {
        require(msg.sender == pendingIssuer, "Token: not nominated");
        address previousIssuer = issuer;
        issuer = msg.sender;
        pendingIssuer = address(0);
        emit IssuerTransferred(previousIssuer, msg.sender);
    }
}
