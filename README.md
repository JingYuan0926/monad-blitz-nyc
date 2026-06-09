# Memonads

Memonads is a platform for human expertise — for people, for data, and even for AI agents. Experts upload their experience, memories, strategies, and lessons learned into an AI-powered vault, and both humans and AI agents can explore and query those memories through an interactive hotel-style interface.

Instead of letting valuable knowledge disappear when someone retires, changes careers, or moves on, Memonads turns human experience into searchable, living memory rooms — a knowledge layer that people can learn from and AI agents can plug into.

## 📖 Story

Imagine a person named Jason.

Jason has joined hackathons for 3 years. During that time, he has won over 40 hackathons. Everyone wonders:

How does Jason keep winning? How does he choose ideas? How does he build so fast? How does he pitch so well? What mistakes has he learned from?

But one day, Jason decides to retire from hackathons and focus on his own startup.

His knowledge does not disappear immediately, but it becomes hard to access. New hackers can no longer easily learn from his experience. His strategies, stories, failures, and decision-making process may slowly be forgotten.

The same problem happens everywhere.

A doctor with 30 years of experience retires. A founder exits their company. A teacher stops teaching. A designer leaves the industry. A senior engineer moves on.

Their experience is incredibly valuable, but most of it is never properly captured.

Memonads solves this by giving every expert a place to store their mind.

## ❗ Problem

Human experience is one of the most valuable forms of knowledge, but it is often lost when people retire, change jobs, or leave a community.

Most knowledge-sharing platforms only capture surface-level content, such as blog posts, videos, or documents. They do not preserve how a person thinks, makes decisions, solves problems, or reflects on past experience.

For example:

- New hackathon participants want to learn from experienced winners.
- Junior doctors want to understand how senior doctors make decisions.
- Startup founders want to learn from experienced entrepreneurs.
- Students want access to the thinking process of experts.

However, this knowledge is usually scattered across documents, chats, videos, notes, and memories. It is difficult to organize, search, and interact with.

The result is a major knowledge gap between experienced people and beginners.

## 💡 Solution

Memonads is a platform where users can upload their knowledge, experience, notes, documents, videos, and stories. The platform automatically turns this content into a structured AI memory vault, similar to an Obsidian vault.

Once the vault is created, other users can visit the platform and query that person's memory.

For example:

A beginner hackathon participant can enter Jason's memory room and ask:

- "How should I choose a good hackathon idea?"
- "What makes a winning pitch?"
- "What mistakes did Jason make in his first few hackathons?"
- "How should I divide tasks in a 3-person team?"

The AI answers based on Jason's uploaded knowledge, not generic internet information.

The frontend experience is designed like a hotel. Each floor represents a category of knowledge, and each room represents a person's memory vault.

For example:

- Floor 1: Founders
- Floor 2: Hackathon Winners
- Floor 3: Doctors
- Floor 4: Engineers

If users want to learn from Jason, they go to Level 2 and enter Jason's room.

## 🏨 Product Concept

Memonads makes knowledge feel explorable.

Instead of a boring search bar, users move through a pixel-art hotel where each room contains a different person's mind.

Each expert becomes a "guest" or "resident" inside the hotel. Their uploaded knowledge becomes their room, and users can visit the room to ask questions, explore topics, or follow guided learning paths.

The experience is designed to feel like:

> "Walking into someone's brain and learning directly from their memories."

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │ RainbowKit │  │  Wagmi v2   │  │  TanStack React Query    │ │
│  │ Wallet UI  │  │  + Viem     │  │  (server state cache)    │ │
│  └─────┬──────┘  └──────┬──────┘  └──────────────────────────┘ │
│        │                │                                       │
│  ┌─────▼────────────────▼──────────────────────────────────┐   │
│  │         Next.js App (React 19, App Router)               │   │
│  │      /page    /chat    /hotel    /credits                │   │
│  └─────────────────────────┬───────────────────────────────┘   │
└────────────────────────────│────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   Next.js API Routes (Server)                   │
│                                                                 │
│                     ┌──────────────┐                            │
│                     │  /api/chat   │                            │
│                     │              │                            │
│                     │  OpenAI      │                            │
│                     │  gpt-4.1-nano│                            │
│                     └──────┬───────┘                            │
└────────────────────────────│────────────────────────────────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │  OpenAI API   │
                     │  gpt-4.1-nano │
                     └───────────────┘

          ┌────────────────────────────────────────────┐
          │          Monad Testnet (Chain 10143)        │
          │                                            │
          │  ┌──────────────────┐  ┌───────────────┐  │
          │  │ AIQueryCredits   │  │   Counter     │  │
          │  │ .sol             │  │   .sol        │  │
          │  │                  │  └───────────────┘  │
          │  │ topUp()  → MON   │                     │
          │  │ consume() → emit │                     │
          │  │ withdraw() → MON │                     │
          │  └──────────────────┘                     │
          │       ↑ wagmiConfig / injected wallet      │
          └────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| State / Data | TanStack React Query v5 |
| Blockchain Network | Monad Testnet (Chain ID: 10143, native token: MON) |
| Wallet / Web3 | Wagmi v2 + RainbowKit + Viem |
| Smart Contracts | Solidity ^0.8.24, compiled & deployed via Hardhat |
| AI | OpenAI API (gpt-4.1-nano) |
| Contract Dev Tooling | Hardhat + Ethers v6 + TypeChain |

### Key Design Notes

- **AI chat:** Chat is powered by the OpenAI API (`gpt-4.1-nano`) through the `/api/chat` route.
- **AIQueryCredits contract:** Users deposit MON → get tokens (10,000 tokens/MON) → `consume()` emits events the backend can watch → `withdraw()` to reclaim MON. No admin, no fees.
- **Wallet:** Injected wallet only (MetaMask etc.) via Wagmi, scoped exclusively to Monad Testnet.

## 🚀 Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

### Smart Contract Commands

```bash
# Compile contracts
npm run compile

# Deploy AIQueryCredits to Monad Testnet
npm run deploy:credits

# Deploy Counter to Monad Testnet
npm run deploy:monad

# Run contract tests
npm run test:contracts
```

### Environment Variables

Create a `.env.local` file with:

```
OPENAI_API_KEY=your_openai_api_key
```
