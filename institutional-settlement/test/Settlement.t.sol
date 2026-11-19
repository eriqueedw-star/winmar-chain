// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {InstitutionRegistry} from "../src/InstitutionRegistry.sol";
import {PermissionedToken} from "../src/PermissionedToken.sol";
import {AtomicDvP} from "../src/AtomicDvP.sol";
import {ScheduledPayment} from "../src/ScheduledPayment.sol";

interface Vm {
    function warp(uint256 newTimestamp) external;
}

/// @dev Actor contracts exercise distinct msg.sender roles without external libraries.
contract Participant {
    function attemptMint(PermissionedToken token, address to, uint256 amount) external {
        token.mint(to, amount);
    }

    function approve(PermissionedToken token, address spender, uint256 amount) external {
        require(token.approve(spender, amount), "test approval failed");
    }

    function propose(
        AtomicDvP dvp,
        address buyer,
        address asset,
        address payment,
        uint256 assetAmount,
        uint256 paymentAmount,
        uint64 deadline
    ) external returns (uint256) {
        return dvp.proposeTrade(buyer, asset, payment, assetAmount, paymentAmount, deadline);
    }

    function accept(AtomicDvP dvp, uint256 id) external {
        dvp.acceptTrade(id);
    }

    function cancel(AtomicDvP dvp, uint256 id) external {
        dvp.cancelTrade(id);
    }

    function transfer(PermissionedToken token, address recipient, uint256 amount) external {
        require(token.transfer(recipient, amount), "test transfer failed");
    }

    function schedule(
        ScheduledPayment scheduler,
        address payee,
        address token,
        uint256 amount,
        uint64 validFrom,
        uint64 expiresAt
    ) external returns (uint256) {
        return scheduler.createInstruction(payee, token, amount, validFrom, expiresAt);
    }

    function cancelScheduled(ScheduledPayment scheduler, uint256 id) external {
        scheduler.cancelInstruction(id);
    }
}

contract SettlementTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    InstitutionRegistry internal registry;
    PermissionedToken internal payment;
    PermissionedToken internal asset;
    AtomicDvP internal dvp;
    ScheduledPayment internal scheduler;
    Participant internal seller;
    Participant internal buyer;
    Participant internal stranger;

    uint256 internal constant ONE_SGD_DEMO = 1e6;

    function setUp() public {
        registry = new InstitutionRegistry(address(this));
        seller = new Participant();
        buyer = new Participant();
        stranger = new Participant();
        registry.setInstitution(address(seller), true);
        registry.setInstitution(address(buyer), true);
        dvp = new AtomicDvP(address(registry));
        scheduler = new ScheduledPayment(address(registry));
        payment = new PermissionedToken("Winmar Demo SGD Unit - No MAS Affiliation", "dSGD-W", 6, address(registry), address(this));
        asset = new PermissionedToken("Winmar Demo RWA Unit", "dRWA-W", 0, address(registry), address(this));
        payment.mint(address(buyer), 1000 * ONE_SGD_DEMO);
        asset.mint(address(seller), 10);
        buyer.approve(payment, address(dvp), 1000 * ONE_SGD_DEMO);
        seller.approve(asset, address(dvp), 10);
        buyer.approve(payment, address(scheduler), 1000 * ONE_SGD_DEMO);
    }

    function proposeDefault() internal returns (uint256) {
        return seller.propose(
            dvp, address(buyer), address(asset), address(payment), 4, 250 * ONE_SGD_DEMO,
            uint64(block.timestamp + 1 days)
        );
    }

    function testAtomicDeliveryVersusPayment() public {
        uint256 id = proposeDefault();
        buyer.accept(dvp, id);
        dvp.settle(id);
        require(asset.balanceOf(address(seller)) == 6, "seller asset not delivered");
        require(asset.balanceOf(address(buyer)) == 4, "buyer asset not received");
        require(payment.balanceOf(address(buyer)) == 750 * ONE_SGD_DEMO, "buyer payment wrong");
        require(payment.balanceOf(address(seller)) == 250 * ONE_SGD_DEMO, "seller not paid");
        (, , , , , , , , bool completed, ) = dvp.trades(id);
        require(completed, "trade not completed");
    }

    function testSettlementRequiresBuyerConsent() public {
        uint256 id = proposeDefault();
        try dvp.settle(id) {
            revert("settled without buyer consent");
        } catch {}
        require(asset.balanceOf(address(seller)) == 10, "asset moved");
    }

    function testFailedPaymentRollsBackAssetTransfer() public {
        uint256 id = proposeDefault();
        buyer.accept(dvp, id);
        buyer.approve(payment, address(dvp), 0);
        try dvp.settle(id) {
            revert("settled without payment approval");
        } catch {}
        require(asset.balanceOf(address(seller)) == 10, "asset transfer did not roll back");
        require(asset.balanceOf(address(buyer)) == 0, "buyer received asset");
        require(payment.balanceOf(address(seller)) == 0, "seller received payment");
        (, , , , , , , , bool completed, ) = dvp.trades(id);
        require(!completed, "trade incorrectly completed");
    }

    function testRevokingParticipantBlocksDvP() public {
        uint256 id = proposeDefault();
        buyer.accept(dvp, id);
        registry.setInstitution(address(buyer), false);
        try dvp.settle(id) {
            revert("settled with revoked buyer");
        } catch {}
        require(asset.balanceOf(address(seller)) == 10, "asset moved for revoked participant");
    }

    function testCancelledTradeCannotSettle() public {
        uint256 id = proposeDefault();
        buyer.accept(dvp, id);
        seller.cancel(dvp, id);
        try dvp.settle(id) {
            revert("cancelled trade settled");
        } catch {}
    }

    function testSameTradeCannotSettleTwice() public {
        uint256 id = proposeDefault();
        buyer.accept(dvp, id);
        dvp.settle(id);
        try dvp.settle(id) {
            revert("trade replayed");
        } catch {}
        require(asset.balanceOf(address(buyer)) == 4, "asset replay");
    }

    function testExpiredTradeCannotSettle() public {
        uint256 id = proposeDefault();
        buyer.accept(dvp, id);
        vm.warp(block.timestamp + 2 days);
        try dvp.settle(id) {
            revert("expired trade settled");
        } catch {}
    }

    function testTokenRejectsUnregisteredRecipient() public {
        try buyer.transfer(payment, address(stranger), ONE_SGD_DEMO) {
            revert("transferred to unregistered recipient");
        } catch {}
    }

    function testTokenRejectsUnauthorizedMinting() public {
        try stranger.attemptMint(payment, address(stranger), ONE_SGD_DEMO) {
            revert("unauthorized issuer minted");
        } catch {}
        require(payment.totalSupply() == 1000 * ONE_SGD_DEMO, "supply changed");
    }

    function testPausedTokenRejectsTransfers() public {
        payment.setPaused(true);
        try buyer.transfer(payment, address(seller), ONE_SGD_DEMO) {
            revert("transferred while paused");
        } catch {}
        payment.setPaused(false);
        buyer.transfer(payment, address(seller), ONE_SGD_DEMO);
        require(payment.balanceOf(address(seller)) == ONE_SGD_DEMO, "unpaused transfer failed");
    }

    function testScheduledPaymentExecutesInWindow() public {
        uint64 dueAt = uint64(block.timestamp + 1 hours);
        uint256 id = buyer.schedule(
            scheduler, address(seller), address(payment), 100 * ONE_SGD_DEMO, dueAt, dueAt + 1 hours
        );
        try scheduler.execute(id) {
            revert("executed before due date");
        } catch {}
        vm.warp(uint256(dueAt) + 1);
        scheduler.execute(id);
        require(payment.balanceOf(address(seller)) == 100 * ONE_SGD_DEMO, "scheduled payee unpaid");
        try scheduler.execute(id) {
            revert("scheduled payment replayed");
        } catch {}
    }

    function testRevokedScheduledPaymentCannotExecute() public {
        uint64 dueAt = uint64(block.timestamp + 1 hours);
        uint256 id = buyer.schedule(
            scheduler, address(seller), address(payment), 100 * ONE_SGD_DEMO, dueAt, dueAt + 1 hours
        );
        buyer.cancelScheduled(scheduler, id);
        vm.warp(uint256(dueAt) + 1);
        try scheduler.execute(id) {
            revert("cancelled scheduled payment executed");
        } catch {}
    }
}
