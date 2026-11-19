// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IInstitutionRegistry} from "./InstitutionRegistry.sol";
import {ISettlementERC20} from "./AtomicDvP.sol";

/// @notice Conditional, time-windowed transfer for demo institutional settlement.
/// @dev No funds are escrowed. Execution requires sufficient balance and allowance at execution.
contract ScheduledPayment {
    struct Instruction {
        address payer;
        address beneficiary;
        address token;
        uint256 amount;
        uint64 validFrom;
        uint64 expiresAt;
        bool executed;
        bool cancelled;
    }

    IInstitutionRegistry public immutable registry;
    uint256 public nextInstructionId;
    bool private entered;
    mapping(uint256 => Instruction) public instructions;

    event InstructionCreated(uint256 indexed id, address indexed payer, address indexed beneficiary);
    event InstructionExecuted(uint256 indexed id);
    event InstructionCancelled(uint256 indexed id);

    modifier nonReentrant() {
        require(!entered, "Schedule: reentrant");
        entered = true;
        _;
        entered = false;
    }

    constructor(address registryAddress) {
        require(registryAddress.code.length > 0, "Schedule: invalid registry");
        registry = IInstitutionRegistry(registryAddress);
    }

    function createInstruction(
        address beneficiary,
        address token,
        uint256 amount,
        uint64 validFrom,
        uint64 expiresAt
    ) external nonReentrant returns (uint256 id) {
        require(registry.isActive(msg.sender) && registry.isActive(beneficiary), "Schedule: unverified");
        require(msg.sender != beneficiary, "Schedule: same party");
        require(token.code.length > 0 && amount > 0, "Schedule: invalid payment");
        require(registry.isTokenApproved(token), "Schedule: unapproved token");
        require(uint256(validFrom) >= block.timestamp && expiresAt > validFrom, "Schedule: invalid window");

        id = ++nextInstructionId;
        instructions[id] = Instruction({
            payer: msg.sender,
            beneficiary: beneficiary,
            token: token,
            amount: amount,
            validFrom: validFrom,
            expiresAt: expiresAt,
            executed: false,
            cancelled: false
        });
        emit InstructionCreated(id, msg.sender, beneficiary);
    }

    function cancelInstruction(uint256 id) external nonReentrant {
        Instruction storage p = instructions[id];
        require(p.payer == msg.sender, "Schedule: not payer");
        require(!p.executed && !p.cancelled, "Schedule: inactive");
        p.cancelled = true;
        emit InstructionCancelled(id);
    }

    function execute(uint256 id) external nonReentrant {
        Instruction storage p = instructions[id];
        require(p.payer != address(0) && !p.executed && !p.cancelled, "Schedule: inactive");
        require(block.timestamp >= p.validFrom && block.timestamp <= p.expiresAt, "Schedule: outside window");
        require(registry.isActive(p.payer) && registry.isActive(p.beneficiary), "Schedule: unverified");
        require(registry.isTokenApproved(p.token), "Schedule: unapproved token");
        p.executed = true;
        require(
            ISettlementERC20(p.token).transferFrom(p.payer, p.beneficiary, p.amount),
            "Schedule: transfer failed"
        );
        emit InstructionExecuted(id);
    }
}
