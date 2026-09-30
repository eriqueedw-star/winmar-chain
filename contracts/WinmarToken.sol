// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WinmarToken
 * @notice Transparent ERC-20 template used by WinmarTokenFactory.
 *
 * No transfer tax, blacklist, hidden mint, honeypot, reflection, or
 * arbitrary transfer restriction is implemented.
 */
contract WinmarToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    bool public immutable mintable;
    bool public immutable burnable;
    bool public immutable pausable;

    address public owner;
    bool public paused;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    error NotOwner();
    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();
    error Paused();
    error NotMintable();
    error NotBurnable();

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PausedStateChanged(bool paused);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (pausable && paused) revert Paused();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address initialHolder_,
        bool mintable_,
        bool burnable_,
        bool pausable_,
        address owner_
    ) {
        if (initialHolder_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        mintable = mintable_;
        burnable = burnable_;
        pausable = pausable_;
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
        _mint(initialHolder_, initialSupply_);
    }

    function transfer(address to, uint256 value) external whenNotPaused returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external whenNotPaused returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external whenNotPaused returns (bool) {
        uint256 current = allowance[from][msg.sender];
        if (current < value) revert InsufficientAllowance();
        if (current != type(uint256).max) {
            unchecked { allowance[from][msg.sender] = current - value; }
            emit Approval(from, msg.sender, current - value);
        }
        _transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyOwner whenNotPaused {
        if (!mintable) revert NotMintable();
        if (to == address(0)) revert ZeroAddress();
        _mint(to, value);
    }

    function burn(uint256 value) external whenNotPaused {
        if (!burnable) revert NotBurnable();
        _burn(msg.sender, value);
    }

    function burnFrom(address from, uint256 value) external whenNotPaused {
        if (!burnable) revert NotBurnable();
        uint256 current = allowance[from][msg.sender];
        if (current < value) revert InsufficientAllowance();
        if (current != type(uint256).max) {
            unchecked { allowance[from][msg.sender] = current - value; }
            emit Approval(from, msg.sender, current - value);
        }
        _burn(from, value);
    }

    function setPaused(bool value) external onlyOwner {
        if (!pausable) revert Paused();
        paused = value;
        emit PausedStateChanged(value);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = owner;
        owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }

    function renounceOwnership() external onlyOwner {
        address previous = owner;
        owner = address(0);
        emit OwnershipTransferred(previous, address(0));
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBalance = balanceOf[from];
        if (fromBalance < value) revert InsufficientBalance();
        unchecked { balanceOf[from] = fromBalance - value; }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        balanceOf[to] += value;
        totalSupply += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        uint256 fromBalance = balanceOf[from];
        if (fromBalance < value) revert InsufficientBalance();
        unchecked { balanceOf[from] = fromBalance - value; }
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }
}
