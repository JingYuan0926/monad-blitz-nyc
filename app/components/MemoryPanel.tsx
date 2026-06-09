"use client";

import { useState } from "react";
import { SECTIONS } from "../data/experts";

export type MemoryEntry = {
  id: number;
  sectionId: string;
  title: string;
  text: string;
};

export default function MemoryPanel({
  memories,
  onAdd,
  onDelete,
  onClose,
}: {
  memories: MemoryEntry[];
  onAdd: (m: Omit<MemoryEntry, "id">) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}) {
  const [sectionId, setSectionId] = useState(SECTIONS[0].id);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!title.trim() || !text.trim() || saving) return;
    setSaving(true);
    // UI-only: simulate writing to the vault
    setTimeout(() => {
      onAdd({ sectionId, title: title.trim(), text: text.trim() });
      setTitle("");
      setText("");
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 900);
  };

  const sectionOf = (id: string) => SECTIONS.find((s) => s.id === id);

  return (
    <aside className="absolute right-4 top-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-violet-700 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur">
      {/* header */}
      <div className="flex items-start gap-3 p-4 border-b border-slate-700">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-2xl">
          🛎
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-lg leading-tight">Reception — Memory Vault</h2>
          <p className="text-sm text-slate-400">
            Check in your knowledge, queryable by everyone
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xl leading-none cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-sm text-slate-300">
          Write down what you&apos;ve learned — experiences, strategies, mistakes. It becomes part
          of your memory room that others can visit and query.
        </p>

        {/* add form */}
        <div className="rounded-xl bg-slate-800 p-3 space-y-2">
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500 cursor-pointer"
          >
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. How I pick hackathon ideas"
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The memory itself — what happened, what you learned, what you'd do differently…"
            rows={4}
            className="w-full resize-none rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
          />
          <button
            onClick={save}
            disabled={!title.trim() || !text.trim() || saving}
            className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm font-semibold transition-colors cursor-pointer"
          >
            {saving ? "Saving to vault…" : "Save memory"}
          </button>
          {saved && <p className="text-xs text-emerald-400 text-center">Memory saved ✓</p>}
        </div>

        {/* entries */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-2">
            Your memories ({memories.length})
          </h3>
          {memories.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing here yet — add your first memory above.</p>
          ) : (
            <ul className="space-y-2">
              {memories.map((m) => (
                <li key={m.id} className="rounded-lg bg-slate-800 p-3 text-sm">
                  <p className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-200 truncate">
                      {sectionOf(m.sectionId)?.emoji} {m.title}
                    </span>
                    <button
                      onClick={() => onDelete(m.id)}
                      className="text-slate-500 hover:text-red-400 cursor-pointer"
                      aria-label="Delete memory"
                    >
                      🗑
                    </button>
                  </p>
                  <p className="text-slate-400 mt-1">{m.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
