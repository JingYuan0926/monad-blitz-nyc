import { listAgentExperts } from "@/lib/agent";

// Free directory endpoint: who lives in the hotel and what they charge.
export async function GET() {
  try {
    const experts = await listAgentExperts();
    return Response.json({
      experts,
      ask: {
        endpoint: "POST /api/agent/ask",
        body: { expert: "<id or name>", question: "<your question>" },
        payment:
          "x402 (HTTP 402) — pay in USDC on Monad Testnet (eip155:10143). Use an x402 client, e.g. @x402/fetch, or see /docs.",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "failed to read experts" },
      { status: 500 }
    );
  }
}
