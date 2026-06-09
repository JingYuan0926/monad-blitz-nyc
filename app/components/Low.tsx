"use client";

import { type Expert } from "../data/experts";

/* same hair palette as the in-scene avatars (OfficeScene outfitFor) */
const HAIR_COLORS = ["#3b2a1d", "#111827", "#92400e", "#4b5563", "#1c1917", "#7c2d12", "#0f172a", "#57534e", "#451a03"];

/* tiny pixel face: hair + eyes + mouth, varied per character —
   some wear glasses, some smile, sport folks get a headband */
function ChipFace({ expert, index }: { expert: Expert; index: number }) {
  const hair = HAIR_COLORS[index % HAIR_COLORS.length];
  const glasses = index % 3 === 1;
  const smile = index % 2 === 0;
  const sideSwept = index % 4 === 2;
  const headband = expert.sectionId === "sport";

  return (
    <span className="relative -my-1.5 block h-8 w-8 shrink-0 overflow-hidden rounded-md border-2 border-[#3f5520] bg-[#f3cfa3]">
      {/* hair */}
      <span className="absolute inset-x-0 top-0 h-[8px]" style={{ background: hair }} />
      {sideSwept && (
        <span className="absolute left-0 top-0 h-[15px] w-[6px]" style={{ background: hair }} />
      )}
      {headband && <span className="absolute inset-x-0 top-[8px] h-[3px] bg-[#ef4444]" />}

      {/* eyes */}
      <span className="absolute left-[6px] top-[13px] h-[5px] w-[4px] bg-slate-900" />
      <span className="absolute right-[6px] top-[13px] h-[5px] w-[4px] bg-slate-900" />

      {/* glasses */}
      {glasses && (
        <>
          <span className="absolute left-[3px] top-[11px] h-[9px] w-[9px] border-2 border-slate-900 bg-sky-100/50" />
          <span className="absolute right-[3px] top-[11px] h-[9px] w-[9px] border-2 border-slate-900 bg-sky-100/50" />
          <span className="absolute left-1/2 top-[14px] h-[2px] w-[6px] -translate-x-1/2 bg-slate-900" />
        </>
      )}

      {/* mouth: smile or neutral */}
      {smile ? (
        <span className="absolute bottom-[3px] left-1/2 h-[5px] w-[10px] -translate-x-1/2 rounded-b-full border-b-2 border-slate-900" />
      ) : (
        <span className="absolute bottom-[4px] left-1/2 h-[2px] w-[7px] -translate-x-1/2 bg-slate-900" />
      )}
    </span>
  );
}

/* Habbo-style bottom bar: a row of green name chips, one per character,
   each with a small blocky avatar head poking out of the pill. */
export default function Low({ experts, onSelect }: { experts: Expert[]; onSelect: (expert: Expert) => void }) {
  return (
    <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 overflow-x-auto border-t-4 border-[#8e9496] bg-[#a6abad] px-4 py-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.4)]">
      {experts.map((e, i) => (
        <button
          key={e.id}
          onClick={() => onSelect(e)}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 border-[#3f5520] bg-[#6b8f3f] py-0.5 pl-1 pr-4 shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_2px_2px_rgba(0,0,0,0.35)] transition-colors hover:bg-[#7da34a]"
        >
          <ChipFace expert={e} index={i} />
          <span className="whitespace-nowrap text-sm font-bold text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.5)]">
            {e.name}
          </span>
        </button>
      ))}
    </footer>
  );
}
