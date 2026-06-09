// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { Memonads } from "./Memonads.sol";

contract MemonadsTest is Test {
    Memonads m;
    address visitor = address(0xA11CE);
    address expert = address(0xB0B);

    function setUp() public {
        m = new Memonads();
        vm.deal(visitor, 10 ether);
        vm.deal(expert, 1 ether);
    }

    // ---------- registration & memories ----------

    function test_RegisterStoresProfile() public {
        vm.prank(visitor);
        m.register("Jing");
        (string memory name, uint64 registeredAt, bool exists) = m.profiles(visitor);
        assertEq(name, "Jing");
        assertGt(registeredAt, 0);
        assertTrue(exists);
    }

    function test_RegisterAgainRenames() public {
        vm.startPrank(visitor);
        m.register("Jing");
        m.register("JY");
        vm.stopPrank();
        (string memory name, , ) = m.profiles(visitor);
        assertEq(name, "JY");
    }

    function test_RegisterEmptyNameReverts() public {
        vm.prank(visitor);
        vm.expectRevert(Memonads.EmptyName.selector);
        m.register("");
    }

    function test_AddMemoryRequiresRegistration() public {
        vm.prank(visitor);
        vm.expectRevert(Memonads.NotRegistered.selector);
        m.addMemory("coding", "title", "content");
    }

    function test_AddAndGetMemories() public {
        vm.startPrank(visitor);
        m.register("Jing");
        m.addMemory("coding", "Demo first", "Build the demo path first.");
        m.addMemory("sport", "Sleep", "Recovery debt causes plateaus.");
        vm.stopPrank();

        Memonads.MemoryEntry[] memory list = m.getMemories(visitor);
        assertEq(list.length, 2);
        assertEq(m.memoryCount(visitor), 2);
        assertEq(list[0].section, "coding");
        assertEq(list[0].title, "Demo first");
        assertEq(list[1].content, "Recovery debt causes plateaus.");
        assertGt(list[0].createdAt, 0);
    }

    function test_AddMemoryEmptyReverts() public {
        vm.startPrank(visitor);
        m.register("Jing");
        vm.expectRevert(Memonads.EmptyMemory.selector);
        m.addMemory("coding", "", "content");
        vm.expectRevert(Memonads.EmptyMemory.selector);
        m.addMemory("coding", "title", "");
        vm.stopPrank();
    }

    function test_DeleteMemorySwapAndPop() public {
        vm.startPrank(visitor);
        m.register("Jing");
        m.addMemory("a", "first", "1");
        m.addMemory("b", "second", "2");
        m.addMemory("c", "third", "3");
        m.deleteMemory(0);
        vm.stopPrank();

        Memonads.MemoryEntry[] memory list = m.getMemories(visitor);
        assertEq(list.length, 2);
        // last entry was swapped into slot 0
        assertEq(list[0].title, "third");
        assertEq(list[1].title, "second");
    }

    function test_DeleteMemoryInvalidIndexReverts() public {
        vm.startPrank(visitor);
        m.register("Jing");
        vm.expectRevert(abi.encodeWithSelector(Memonads.InvalidMemoryIndex.selector, 0));
        m.deleteMemory(0);
        vm.stopPrank();
    }

    // ---------- credits ----------

    function test_TopUpCreditsMath() public {
        vm.prank(visitor);
        m.topUp{ value: 1 ether }();
        assertEq(m.credits(visitor), 10_000);
    }

    function test_TopUpZeroReverts() public {
        vm.prank(visitor);
        vm.expectRevert(Memonads.ZeroAmount.selector);
        m.topUp{ value: 0 }();
    }

    function test_TopUpNonIntegralReverts() public {
        vm.prank(visitor);
        vm.expectRevert(abi.encodeWithSelector(Memonads.NonIntegralTopUp.selector, 1e14 + 1));
        m.topUp{ value: 1e14 + 1 }();
    }

    function test_WithdrawRefundsMon() public {
        vm.startPrank(visitor);
        m.topUp{ value: 1 ether }();
        uint256 before = visitor.balance;
        m.withdraw(4_000);
        vm.stopPrank();
        assertEq(m.credits(visitor), 6_000);
        assertEq(visitor.balance, before + 0.4 ether);
    }

    function test_WithdrawTooMuchReverts() public {
        vm.startPrank(visitor);
        m.topUp{ value: 1 ether }();
        vm.expectRevert(abi.encodeWithSelector(Memonads.InsufficientCredits.selector, 10_001, 10_000));
        m.withdraw(10_001);
        vm.stopPrank();
    }

    // ---------- sessions ----------

    function test_PaySessionMovesCredits() public {
        vm.startPrank(visitor);
        m.topUp{ value: 1 ether }();
        m.paySession(expert, 4_000);
        vm.stopPrank();
        assertEq(m.credits(visitor), 6_000);
        assertEq(m.credits(expert), 4_000);
        assertEq(m.sessionsPaid(visitor, expert), 1);
    }

    function test_PaySessionInsufficientReverts() public {
        vm.prank(visitor);
        vm.expectRevert(abi.encodeWithSelector(Memonads.InsufficientCredits.selector, 1, 0));
        m.paySession(expert, 1);
    }

    function test_PaySessionEmitsEvent() public {
        vm.startPrank(visitor);
        m.topUp{ value: 1 ether }();
        vm.expectEmit(true, true, false, true);
        emit Memonads.SessionPaid(visitor, expert, 4_000);
        m.paySession(expert, 4_000);
        vm.stopPrank();
    }

    function test_ExpertCanWithdrawEarnings() public {
        vm.startPrank(visitor);
        m.topUp{ value: 1 ether }();
        m.paySession(expert, 4_000);
        vm.stopPrank();

        uint256 before = expert.balance;
        vm.prank(expert);
        m.withdraw(4_000);
        assertEq(expert.balance, before + 0.4 ether);
        assertEq(m.credits(expert), 0);
    }

    // ---------- reviews ----------

    function test_ReviewRequiresSession() public {
        vm.prank(visitor);
        vm.expectRevert(Memonads.NoSessionPaid.selector);
        m.review(expert, 5, "great");
    }

    function test_ReviewAfterSession() public {
        vm.startPrank(visitor);
        m.topUp{ value: 1 ether }();
        m.paySession(expert, 4_000);
        m.review(expert, 5, "Incredible clinical reasoning.");
        vm.stopPrank();

        Memonads.Review[] memory reviews = m.getReviews(expert);
        assertEq(reviews.length, 1);
        assertEq(m.reviewCount(expert), 1);
        assertEq(reviews[0].reviewer, visitor);
        assertEq(reviews[0].rating, 5);
        assertEq(reviews[0].text, "Incredible clinical reasoning.");
    }

    function test_ReviewInvalidRatingReverts() public {
        vm.startPrank(visitor);
        m.topUp{ value: 1 ether }();
        m.paySession(expert, 4_000);
        vm.expectRevert(abi.encodeWithSelector(Memonads.InvalidRating.selector, 0));
        m.review(expert, 0, "x");
        vm.expectRevert(abi.encodeWithSelector(Memonads.InvalidRating.selector, 6));
        m.review(expert, 6, "x");
        vm.stopPrank();
    }

    function test_SelfReviewReverts() public {
        vm.prank(expert);
        vm.expectRevert(Memonads.SelfReview.selector);
        m.review(expert, 5, "I am great");
    }

    // ---------- fuzz ----------

    function testFuzz_TopUpWithdrawRoundTrip(uint16 amount) public {
        vm.assume(amount > 0);
        uint256 value = uint256(amount) * 1e14;
        uint256 before = visitor.balance;
        vm.startPrank(visitor);
        m.topUp{ value: value }();
        assertEq(m.credits(visitor), amount);
        m.withdraw(amount);
        vm.stopPrank();
        assertEq(visitor.balance, before);
        assertEq(m.credits(visitor), 0);
    }
}
