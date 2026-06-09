// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AIQueryCredits
/// @notice Prepaid credits for AI queries, backed 1:1 by MON held in this
///         contract. There is no admin and no fees: every credit minted is
///         redeemable for exactly the MON that paid for it.
///
///         - `topUp()` mints 10,000 credits per 1 MON sent (proportional for
///           fractional amounts; 1 credit costs 0.0001 MON).
///         - `consume(amount)` burns credits off the caller's balance and
///           emits `CreditsConsumed` for the backend watcher.
///         - `withdraw(credits)` burns credits and returns the proportional
///           MON to the caller.
contract AIQueryCredits {
    /// @notice Credits minted per 1 MON deposited.
    uint256 public constant CREDITS_PER_MON = 10_000;

    /// @notice Price of a single credit in wei (1e14 wei = 0.0001 MON).
    uint256 public constant WEI_PER_CREDIT = 1 ether / CREDITS_PER_MON;

    /// @notice Credit balance per user.
    mapping(address => uint256) public credits;

    /// @notice Emitted when a user deposits MON for credits.
    event CreditsToppedUp(address indexed user, uint256 amount, uint256 paidWei);

    /// @notice Emitted when a user spends credits; watched by the backend.
    event CreditsConsumed(address indexed user, uint256 amount, uint256 remaining);

    /// @notice Emitted when a user redeems credits back into MON.
    event CreditsWithdrawn(address indexed user, uint256 amount, uint256 refundWei);

    /// @dev A zero value/amount was provided.
    error ZeroAmount();

    /// @dev `msg.value` is not an exact multiple of `WEI_PER_CREDIT`; this
    ///      prevents wei dust from being trapped in the contract (no fees).
    error NonIntegralTopUp(uint256 valueWei);

    /// @dev The caller's credit balance cannot cover the request.
    error InsufficientCredits(uint256 requested, uint256 available);

    /// @dev The MON refund transfer failed.
    error WithdrawTransferFailed();

    /// @notice Deposit MON and receive credits at 10,000 credits per 1 MON.
    /// @dev `msg.value` must be a positive multiple of 0.0001 MON so the
    ///      conversion is exact and no dust is ever kept by the contract.
    function topUp() external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value % WEI_PER_CREDIT != 0) revert NonIntegralTopUp(msg.value);

        uint256 minted = msg.value / WEI_PER_CREDIT;
        credits[msg.sender] += minted;

        emit CreditsToppedUp(msg.sender, minted, msg.value);
    }

    /// @notice Spend `amount` credits from the caller's balance.
    /// @dev Emits `CreditsConsumed` so an off-chain watcher can grant queries.
    function consume(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        uint256 balance = credits[msg.sender];
        if (amount > balance) revert InsufficientCredits(amount, balance);

        uint256 remaining;
        unchecked {
            remaining = balance - amount;
        }
        credits[msg.sender] = remaining;

        emit CreditsConsumed(msg.sender, amount, remaining);
    }

    /// @notice Burn `amount` credits and return the proportional MON.
    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        uint256 balance = credits[msg.sender];
        if (amount > balance) revert InsufficientCredits(amount, balance);

        unchecked {
            credits[msg.sender] = balance - amount;
        }
        uint256 refundWei = amount * WEI_PER_CREDIT;

        emit CreditsWithdrawn(msg.sender, amount, refundWei);

        (bool ok, ) = msg.sender.call{value: refundWei}("");
        if (!ok) revert WithdrawTransferFailed();
    }
}
