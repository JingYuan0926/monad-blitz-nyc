"use client";

import { useState } from "react";
import { SECTIONS, type Expert } from "../data/experts";

export type MemoryEntry = {
  id: number;
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
  people,
  selectedPersonId,
  onSelectPerson,
  memories,
  onAdd,
  onEdit,
  onDelete,
  onCreateExpert,
  onClose,
}: {
  /** the people you submitted — memories live inside them */
  people: Expert[];
  selectedPersonId: string | null;
  onSelectPerson: (id: string) => void;
  memories: MemoryEntry[];
  onAdd: (m: Omit<MemoryEntry, "id">) => Promise<boolean>;
  onEdit: (m: MemoryEntry) => Promise<boolean>;
  onDelete: (id: number) => void | Promise<void>;
  onCreateExpert: (e: NewExpert) => Promise<boolean>;
  onClose: () => void;
}) {
  // one tab at a time: spawn new people, or edit the ones you own
  const [tab, setTab] = useState<"spawn" | "edit">(people.length ? "edit" : "spawn");
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

  const person = people.find((p) => p.id === selectedPersonId) ?? null;
  const canSave = person && title.trim() && text.trim() && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setFailed(false);
    const ok =
      editingId !== null
        ? await onEdit({ id: editingId, title: title.trim(), text: text.trim() })
        : await onAdd({ title: title.trim(), text: text.trim() });
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
    setTab("edit"); // jump straight to the new person
    setTimeout(() => setSpawned(false), 2500);
  };

  return (
    <aside className="absolute right-4 top-4 bottom-16 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-violet-700 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur">
      {/* header */}
      <div className="flex items-start gap-3 p-4 border-b border-slate-700">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-lg font-bold">
          R
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-lg leading-tight">Reception</h2>
          <p className="text-sm text-slate-400">
            Submit people — their memories live inside them
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

      {/* tab switcher */}
      <div className="flex gap-1 border-b border-slate-700 p-2">
        <button
          onClick={() => setTab("spawn")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold cursor-pointer transition-colors ${
            tab === "spawn"
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          Spawn people
        </button>
        <button
          onClick={() => setTab("edit")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold cursor-pointer transition-colors ${
            tab === "edit"
              ? "bg-violet-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          Edit people ({people.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "spawn" && (
          <div className="space-y-2">
            <p className="font-body text-xs text-slate-500">
              They spawn in the office as a resident others can pay to talk to. Sessions
              are paid to your wallet.
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
            {spawnFailed && (
              <p className="text-xs text-red-400 text-center">
                Couldn&apos;t spawn — transaction rejected or failed.
              </p>
            )}
          </div>
        )}

        {tab === "edit" && (
          <div className="space-y-2">
            {spawned && (
              <p className="text-xs text-emerald-400">
                Spawned — look for them in their room
              </p>
            )}
            {people.length === 0 ? (
              <p className="font-body text-sm text-slate-500">
                You haven&apos;t submitted anyone yet — use the Spawn people tab first.
                Their memories will live inside them.
              </p>
            ) : (
              <>
                <select
                  value={selectedPersonId ?? ""}
                  onChange={(e) => onSelectPerson(e.target.value)}
                  className="w-full rounded-md bg-slate-900 border border-violet-600 px-2 py-1.5 text-sm outline-none focus:border-violet-400 cursor-pointer"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {SECTIONS.find((s) => s.id === p.sectionId)?.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs font-semibold text-slate-400">
                  {editingId !== null ? "Edit memory" : "Add a memory"}
                </p>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title — e.g. How I pick hackathon ideas"
                  className="font-body w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
                />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="The memory itself — what happened, what they learned, what they'd do differently…"
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
                      ? "Saving…"
                      : editingId !== null
                        ? "Update memory"
                        : `Save into ${person?.name.split(" ")[0] ?? "vault"}`}
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

                {person && (
                  <div className="pt-2">
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">
                      {person.name}&apos;s memories ({memories.length})
                    </h3>
                    {memories.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nothing here yet — their mind is empty until you add memories.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {memories.map((m) => (
                          <li key={m.id} className="rounded-lg bg-slate-800 p-3 text-sm">
                            <p className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-200 truncate">
                                {m.title}
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
                )}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
