"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { monadTestnet } from "wagmi/chains";
import { AI_QUERY_CREDITS_ADDRESS, aiQueryCreditsAbi } from "@/lib/aiQueryCredits";
import ExpertPanel from "./components/ExpertPanel";
import MemoryPanel, { type MemoryEntry } from "./components/MemoryPanel";
import type { NearTarget } from "./components/OfficeScene";
import type { Expert } from "./data/experts";

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

export default function Home() {
  const [selected, setSelected] = useState<Expert | null>(null);
  const [near, setNear] = useState<NearTarget | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [mockBalance, setMockBalance] = useState(5);
  const [topUpPending, setTopUpPending] = useState(false);
  const [memories, setMemories] = useState<MemoryEntry[]>([
    {
      id: 1,
      sectionId: "coding",
      title: "Demo first, slides second",
      text: "Judges remember what they saw working, not what you said. Build the demo path before anything else.",
    },
    {
      id: 2,
      sectionId: "science",
      title: "Listen for the first two minutes",
      text: "Patients usually tell you the diagnosis themselves if you don't interrupt them early.",
    },
    {
      id: 3,
      sectionId: "sport",
      title: "Sleep is part of training",
      text: "Most plateaus I've coached through came from recovery debt, not lack of effort.",
    },
  ]);

  // --- on-chain credits (AIQueryCredits on Monad Testnet) ---
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });
  const { writeContractAsync } = useWriteContract();
  const { data: credits, refetch: refetchCredits } = useReadContract({
    address: AI_QUERY_CREDITS_ADDRESS,
    abi: aiQueryCreditsAbi,
    functionName: "credits",
    args: [address ?? ZERO_ADDRESS],
    chainId: monadTestnet.id,
    query: { enabled: Boolean(address), refetchInterval: 4_000 },
  });

  const balance = isConnected
    ? Number(credits ?? BigInt(0)) / CREDITS_PER_MON
    : mockBalance;

  const pay = async (amountMon: number): Promise<boolean> => {
    if (isConnected) {
      const needed = BigInt(Math.round(amountMon * CREDITS_PER_MON));
      if ((credits ?? BigInt(0)) < needed) return false;
      try {
        const hash = await writeContractAsync({
          abi: aiQueryCreditsAbi,
          address: AI_QUERY_CREDITS_ADDRESS,
          chainId: monadTestnet.id,
          functionName: "consume",
          args: [needed],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        refetchCredits();
        return true;
      } catch {
        return false;
      }
    }
    // demo mode (no wallet): simulated confirmation
    if (mockBalance < amountMon) return false;
    await new Promise((r) => setTimeout(r, 1200));
    setMockBalance((b) => +(b - amountMon).toFixed(2));
    return true;
  };

  const topUp = async () => {
    if (!isConnected) {
      setMockBalance((b) => +(b + 1).toFixed(2));
      return;
    }
    setTopUpPending(true);
    try {
      const hash = await writeContractAsync({
        abi: aiQueryCreditsAbi,
        address: AI_QUERY_CREDITS_ADDRESS,
        chainId: monadTestnet.id,
        functionName: "topUp",
        value: parseEther("1"),
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      refetchCredits();
    } catch {
      // user rejected or tx failed — badge simply keeps the old balance
    } finally {
      setTopUpPending(false);
    }
  };

  const panelOpen = !!selected || vaultOpen;

  // press E near an expert or the reception desk to interact
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setVaultOpen(false);
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
        selectedId={selected?.id ?? null}
        paused={panelOpen}
        onSelectExpert={(e) => {
          setSelected(e);
          if (e) setVaultOpen(false);
        }}
        onNearChange={setNear}
      />

      {/* top HUD */}
      <header className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <h1 className="text-xl font-bold text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
          Memonads <span className="font-normal text-slate-700">· built on Monad</span>
        </h1>
        <div className="pointer-events-auto flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100">
          <span className="text-violet-400 font-semibold">
            ◆ {balance.toFixed(2)} MON
            {isConnected && credits !== undefined && (
              <span className="ml-1 font-normal text-slate-400">
                · {credits.toLocaleString()} credits
              </span>
            )}
          </span>
          <button
            onClick={topUp}
            disabled={topUpPending}
            className="rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-2 py-0.5 text-xs font-semibold cursor-pointer"
          >
            {topUpPending ? "Confirming…" : isConnected ? "+ Top up 1 MON" : "+ Top up"}
          </button>
        </div>
      </header>

      {/* wallet */}
      <div className="pointer-events-auto absolute right-4 top-4">
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
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
              to <span className="font-semibold">check in your memories</span> at reception
            </>
          )}
        </div>
      )}

      {selected && (
        <ExpertPanel
          key={selected.id}
          expert={selected}
          balance={balance}
          onPay={pay}
          onClose={() => setSelected(null)}
        />
      )}
      {vaultOpen && !selected && (
        <MemoryPanel
          memories={memories}
          onAdd={(m) => setMemories((list) => [{ ...m, id: Date.now() }, ...list])}
          onDelete={(id) => setMemories((list) => list.filter((m) => m.id !== id))}
          onClose={() => setVaultOpen(false)}
        />
      )}
    </main>
  );
}
