"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { monadTestnet } from "wagmi/chains";
import { MEMONADS_ADDRESS, memonadsAbi, expertAddress } from "@/lib/memonads";
import ExpertPanel from "./components/ExpertPanel";
import Low from "./components/Low";
import SideBar from "./components/SideBar";
import MemoryPanel, { type MemoryEntry, type NewExpert } from "./components/MemoryPanel";
import NewsFeed from "./components/NewsFeed";
import type { NearTarget } from "./components/OfficeScene";
import { EXPERTS, SECTIONS, type Expert, type Review } from "./data/experts";

const OfficeScene = dynamic(() => import("./components/OfficeScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-slate-400">
      Loading office…
    </div>
  ),
});

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const CREDITS_PER_MON = 10_000;

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const SPAWN_COLORS = ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#c084fc", "#f87171"];

function validSection(section: string) {
  return SECTIONS.some((s) => s.id === section) ? section : SECTIONS[0].id;
}

// spawned people have ids like "chain-3" — 3 is their on-chain index
function chainIndexOf(id: string): number | null {
  return id.startsWith("chain-") ? Number(id.slice(6)) : null;
}

export default function Home() {
  const [selected, setSelected] = useState<Expert | null>(null);
  const [near, setNear] = useState<NearTarget | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [playerBubble, setPlayerBubble] = useState<string | null>(null);
  const [expertBubble, setExpertBubble] = useState<{ id: string; text: string } | null>(null);
  const [mockCredits, setMockCredits] = useState(50_000);
  const [topUpPending, setTopUpPending] = useState(false);
  const [localExperts, setLocalExperts] = useState<Expert[]>([]);
  // demo mode: each spawned person's memories, keyed by person id
  const [localPersonMemories, setLocalPersonMemories] = useState<Record<string, MemoryEntry[]>>({});
  const [vaultPersonId, setVaultPersonId] = useState<string | null>(null);

  // --- Memonads contract (Monad Testnet) ---
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  const { writeContractAsync } = useWriteContract();

  const { data: credits, refetch: refetchCredits } = useReadContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName: "credits",
    args: [address ?? ZERO_ADDRESS],
    chainId: monadTestnet.id,
    query: { enabled: Boolean(address), refetchInterval: 4_000 },
  });

  const { data: chainExpertList, refetch: refetchExperts } = useReadContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName: "getExperts",
    chainId: monadTestnet.id,
    query: { enabled: isConnected, refetchInterval: 8_000 },
  });

  // spawned people walk the hotel beside the built-in residents;
  // their sessions are paid to the owner wallet that submitted them
  const { experts, expertOwners } = useMemo(() => {
    const owners: Record<string, `0x${string}`> = {};
    const spawned: Expert[] = (chainExpertList ?? [])
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.active)
      .map(({ e, i }) => {
        const id = `chain-${i}`;
        owners[id] = e.owner;
        return {
          id,
          name: e.name,
          title: e.title || "Resident Expert",
          sectionId: validSection(e.section),
          activity: "wandering" as const,
          priceCredits: Number(e.priceCredits),
          color: SPAWN_COLORS[i % SPAWN_COLORS.length],
          bio: e.bio || `${e.name} recently checked into the hotel.`,
          rating: 5.0,
          sessions: 0,
          reviews: [],
        };
      });
    const extras = isConnected ? spawned : localExperts;
    const extraNames = new Set(extras.map((e) => e.name.toLowerCase()));
    return {
      // the on-chain person wins when a built-in shares their name
      experts: [...EXPERTS.filter((e) => !extraNames.has(e.name.toLowerCase())), ...extras],
      expertOwners: owners,
    };
  }, [chainExpertList, isConnected, localExperts]);

  // people YOU submitted (whose vaults you can curate at reception)
  const myPeople = useMemo(
    () =>
      experts.filter((e) =>
        isConnected
          ? expertOwners[e.id]?.toLowerCase() === address?.toLowerCase()
          : e.id.startsWith("local-")
      ),
    [experts, expertOwners, isConnected, address]
  );

  // keep a valid person selected in the vault panel
  useEffect(() => {
    if (!vaultPersonId || !myPeople.some((p) => p.id === vaultPersonId)) {
      setVaultPersonId(myPeople[0]?.id ?? null);
    }
  }, [myPeople, vaultPersonId]);

  // memories of the person being curated at reception
  const vaultPersonChainIndex = vaultPersonId ? chainIndexOf(vaultPersonId) : null;
  const { data: vaultChainMemories, refetch: refetchVaultMemories } = useReadContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName: "getExpertMemories",
    args: [BigInt(vaultPersonChainIndex ?? 0)],
    chainId: monadTestnet.id,
    query: { enabled: isConnected && vaultPersonChainIndex !== null },
  });

  const vaultMemories: MemoryEntry[] =
    isConnected && vaultPersonChainIndex !== null
      ? (vaultChainMemories ?? []).map((m, i) => ({ id: i, title: m.title, text: m.content }))
      : (vaultPersonId && localPersonMemories[vaultPersonId]) || [];

  // memories of the expert you're chatting with — they feed the AI persona
  const selectedChainIndex = selected ? chainIndexOf(selected.id) : null;
  const { data: selectedChainMemories } = useReadContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName: "getExpertMemories",
    args: [BigInt(selectedChainIndex ?? 0)],
    chainId: monadTestnet.id,
    query: { enabled: isConnected && selectedChainIndex !== null },
  });

  const selectedVault: string[] = selected
    ? selectedChainIndex !== null
      ? (selectedChainMemories ?? []).map((m) => `${m.title}: ${m.content}`)
      : (localPersonMemories[selected.id] ?? []).map((m) => `${m.title}: ${m.text}`)
    : [];

  // payments/reviews target the owner wallet for spawned people,
  // a stable pseudo-address for built-in residents
  const payAddressOf = (e: Expert): `0x${string}` =>
    expertOwners[e.id] ?? expertAddress(e.id);

  // your own people talk to you for free
  const isMine = (e: Expert) =>
    isConnected
      ? expertOwners[e.id]?.toLowerCase() === address?.toLowerCase()
      : e.id.startsWith("local-");

  const selectedExpertAddr = selected ? payAddressOf(selected) : ZERO_ADDRESS;
  const { data: chainReviews, refetch: refetchReviews } = useReadContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName: "getReviews",
    args: [selectedExpertAddr],
    chainId: monadTestnet.id,
    query: { enabled: Boolean(selected) && isConnected },
  });

  const balanceCredits = isConnected ? Number(credits ?? BigInt(0)) : mockCredits;

  const writeAndWait = async (
    functionName:
      | "addExpertMemory"
      | "editExpertMemory"
      | "deleteExpertMemory"
      | "topUp"
      | "paySession"
      | "review"
      | "createExpert",
    args: readonly unknown[],
    value?: bigint
  ) => {
    const hash = await writeContractAsync({
      abi: memonadsAbi,
      address: MEMONADS_ADDRESS,
      chainId: monadTestnet.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      functionName: functionName as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: args as any,
      value,
    });
    await publicClient?.waitForTransactionReceipt({ hash });
  };

  // pay for a session with the currently open expert
  const pay = async (amountCredits: number): Promise<boolean> => {
    if (selected && isMine(selected)) return true; // owners chat with their own people free
    if (isConnected) {
      if (!selected || (credits ?? BigInt(0)) < BigInt(amountCredits)) return false;
      try {
        await writeAndWait("paySession", [payAddressOf(selected), BigInt(amountCredits)]);
        refetchCredits();
        return true;
      } catch {
        return false;
      }
    }
    // demo mode (no wallet): simulated confirmation
    if (mockCredits < amountCredits) return false;
    await new Promise((r) => setTimeout(r, 1200));
    setMockCredits((b) => b - amountCredits);
    return true;
  };

  const postReview = async (rating: number, text: string): Promise<"chain" | "local" | false> => {
    if (!isConnected || !selected) return "local"; // demo mode: local only
    try {
      await writeAndWait("review", [selectedExpertAddr, rating, text]);
      refetchReviews();
      return "chain";
    } catch {
      return false;
    }
  };

  const topUp = async () => {
    if (!isConnected) {
      setMockCredits((b) => b + CREDITS_PER_MON);
      return;
    }
    setTopUpPending(true);
    try {
      await writeAndWait("topUp", [], parseEther("1"));
      refetchCredits();
    } catch {
      // user rejected or tx failed — badge simply keeps the old balance
    } finally {
      setTopUpPending(false);
    }
  };

  // --- reception: spawn people and curate their memories ---

  const createExpert = async (e: NewExpert): Promise<boolean> => {
    if (!isConnected) {
      const id = `local-${Date.now()}`;
      setLocalExperts((list) => [
        ...list,
        {
          id,
          name: e.name,
          title: e.title,
          sectionId: e.sectionId,
          activity: "wandering",
          priceCredits: e.priceCredits,
          color: SPAWN_COLORS[localExperts.length % SPAWN_COLORS.length],
          bio: e.bio || `${e.name} recently checked into the hotel.`,
          rating: 5.0,
          sessions: 0,
          reviews: [],
        },
      ]);
      setVaultPersonId(id);
      return true;
    }
    try {
      await writeAndWait("createExpert", [e.name, e.sectionId, e.title, e.bio, BigInt(e.priceCredits)]);
      refetchExperts();
      return true;
    } catch {
      return false;
    }
  };

  const addMemory = async (m: Omit<MemoryEntry, "id">): Promise<boolean> => {
    if (!vaultPersonId) return false;
    if (!isConnected) {
      setLocalPersonMemories((all) => ({
        ...all,
        [vaultPersonId]: [{ ...m, id: Date.now() }, ...(all[vaultPersonId] ?? [])],
      }));
      return true;
    }
    if (vaultPersonChainIndex === null) return false;
    try {
      await writeAndWait("addExpertMemory", [BigInt(vaultPersonChainIndex), m.title, m.text]);
      refetchVaultMemories();
      return true;
    } catch {
      return false;
    }
  };

  const editMemory = async (m: MemoryEntry): Promise<boolean> => {
    if (!vaultPersonId) return false;
    if (!isConnected) {
      setLocalPersonMemories((all) => ({
        ...all,
        [vaultPersonId]: (all[vaultPersonId] ?? []).map((x) => (x.id === m.id ? m : x)),
      }));
      return true;
    }
    if (vaultPersonChainIndex === null) return false;
    try {
      await writeAndWait("editExpertMemory", [BigInt(vaultPersonChainIndex), BigInt(m.id), m.title, m.text]);
      refetchVaultMemories();
      return true;
    } catch {
      return false;
    }
  };

  const deleteMemory = async (id: number) => {
    if (!vaultPersonId) return;
    if (!isConnected) {
      setLocalPersonMemories((all) => ({
        ...all,
        [vaultPersonId]: (all[vaultPersonId] ?? []).filter((m) => m.id !== id),
      }));
      return;
    }
    if (vaultPersonChainIndex === null) return;
    try {
      await writeAndWait("deleteExpertMemory", [BigInt(vaultPersonChainIndex), BigInt(id)]);
      refetchVaultMemories();
    } catch {
      // tx rejected — list stays as-is
    }
  };

  // reviews recorded on-chain for the open expert, newest first
  const onChainReviews: Review[] = isConnected
    ? [...(chainReviews ?? [])].reverse().map((r) => ({
        author: shortAddress(r.reviewer),
        rating: Number(r.rating),
        text: r.text,
      }))
    : [];

  const panelOpen = !!selected || vaultOpen;

  const clearBubbles = () => {
    setPlayerBubble(null);
    setExpertBubble(null);
  };

  const closeExpert = () => {
    setSelected(null);
    clearBubbles();
  };

  // press E near an expert or the reception desk to interact
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setVaultOpen(false);
        clearBubbles();
        return;
      }
      if (e.key.toLowerCase() === "e" && near && !panelOpen) {
        if (near.kind === "expert") setSelected(near.expert);
        else setVaultOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [near, panelOpen]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-slate-950">
      <OfficeScene
        experts={experts}
        selectedId={selected?.id ?? null}
        paused={panelOpen}
        playerBubble={playerBubble}
        expertBubble={expertBubble}
        onSelectExpert={(e) => {
          setSelected(e);
          if (e) setVaultOpen(false);
          else clearBubbles();
        }}
        onNearChange={setNear}
      />

      {/* top HUD */}
      <header className="pointer-events-none absolute left-4 top-4">
        <h1 className="text-4xl font-bold text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
          Memonads <span className="text-2xl font-normal text-slate-700">· built on Monad</span>
        </h1>
      </header>

      {/* wallet + credits */}
      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col items-end gap-2">
        <ConnectButton showBalance chainStatus="full" accountStatus="address" />
        <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100">
          <span className="text-violet-400 font-semibold">
            {balanceCredits.toLocaleString()} credits
          </span>
          <button
            onClick={topUp}
            disabled={topUpPending}
            className="rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-2 py-0.5 text-xs font-semibold cursor-pointer"
          >
            {topUpPending ? "Confirming…" : isConnected ? "+ Top up 1 MON" : "+ Top up"}
          </button>
        </div>
        <a
          href="/docs"
          className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-violet-500 transition-colors"
        >
          For AI agents — x402 API →
        </a>
        {/* office news ticker */}
        <NewsFeed />
      </div>

      {/* talk / reception prompt */}
      {near && !panelOpen && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 shadow-lg">
          Press <kbd className="rounded bg-violet-600 px-1.5 py-0.5 font-bold">E</kbd>{" "}
          {near.kind === "expert" ? (
            <>
              to talk to <span className="font-semibold">{near.expert.name}</span>
            </>
          ) : (
            <>
              to visit <span className="font-semibold">reception</span>
            </>
          )}
        </div>
      )}

      {selected && (
        <ExpertPanel
          key={selected.id}
          expert={selected}
          mine={isMine(selected)}
          balance={balanceCredits}
          extraReviews={onChainReviews}
          vaultMemories={selectedVault}
          onPay={pay}
          onReview={postReview}
          onBubble={(role, text) => {
            if (role === "user") setPlayerBubble(text);
            else setExpertBubble({ id: selected.id, text });
          }}
          onClose={closeExpert}
        />
      )}
      {/* habbo-style left button rail */}
      <SideBar
        onExit={() => {
          setSelected(null);
          setVaultOpen(false);
          clearBubbles();
        }}
      />

      {/* habbo-style bottom bar with character chips */}
      <Low
        experts={experts}
        onSelect={(e) => {
          setSelected(e);
          setVaultOpen(false);
          clearBubbles();
        }}
      />

      {vaultOpen && !selected && (
        <MemoryPanel
          people={myPeople}
          selectedPersonId={vaultPersonId}
          onSelectPerson={setVaultPersonId}
          memories={vaultMemories}
          onAdd={addMemory}
          onEdit={editMemory}
          onDelete={deleteMemory}
          onCreateExpert={createExpert}
          onClose={() => setVaultOpen(false)}
        />
      )}
    </main>
  );
}
