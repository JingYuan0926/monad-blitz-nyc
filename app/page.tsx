"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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

export default function Home() {
  const [selected, setSelected] = useState<Expert | null>(null);
  const [near, setNear] = useState<NearTarget | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [balance, setBalance] = useState(5);
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

  const pay = (amount: number) => {
    if (balance < amount) return false;
    setBalance((b) => +(b - amount).toFixed(2));
    return true;
  };

  const panelOpen = !!selected || vaultOpen;

  // press E near an expert or the vault to interact
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
          <span className="text-violet-400 font-semibold">◆ {balance.toFixed(2)} MON</span>
          <button
            onClick={() => setBalance((b) => +(b + 1).toFixed(2))}
            className="rounded-md bg-violet-600 hover:bg-violet-500 px-2 py-0.5 text-xs font-semibold cursor-pointer"
          >
            + Top up
          </button>
        </div>
      </header>

      {/* talk / vault prompt */}
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
