/**
 * AIQueryCredits — deployed on Monad Testnet (chainId 10143).
 * 1 MON buys 10,000 credits; 1 credit = 0.0001 MON (1e14 wei).
 */
export const AI_QUERY_CREDITS_ADDRESS =
  "0xc051d56C83f3A0E8dd8343aF302fDa1e4EB94694" as const;

/**
 * Price of one credit in wei. `topUp()` reverts with `NonIntegralTopUp`
 * unless `msg.value` is a positive multiple of this.
 */
export const WEI_PER_CREDIT = BigInt("100000000000000"); // 1e14

export const aiQueryCreditsAbi = [
  {
    type: "function",
    name: "topUp",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "consume",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "credits",
    stateMutability: "view",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "event",
    name: "CreditsToppedUp",
    anonymous: false,
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "paidWei",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
  },
  {
    type: "event",
    name: "CreditsConsumed",
    anonymous: false,
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "remaining",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
  },
  {
    type: "event",
    name: "CreditsWithdrawn",
    anonymous: false,
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "refundWei",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
  },
  // Custom errors included so revert reasons decode client-side.
  { type: "error", name: "ZeroAmount", inputs: [] },
  {
    type: "error",
    name: "NonIntegralTopUp",
    inputs: [{ name: "valueWei", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "InsufficientCredits",
    inputs: [
      { name: "requested", type: "uint256", internalType: "uint256" },
      { name: "available", type: "uint256", internalType: "uint256" },
    ],
  },
  { type: "error", name: "WithdrawTransferFailed", inputs: [] },
] as const;
