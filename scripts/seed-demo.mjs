#!/usr/bin/env node
/**
 * Seed the demo resident: Vitalik Buterin in the Blockchain room, with a
 * few memories checked into him on-chain. Idempotent: skips if he exists.
 *
 *   node scripts/seed-demo.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(repoRoot, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { MEMONADS_ADDRESS, memonadsAbi } = await import("../lib/memonads.ts").catch(() => ({}))
  .then(async (mod) => {
    if (mod.MEMONADS_ADDRESS) return mod;
    // fall back: parse the TS file for the address, ABI from artifact
    const src = readFileSync(join(repoRoot, "lib/memonads.ts"), "utf8");
    const address = src.match(/MEMONADS_ADDRESS =\s*\n?\s*"(0x[0-9a-fA-F]{40})"/)[1];
    const abi = JSON.parse(
      readFileSync(
        join(repoRoot, "contract/artifacts/contracts/Memonads.sol/Memonads.json"),
        "utf8"
      )
    ).abi;
    return { MEMONADS_ADDRESS: address, memonadsAbi: abi };
  });

const rawKey =
  process.env.X402_PRIVATE_KEY ?? process.env.PRIVATE_KEY ?? process.env.MONAD_PRIVATE_KEY;
if (!rawKey) {
  console.error("No wallet key in .env");
  process.exit(1);
}
const account = privateKeyToAccount(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`);
const pub = createPublicClient({ chain: monadTestnet, transport: http() });
const wallet = createWalletClient({ account, chain: monadTestnet, transport: http() });

const write = async (functionName, args) => {
  const hash = await wallet.writeContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName,
    args,
  });
  await pub.waitForTransactionReceipt({ hash });
  return hash;
};

const experts = await pub.readContract({
  address: MEMONADS_ADDRESS,
  abi: memonadsAbi,
  functionName: "getExperts",
});

let index = experts.findIndex((e) => e.active && e.name === "Vitalik Buterin");
if (index >= 0) {
  console.log(`Vitalik already exists at index ${index}`);
} else {
  index = experts.length;
  await write("createExpert", [
    "Vitalik Buterin",
    "coding",
    "Ethereum Co-founder",
    "Co-created Ethereum at 19. Two decades of protocol design, token economics, and watching ideas survive contact with reality.",
    5000n,
  ]);
  console.log(`Created Vitalik at index ${index}`);
}

const memories = await pub.readContract({
  address: MEMONADS_ADDRESS,
  abi: memonadsAbi,
  functionName: "getExpertMemories",
  args: [BigInt(index)],
});

const SEED = [
  [
    "Ship the whitepaper before you feel ready",
    "I published the Ethereum whitepaper at 19 expecting experts to tear it apart. The feedback that came back built the project. If I had waited until it felt finished, someone else would have shipped it first.",
  ],
  [
    "Token design is incentive design",
    "Every token model I have seen fail, failed because it rewarded holding over using. Start from the behavior you want on day 1000, then work backwards to the emission schedule — never the other way around.",
  ],
  [
    "The DAO hack taught me to plan for the worst fork",
    "In 2016 we lost a third of all ETH in the DAO to a reentrancy bug. The technical fix was easy; the social decision to fork nearly split the community. Now I assume every contract will be exploited and ask: what is the recovery story?",
  ],
];

if (memories.length >= SEED.length) {
  console.log(`Vitalik already has ${memories.length} memories — skipping`);
} else {
  for (const [title, content] of SEED.slice(memories.length)) {
    await write("addExpertMemory", [BigInt(index), title, content]);
    console.log(`Added memory: ${title}`);
  }
}
console.log("Seed complete.");
