"use client";

import { useState } from "react";

/* Habbo-style vertical button rail on the left: round crimson buttons
   on a maroon plate — "?" toggles a controls card, the door arrow exits
   whatever panel is open. */
export default function SideBar({ onExit }: { onExit: () => void }) {
  const [helpOpen, setHelpOpen] = useState(false);

  const btn =
    "flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-[#4a1f29] bg-[#c2455e] text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_2px_2px_rgba(0,0,0,0.4)] transition-colors hover:bg-[#d65872]";

  return (
    <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2">
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-[#4a1f29] bg-[#6b2737] p-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.15),0_3px_6px_rgba(0,0,0,0.45)]">
        <button
          onClick={() => setHelpOpen((o) => !o)}
          aria-label="Help"
          className={`${btn} text-lg font-bold`}
        >
          ?
        </button>
        <button onClick={onExit} aria-label="Exit" className={btn}>
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 4h6v16h-6" />
            <path d="M3 12h11" />
            <path d="M10 8l4 4-4 4" />
          </svg>
        </button>
      </div>

      {helpOpen && (
        <div className="absolute left-full top-0 ml-3 w-60 rounded-xl border-2 border-[#4a1f29] bg-[#6b2737] p-3 text-sm text-white shadow-xl">
          <p className="mb-2 font-bold text-amber-300">How to play</p>
          <ul className="space-y-1">
            <li>🚶 WASD / arrows — walk around</li>
            <li>💬 E — talk to a nearby expert</li>
            <li>🛎 E at reception — memory vault</li>
            <li>👤 click a name below — open profile</li>
            <li>✕ Esc — close panels</li>
          </ul>
        </div>
      )}
    </div>
  );
}
