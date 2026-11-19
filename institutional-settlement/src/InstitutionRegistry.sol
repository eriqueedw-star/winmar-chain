// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Permissioned participant registry for a Winmar Chain settlement sandbox.
/// @dev This does not confer banking status, MAS approval, or legal KYC certification.
interface IInstitutionRegistry {
    function isActive(address account) external view returns (bool);
}

contract InstitutionRegistry is IInstitutionRegistry {
    address public admin;
    address public pendingAdmin;
    mapping(address => bool) public override isActive;

    event InstitutionUpdated(address indexed institution, bool active);
    event AdminTransferStarted(address indexed previousAdmin, address indexed proposedAdmin);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Registry: not admin");
        _;
    }

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "Registry: zero admin");
        admin = initialAdmin;
    }

    function setInstitution(address account, bool active) external onlyAdmin {
        require(account != address(0), "Registry: zero institution");
        isActive[account] = active;
        emit InstitutionUpdated(account, active);
    }

    function nominateAdmin(address nextAdmin) external onlyAdmin {
        require(nextAdmin != address(0), "Registry: zero next admin");
        pendingAdmin = nextAdmin;
        emit AdminTransferStarted(admin, nextAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Registry: not nominated");
        address previousAdmin = admin;
        admin = msg.sender;
        pendingAdmin = address(0);
        emit AdminTransferred(previousAdmin, msg.sender);
    }
}
