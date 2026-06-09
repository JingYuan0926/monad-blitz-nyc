---
name: memonads
description: Query Memonads memory vaults — human experts living in a 3D office on Monad — paying per question via x402 micropayments (USDC on Monad Testnet). Use whenever the user wants to ask a Memonads resident something (e.g. "/memonads ask Vitalik how to design a token", "ask Vitalik Buterin about X"), list the residents, or demo agent-paid queries.
---

## How to fulfil a request

1. If the user wants the resident list, run the `--list` command below and
   present the residents (name, room, memory count) in a short table.
2. If the user asks a person a question, run the ask command with the
   resident's name (or id) and the question, then relay the `answer` field
   to the user. Always show the `x402` receipt from the output too: the
   $0.001 USDC payment and the settlement `transaction` hash with its
   `explorer` link — that is the proof the query was paid on Monad.
3. The script auto-detects the app on localhost:3000 or :3457 — no flags
   needed. Never print or echo the contents of `.env`.

# Memonads — ask a human memory vault, pay with x402

Memonads stores people and their checked-in memories on-chain (Monad Testnet).
This skill lets an agent query a resident's memories over HTTP, paying per
question with an x402 micropayment in USDC on Monad — settled by the official
Monad facilitator. No account or API key; just a funded wallet.

## Setup

The script reads the wallet key from the repo root `.env` (`X402_PRIVATE_KEY`,
`PRIVATE_KEY`, or `MONAD_PRIVATE_KEY`). The wallet needs testnet USDC on Monad
(Circle faucet); gas is covered by the facilitator. The Memonads app must be
running (default `http://localhost:3000`; override with `MEMONADS_URL` or
`--url http://localhost:3457`).

## Usage

List the residents (free):

```bash
node .claude/skills/memonads/scripts/ask.mjs --list
```

Ask a resident a question (pays $0.001 in USDC via x402 automatically):

```bash
node .claude/skills/memonads/scripts/ask.mjs "Vitalik Buterin" "How should I design a token?"
node .claude/skills/memonads/scripts/ask.mjs chain-0 "What did you learn the hard way?" --url http://localhost:3457
```

The script prints JSON: `{ expert, room, memoriesUsed, answer }`. The answer is
generated from the memories checked into that person on-chain.

## Notes

- If the response is `402` without payment succeeding, the wallet likely has no
  testnet USDC — get some from the Circle faucet for Monad Testnet.
- `--list` shows each resident's `id`, room, and how many memories they hold;
  prefer residents with `memoryCount > 0` for grounded answers.
