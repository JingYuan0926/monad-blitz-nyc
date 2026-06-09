import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { privateKeyToAccount } from "viem/accounts";
import { buildPersona, loadExpertVault } from "@/lib/agent";

/**
 * Paid endpoint for AI agents: ask a resident's memory vault a question.
 * Payment is x402 (HTTP 402) in USDC on Monad Testnet, settled by the
 * official Monad facilitator. See /docs for the curl flow.
 */

const FACILITATOR_URL = "https://x402-facilitator.molandak.org";
const MONAD_TESTNET = "eip155:10143";
// $0.001 in Monad Testnet USDC (6 decimals) — the package has no built-in
// asset registry entry for Monad, so the asset is spelled out explicitly
const PRICE = {
  amount: "1000",
  asset: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  extra: { name: "USDC", version: "2" },
};

function normalizeKey(pk: string): `0x${string}` {
  return (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
}

const rawKey =
  process.env.X402_PRIVATE_KEY ?? process.env.PRIVATE_KEY ?? process.env.MONAD_PRIVATE_KEY;
const PAY_TO =
  (process.env.X402_PAY_TO as `0x${string}` | undefined) ??
  (rawKey ? privateKeyToAccount(normalizeKey(rawKey)).address : undefined);

const server = new x402ResourceServer(
  new HTTPFacilitatorClient({ url: FACILITATOR_URL })
).register(MONAD_TESTNET, new ExactEvmScheme());

const handler = async (request: NextRequest): Promise<NextResponse> => {
  let body: { expert?: string; question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.expert || !body.question) {
    return NextResponse.json(
      { error: 'Expected { "expert": "<id or name>", "question": "..." }' },
      { status: 400 }
    );
  }

  const vault = await loadExpertVault(body.expert);
  if (!vault) {
    return NextResponse.json(
      { error: `No resident "${body.expert}" — GET /api/agent/experts for the directory` },
      { status: 404 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: buildPersona(vault) },
        { role: "user", content: body.question },
      ],
    }),
  });
  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== "string") {
    return NextResponse.json(
      { error: data?.error?.message ?? "Unexpected response from model" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    expert: vault.name,
    room: vault.room,
    memoriesUsed: vault.memories.length,
    answer,
  });
};

export const POST = PAY_TO
  ? withX402(
      handler,
      {
        accepts: {
          scheme: "exact",
          network: MONAD_TESTNET,
          payTo: PAY_TO,
          price: PRICE,
        },
        description: "Ask a Memonads resident's memory vault a question",
      },
      server
    )
  : handler; // no payout wallet configured — endpoint runs unpaid (dev fallback)
