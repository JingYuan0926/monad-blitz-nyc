import Link from "next/link";
import { MEMONADS_ADDRESS } from "@/lib/memonads";

export const metadata = {
  title: "Memonads — API for AI Agents",
  description: "Query human memory vaults over x402 micropayments on Monad",
};

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-200">
      {children}
    </pre>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-sm text-violet-400 hover:text-violet-300">
            &larr; back to the hotel
          </Link>
          <h1 className="text-3xl font-bold">Memonads for AI Agents</h1>
          <p className="font-body text-slate-400">
            Humans walk the hotel and pay in MON credits. AI agents call this API and pay
            per question with <span className="text-slate-200">x402 micropayments</span>{" "}
            (USDC on Monad Testnet, chain 10143) — no account, no API key, just a wallet.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Browse the residents (free)</h2>
          <Code>{`curl https://your-host/api/agent/experts`}</Code>
          <p className="font-body text-sm text-slate-400">
            Returns every resident — built-ins and people submitted on-chain — with their
            id, room, price, and how many memories are checked into them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Ask a question (paid, x402)</h2>
          <p className="font-body text-sm text-slate-400">
            A bare request returns <span className="text-slate-200">HTTP 402 Payment
            Required</span> with the payment requirements:
          </p>
          <Code>{`curl -i https://your-host/api/agent/ask \\
  -H 'Content-Type: application/json' \\
  -d '{"expert": "Vitalik Buterin", "question": "How do I design a token?"}'

HTTP/1.1 402 Payment Required
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:10143",
    "payTo": "0x...",
    "asset": "USDC (Monad Testnet)",
    "maxAmountRequired": "$0.01"
  }]
}`}</Code>
          <p className="font-body text-sm text-slate-400">
            An x402-aware client signs the payment (EIP-3009, gasless) and retries with the{" "}
            <span className="font-mono text-xs">X-PAYMENT</span> header. The official Monad
            facilitator (
            <span className="font-mono text-xs">x402-facilitator.molandak.org</span>) verifies
            and settles it on-chain, then the answer comes back:
          </p>
          <Code>{`{
  "expert": "Vitalik Buterin",
  "room": "Blockchain",
  "memoriesUsed": 3,
  "answer": "..."
}`}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. From code (any agent)</h2>
          <Code>{`import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const payFetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:10143", client: new ExactEvmScheme(account) }],
});

const res = await payFetch("https://your-host/api/agent/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    expert: "Vitalik Buterin",
    question: "How do I design a token?",
  }),
});
console.log(await res.json());`}</Code>
          <p className="font-body text-sm text-slate-400">
            The wallet needs testnet USDC (Circle faucet) on Monad Testnet. Gas is paid by
            the facilitator — the agent only signs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Claude skill</h2>
          <p className="font-body text-sm text-slate-400">
            This repo ships a Claude Code skill at{" "}
            <span className="font-mono text-xs">.claude/skills/memonads</span>. Inside Claude
            Code, just ask:
          </p>
          <Code>{`"Use the memonads skill to ask Vitalik Buterin how to design a token"

# under the hood the skill runs:
node .claude/skills/memonads/scripts/ask.mjs --list
node .claude/skills/memonads/scripts/ask.mjs "Vitalik Buterin" "How do I design a token?"`}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Where the memories live</h2>
          <p className="font-body text-sm text-slate-400">
            Every resident and every memory is stored in the Memonads contract on Monad
            Testnet at{" "}
            <span className="font-mono text-xs break-all">{MEMONADS_ADDRESS}</span>. Answers
            are generated from the person&apos;s checked-in memories — the chat itself stays
            off-chain.
          </p>
        </section>
      </div>
    </main>
  );
}
