// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./WinmarToken.sol";

/**
 * @title WinmarTokenFactory
 * @notice Permissionless factory for the transparent WinmarToken template.
 *
 * Each creator gets an independent CREATE2 namespace. The factory has no
 * admin minting authority over created tokens and charges no protocol fee.
 */
contract WinmarTokenFactory {
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
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address initialHolder_,
        bool mintable_,
        bool burnable_,
        bool pausable_,
        bytes32 userSalt
    ) external returns (address token) {
        if (initialHolder_ == address(0)) revert ZeroAddress();

        bytes32 salt = keccak256(abi.encode(msg.sender, userSalt));
        if (tokenBySalt[salt] != address(0)) revert SaltAlreadyUsed();

        token = address(new WinmarToken{salt: salt}(
            name_,
            symbol_,
            decimals_,
            initialSupply_,
            initialHolder_,
            mintable_,
            burnable_,
            pausable_,
            msg.sender
        ));

        tokenBySalt[salt] = token;
        tokensByCreator[msg.sender].push(token);

        emit TokenCreated(
            token,
            msg.sender,
            name_,
            symbol_,
            decimals_,
            initialSupply_,
            mintable_,
            burnable_,
            pausable_,
            salt
        );
    }

    function predictTokenAddress(
        address creator,
        bytes32 userSalt,
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address initialHolder_,
        bool mintable_,
        bool burnable_,
        bool pausable_
    ) external view returns (address predicted) {
        bytes32 salt = keccak256(abi.encode(creator, userSalt));
        bytes memory initCode = abi.encodePacked(
            type(WinmarToken).creationCode,
            abi.encode(
                name_,
                symbol_,
                decimals_,
                initialSupply_,
                initialHolder_,
                mintable_,
                burnable_,
                pausable_,
                creator
            )
        );
        bytes32 initCodeHash = keccak256(initCode);
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            initCodeHash
        )))));
    }

    function tokensOf(address creator) external view returns (address[] memory) {
        return tokensByCreator[creator];
    }
}
