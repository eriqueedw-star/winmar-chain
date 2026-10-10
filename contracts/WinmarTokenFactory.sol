// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./WinmarToken.sol";

/**
 * @title WinmarTokenFactory
 * @notice Permissionless factory for WMC-20 tokens on Winmar Chain.
 * @dev WMC-20 preserves ERC-20 interface compatibility; deployment uses
 *      native WMC for gas and does not mint native WMC.
 *
 * Each creator gets an independent salt namespace. The factory has no
 * admin minting authority over created tokens and charges no protocol fee.
 */
contract WinmarTokenFactory {
    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
        uint256 initialSupply;
        address initialHolder;
        bool mintable;
        bool burnable;
        bool pausable;
    }

    mapping(bytes32 => address) public tokenBySalt;
    mapping(address => address[]) private tokensByCreator;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        bool mintable,
        bool burnable,
        bool pausable,
        bytes32 indexed salt
    );

    error SaltAlreadyUsed();
    error ZeroAddress();

    function createToken(
        TokenConfig calldata config,
        bytes32 userSalt
    ) external returns (address token) {
        if (config.initialHolder == address(0)) revert ZeroAddress();

        bytes32 salt = keccak256(abi.encode(msg.sender, userSalt));
        if (tokenBySalt[salt] != address(0)) revert SaltAlreadyUsed();

        token = address(new WinmarToken(
            config.name,
            config.symbol,
            config.decimals,
            config.initialSupply,
            config.initialHolder,
            config.mintable,
            config.burnable,
            config.pausable,
            msg.sender
        ));

        tokenBySalt[salt] = token;
        tokensByCreator[msg.sender].push(token);

        emit TokenCreated(
            token,
            msg.sender,
            config.name,
            config.symbol,
            config.decimals,
            config.initialSupply,
            config.mintable,
            config.burnable,
            config.pausable,
            salt
        );
    }

    function tokensOf(address creator) external view returns (address[] memory) {
        return tokensByCreator[creator];
    }
}
