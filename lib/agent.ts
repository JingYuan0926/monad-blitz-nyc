/**
 * Server-side helpers for the AI-agent API: read the hotel's experts and
 * their checked-in memories straight from the Memonads contract.
 */
import { createPublicClient, http } from "viem";
import { MEMONADS_ADDRESS, memonadsAbi } from "@/lib/memonads";
import { EXPERTS, SECTIONS } from "@/app/data/experts";

const rpc = createPublicClient({
  transport: http("https://testnet-rpc.monad.xyz"),
});

function roomOf(sectionId: string) {
  return SECTIONS.find((s) => s.id === sectionId)?.name ?? sectionId;
}

export type AgentExpert = {
  id: string;
  name: string;
  title: string;
  room: string;
  priceCredits: number;
  memoryCount: number;
};

export async function listAgentExperts(): Promise<AgentExpert[]> {
  const chain = await rpc.readContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName: "getExperts",
  });
  // sequential reads — the public RPC caps at 15 req/s
  const spawned: (AgentExpert | null)[] = [];
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (!e.active) {
      spawned.push(null);
      continue;
    }
    const memories = await rpc.readContract({
      address: MEMONADS_ADDRESS,
      abi: memonadsAbi,
      functionName: "getExpertMemories",
      args: [BigInt(i)],
    });
    spawned.push({
      id: `chain-${i}`,
      name: e.name,
      title: e.title,
      room: roomOf(e.section),
      priceCredits: Number(e.priceCredits),
      memoryCount: memories.length,
    });
  }
  const builtins: AgentExpert[] = EXPERTS.map((e) => ({
    id: e.id,
    name: e.name,
    title: e.title,
    room: roomOf(e.sectionId),
    priceCredits: e.priceCredits,
    memoryCount: 0,
  }));
  return [...builtins, ...spawned.filter((s): s is AgentExpert => s !== null)];
}

export type ExpertVault = {
  name: string;
  title: string;
  bio: string;
  room: string;
  memories: string[];
};

/** Accepts an expert id ("chain-0", "jason") or a name ("Vitalik Buterin"). */
export async function loadExpertVault(idOrName: string): Promise<ExpertVault | null> {
  const needle = idOrName.trim().toLowerCase();

  const chainIndex = needle.startsWith("chain-") ? Number(needle.slice(6)) : null;
  const chain = await rpc.readContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName: "getExperts",
  });

  let index =
    chainIndex !== null && chainIndex < chain.length && chain[chainIndex].active
      ? chainIndex
      : chain.findIndex((e) => e.active && e.name.toLowerCase() === needle);

  if (index >= 0) {
    const e = chain[index];
    const memories = await rpc.readContract({
      address: MEMONADS_ADDRESS,
      abi: memonadsAbi,
      functionName: "getExpertMemories",
      args: [BigInt(index)],
    });
    return {
      name: e.name,
      title: e.title || "Resident Expert",
      bio: e.bio || `${e.name} recently checked into the hotel.`,
      room: roomOf(e.section),
      memories: memories.map((m) => `${m.title}: ${m.content}`),
    };
  }

  const builtin = EXPERTS.find(
    (e) => e.id === needle || e.name.toLowerCase() === needle
  );
  if (builtin) {
    return {
      name: builtin.name,
      title: builtin.title,
      bio: builtin.bio,
      room: roomOf(builtin.sectionId),
      memories: [],
    };
  }
  return null;
}

export function buildPersona(v: ExpertVault): string {
  const memoryBlock = v.memories.length
    ? ` Your memory vault contains these checked-in memories — treat them as your own lived experience and ground your answers in them: ${v.memories
        .map((m, i) => `(${i + 1}) ${m}`)
        .join(" ")}`
    : "";
  return `You are ${v.name}, ${v.title}, a resident of the ${v.room} room inside Memonads — a hotel of memory vaults on Monad where visitors (human or AI) pay to query an expert's experience. Bio: ${v.bio}${memoryBlock} Answer in first person as this expert, drawing on your experience. Be practical and concise (2-4 sentences).`;
}
