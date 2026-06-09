"use client";

import { useState } from "react";
import { SECTIONS } from "../data/experts";

export type MemoryEntry = {
  id: number;
  sectionId: string;
  title: string;
  text: string;
};

export type NewExpert = {
  name: string;
  sectionId: string;
  title: string;
  bio: string;
  priceCredits: number;
};

export default function MemoryPanel({
  memories,
  needsName,
  onAdd,
  onEdit,
  onDelete,
  onCreateExpert,
  onClose,
}: {
  memories: MemoryEntry[];
  /** wallet connected but no profile registered yet — ask for a name */
  needsName: boolean;
  onAdd: (m: Omit<MemoryEntry, "id">, name?: string) => Promise<boolean>;
  onEdit: (m: MemoryEntry) => Promise<boolean>;
  onDelete: (id: number) => void | Promise<void>;
  onCreateExpert: (e: NewExpert) => Promise<boolean>;
  onClose: () => void;
}) {
  const [sectionId, setSectionId] = useState(SECTIONS[0].id);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  // submit-a-person form
  const [pName, setPName] = useState("");
  const [pSection, setPSection] = useState(SECTIONS[0].id);
  const [pTitle, setPTitle] = useState("");
  const [pPrice, setPPrice] = useState("5000");
  const [spawning, setSpawning] = useState(false);
  const [spawned, setSpawned] = useState(false);
  const [spawnFailed, setSpawnFailed] = useState(false);

  const canSave =
    title.trim() && text.trim() && !saving && (!needsName || editingId !== null || name.trim());

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setFailed(false);
    const ok =
      editingId !== null
        ? await onEdit({ id: editingId, sectionId, title: title.trim(), text: text.trim() })
        : await onAdd(
            { sectionId, title: title.trim(), text: text.trim() },
            needsName ? name.trim() : undefined
          );
    setSaving(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    setTitle("");
    setText("");
    setEditingId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const startEdit = (m: MemoryEntry) => {
    setEditingId(m.id);
    setSectionId(m.sectionId);
    setTitle(m.title);
    setText(m.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setText("");
  };

  const spawn = async () => {
    const price = parseInt(pPrice, 10);
    if (!pName.trim() || !Number.isFinite(price) || price <= 0 || spawning) return;
    setSpawning(true);
    setSpawnFailed(false);
    const ok = await onCreateExpert({
      name: pName.trim(),
      sectionId: pSection,
      title: pTitle.trim() || "Resident Expert",
      bio: "",
      priceCredits: price,
    });
    setSpawning(false);
    if (!ok) {
      setSpawnFailed(true);
      return;
    }
    setPName("");
    setPTitle("");
    setSpawned(true);
    setTimeout(() => setSpawned(false), 2500);
  };

  const sectionOf = (id: string) => SECTIONS.find((s) => s.id === id);

  return (
    <aside className="absolute right-4 top-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-violet-700 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur">
      {/* header */}
      <div className="flex items-start gap-3 p-4 border-b border-slate-700">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-bold">
          R
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
        {/* memory form */}
        <div className="rounded-xl bg-slate-800 p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400">
            {editingId !== null ? "Edit memory" : "Check in a memory"}
          </p>
          {needsName && editingId === null && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name — registered on-chain on first check-in"
              className="font-body w-full rounded-md bg-slate-900 border border-violet-600 px-2 py-1.5 text-sm outline-none focus:border-violet-400"
            />
          )}
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500 cursor-pointer"
          >
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. How I pick hackathon ideas"
            className="font-body w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The memory itself — what happened, what you learned, what you'd do differently…"
            rows={4}
            className="font-body w-full resize-none rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!canSave}
              className="flex-1 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm font-semibold transition-colors cursor-pointer"
            >
              {saving
                ? "Saving to vault…"
                : editingId !== null
                  ? "Update memory"
                  : "Save memory"}
            </button>
            {editingId !== null && (
              <button
                onClick={cancelEdit}
                className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 text-sm cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
          {saved && <p className="text-xs text-emerald-400 text-center">Saved ✓</p>}
          {failed && (
            <p className="text-xs text-red-400 text-center">
              Couldn&apos;t save — transaction rejected or failed. Try again.
            </p>
          )}
        </div>

        {/* submit a person */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400">
            Submit a person into a room
          </p>
          <p className="font-body text-xs text-slate-500">
            They spawn in the hotel as a resident others can pay to talk to. Sessions are
            paid to your wallet.
          </p>
          <input
            value={pName}
            onChange={(e) => setPName(e.target.value)}
            placeholder="Their name"
            className="font-body w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
          />
          <div className="flex gap-2">
            <select
              value={pSection}
              onChange={(e) => setPSection(e.target.value)}
              className="flex-1 rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500 cursor-pointer"
            >
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} room
                </option>
              ))}
            </select>
            <input
              value={pPrice}
              onChange={(e) => setPPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="Price"
              className="font-body w-24 rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
            />
          </div>
          <input
            value={pTitle}
            onChange={(e) => setPTitle(e.target.value)}
            placeholder="Their title — e.g. Game Designer, 10y"
            className="font-body w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
          />
          <button
            onClick={spawn}
            disabled={!pName.trim() || spawning}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm font-semibold transition-colors cursor-pointer"
          >
            {spawning ? "Spawning…" : "Spawn person"}
          </button>
          {spawned && (
            <p className="text-xs text-emerald-400 text-center">
              Spawned ✓ — look for them in their room
            </p>
          )}
          {spawnFailed && (
            <p className="text-xs text-red-400 text-center">
              Couldn&apos;t spawn — transaction rejected or failed.
            </p>
          )}
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
                      [{sectionOf(m.sectionId)?.name ?? m.sectionId}] {m.title}
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <button
                        onClick={() => startEdit(m)}
                        className="text-slate-500 hover:text-violet-300 cursor-pointer"
                        aria-label="Edit memory"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(m.id)}
                        className="text-slate-500 hover:text-red-400 cursor-pointer"
                        aria-label="Delete memory"
                      >
                        ✕
                      </button>
                    </span>
                  </p>
                  <p className="font-body text-slate-400 mt-1">{m.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
