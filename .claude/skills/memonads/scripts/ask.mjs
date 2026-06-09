#!/usr/bin/env node
/**
 * Memonads agent client: query a resident's memory vault, paying per
 * question via x402 (USDC on Monad Testnet, official facilitator).
 *
 *   node ask.mjs --list
 *   node ask.mjs "<expert id or name>" "<question>" [--url http://localhost:3000]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

// minimal .env loader (no extra deps) — never prints values
function loadEnv() {
  try {
    for (const line of readFileSync(join(repoRoot, ".env"), "utf8").split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env — rely on the process environment
  }
}
loadEnv();

const args = process.argv.slice(2);
const urlFlag = args.indexOf("--url");
const baseUrl =
  urlFlag >= 0 ? args.splice(urlFlag, 2)[1] : process.env.MEMONADS_URL ?? "http://localhost:3000";

if (args[0] === "--list") {
  const res = await fetch(`${baseUrl}/api/agent/experts`);
  const data = await res.json();
  console.log(JSON.stringify(data.experts ?? data, null, 2));
  process.exit(0);
}

const [expert, question] = args;
if (!expert || !question) {
  console.error('Usage: ask.mjs --list | ask.mjs "<expert>" "<question>" [--url <base>]');
  process.exit(1);
}

const rawKey =
  process.env.X402_PRIVATE_KEY ?? process.env.PRIVATE_KEY ?? process.env.MONAD_PRIVATE_KEY;
if (!rawKey) {
  console.error("No wallet key found (X402_PRIVATE_KEY / PRIVATE_KEY / MONAD_PRIVATE_KEY in .env)");
  process.exit(1);
}
const account = privateKeyToAccount(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`);

const payFetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:10143", client: new ExactEvmScheme(account) }],
});

const res = await payFetch(`${baseUrl}/api/agent/ask`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ expert, question }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`HTTP ${res.status}:`, JSON.stringify(body, null, 2));
  if (res.status === 402) {
    console.error("\nPayment did not settle — does the wallet hold testnet USDC on Monad?");
  }
  process.exit(1);
}
console.log(JSON.stringify(body, null, 2));
