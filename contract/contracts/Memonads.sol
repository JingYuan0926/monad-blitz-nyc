// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Memonads — the general contract behind the Memonads hotel.
///
/// One contract does it all:
///  - Reception check-in: register a profile and store memory entries on-chain.
///  - Credits: deposit MON for credits (10,000 credits = 1 MON), withdraw back.
///  - Sessions: pay an expert in credits to unlock a chat (the chat itself
///    stays off-chain in the browser — only the payment is recorded).
///  - Reviews: after paying for a session, post a 1-5 star review on-chain.
///
/// Credits are fully backed: topUp locks MON, paySession moves credits
/// between users, withdraw releases MON. No admin, no fees.
contract Memonads {
    /// Price of one credit in wei. `topUp()` reverts unless `msg.value`
    /// is a positive multiple of this.
    uint256 public constant WEI_PER_CREDIT = 1e14; // 10,000 credits = 1 MON

    struct Profile {
        string name;
        uint64 registeredAt;
        bool exists;
    }

    struct MemoryEntry {
        string section;
        string title;
        string content;
        uint64 createdAt;
    }

    struct Review {
        address reviewer;
        uint8 rating; // 1-5
        string text;
        uint64 createdAt;
    }

    mapping(address => uint256) public credits;
    mapping(address => Profile) public profiles;
    mapping(address => MemoryEntry[]) private _memories;
    mapping(address => Review[]) private _reviews;
    /// visitor => expert => number of sessions paid (gates reviews)
    mapping(address => mapping(address => uint256)) public sessionsPaid;

    event Registered(address indexed user, string name);
    event MemoryAdded(address indexed user, uint256 index, string section, string title);
    event MemoryDeleted(address indexed user, uint256 index);
    event CreditsToppedUp(address indexed user, uint256 amount, uint256 paidWei);
    event SessionPaid(address indexed visitor, address indexed expert, uint256 amountCredits);
    event CreditsWithdrawn(address indexed user, uint256 amount, uint256 refundWei);
    event ReviewPosted(address indexed expert, address indexed reviewer, uint8 rating, string text);

    error ZeroAmount();
    error NonIntegralTopUp(uint256 valueWei);
    error InsufficientCredits(uint256 requested, uint256 available);
    error NotRegistered();
    error EmptyName();
    error EmptyMemory();
    error InvalidMemoryIndex(uint256 index);
    error InvalidRating(uint8 rating);
    error NoSessionPaid();
    error SelfReview();
    error WithdrawTransferFailed();

    // ---------- reception: profile + memories ----------

    /// Register (or rename) the caller's profile. Required before
    /// checking memories in.
    function register(string calldata name) external {
        if (bytes(name).length == 0) revert EmptyName();
        profiles[msg.sender] = Profile(name, uint64(block.timestamp), true);
        emit Registered(msg.sender, name);
    }

    function addMemory(
        string calldata section,
        string calldata title,
        string calldata content
    ) external {
        if (!profiles[msg.sender].exists) revert NotRegistered();
        if (bytes(title).length == 0 || bytes(content).length == 0) revert EmptyMemory();
        _memories[msg.sender].push(MemoryEntry(section, title, content, uint64(block.timestamp)));
        emit MemoryAdded(msg.sender, _memories[msg.sender].length - 1, section, title);
    }

    /// Removes a memory by index (swap-and-pop: the last entry takes the
    /// removed slot, so ordering is not preserved).
    function deleteMemory(uint256 index) external {
        MemoryEntry[] storage list = _memories[msg.sender];
        if (index >= list.length) revert InvalidMemoryIndex(index);
        list[index] = list[list.length - 1];
        list.pop();
        emit MemoryDeleted(msg.sender, index);
    }

    function getMemories(address user) external view returns (MemoryEntry[] memory) {
        return _memories[user];
    }

    function memoryCount(address user) external view returns (uint256) {
        return _memories[user].length;
    }

    // ---------- credits ----------

    function topUp() external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value % WEI_PER_CREDIT != 0) revert NonIntegralTopUp(msg.value);
        uint256 amount = msg.value / WEI_PER_CREDIT;
        credits[msg.sender] += amount;
        emit CreditsToppedUp(msg.sender, amount, msg.value);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        uint256 available = credits[msg.sender];
        if (amount > available) revert InsufficientCredits(amount, available);
        credits[msg.sender] = available - amount;
        uint256 refund = amount * WEI_PER_CREDIT;
        (bool ok, ) = msg.sender.call{value: refund}("");
        if (!ok) revert WithdrawTransferFailed();
        emit CreditsWithdrawn(msg.sender, amount, refund);
    }

    // ---------- sessions ----------

    /// Pay an expert to unlock a chat session. Credits move from the
    /// visitor to the expert (who can withdraw them as MON).
    function paySession(address expert, uint256 amountCredits) external {
        if (amountCredits == 0) revert ZeroAmount();
        uint256 available = credits[msg.sender];
        if (amountCredits > available) revert InsufficientCredits(amountCredits, available);
        credits[msg.sender] = available - amountCredits;
        credits[expert] += amountCredits;
        sessionsPaid[msg.sender][expert] += 1;
        emit SessionPaid(msg.sender, expert, amountCredits);
    }

    // ---------- reviews ----------

    /// Post a review for an expert. Only visitors who actually paid for a
    /// session with that expert can review them.
    function review(address expert, uint8 rating, string calldata text) external {
        if (rating < 1 || rating > 5) revert InvalidRating(rating);
        if (expert == msg.sender) revert SelfReview();
        if (sessionsPaid[msg.sender][expert] == 0) revert NoSessionPaid();
        _reviews[expert].push(Review(msg.sender, rating, text, uint64(block.timestamp)));
        emit ReviewPosted(expert, msg.sender, rating, text);
    }

    function getReviews(address expert) external view returns (Review[] memory) {
        return _reviews[expert];
    }

    function reviewCount(address expert) external view returns (uint256) {
        return _reviews[expert].length;
    }
}
