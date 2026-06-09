"use client";

import { useState } from "react";
import { SECTIONS, type Expert, type Review } from "../data/experts";

type ChatMessage = { role: "user" | "expert"; text: string };

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className="text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={`${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
        >
          {i <= Math.round(value) ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}

export default function ExpertPanel({
  expert,
  balance,
  onPay,
  onClose,
}: {
  expert: Expert;
  balance: number;
  onPay: (amount: number) => boolean;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"profile" | "paying" | "chat">("profile");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [reviews, setReviews] = useState<Review[]>(expert.reviews);
  const [myRating, setMyRating] = useState(5);
  const [myReview, setMyReview] = useState("");

  const section = SECTIONS.find((s) => s.id === expert.sectionId);

  const handlePay = () => {
    if (!onPay(expert.pricePerSession)) return;
    setStage("paying");
    // UI-only: simulate the on-chain confirmation
    setTimeout(() => {
      setStage("chat");
      setMessages([
        {
          role: "expert",
          text: `Hey, I'm ${expert.name}. You've unlocked a session with my memory vault — ask me anything about ${section?.name.toLowerCase()}.`,
        },
      ]);
    }, 1200);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    // UI-only placeholder reply
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "expert",
          text: `(demo) Great question — in my experience, "${text.slice(0, 60)}" comes down to fundamentals. Once the vault is wired up, this answer will come from my real memories.`,
        },
      ]);
    }, 700);
  };

  const submitReview = () => {
    if (!myReview.trim()) return;
    setReviews((r) => [{ author: "you", rating: myRating, text: myReview.trim() }, ...r]);
    setMyReview("");
  };

  return (
    <aside className="absolute right-4 top-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur">
      {/* header */}
      <div className="flex items-start gap-3 p-4 border-b border-slate-700">
        <div
          className="h-12 w-12 shrink-0 rounded-full border-2 border-slate-600"
          style={{ background: expert.color }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-lg leading-tight">{expert.name}</h2>
          <p className="text-sm text-slate-400 truncate">{expert.title}</p>
          <p className="text-xs mt-0.5">
            <Stars value={expert.rating} /> {expert.rating} · {expert.sessions} sessions ·{" "}
            <span style={{ color: section?.color }}>
              {section?.emoji} {section?.name}
            </span>
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

      {/* body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {stage === "profile" && (
          <>
            <p className="text-sm text-slate-300">{expert.bio}</p>

            <button
              onClick={handlePay}
              disabled={balance < expert.pricePerSession}
              className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 font-semibold transition-colors cursor-pointer"
            >
              Pay {expert.pricePerSession} MON · Start Talking
            </button>
            {balance < expert.pricePerSession && (
              <p className="text-xs text-red-400 text-center">Not enough MON — top up your balance.</p>
            )}

            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2">
                Reviews ({reviews.length})
              </h3>
              <ul className="space-y-2">
                {reviews.map((r, i) => (
                  <li key={i} className="rounded-lg bg-slate-800 p-3 text-sm">
                    <p className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">{r.author}</span>
                      <Stars value={r.rating} />
                    </p>
                    <p className="text-slate-400 mt-1">{r.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {stage === "paying" && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="text-sm text-slate-300">
              Confirming payment of {expert.pricePerSession} MON on Monad…
            </p>
          </div>
        )}

        {stage === "chat" && (
          <>
            <div className="space-y-2">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-violet-600 text-white"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-slate-800 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-400">Leave a review</p>
              <Stars value={myRating} onChange={setMyRating} />
              <div className="flex gap-2">
                <input
                  value={myReview}
                  onChange={(e) => setMyReview(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitReview()}
                  placeholder="How was the session?"
                  className="flex-1 rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-violet-500"
                />
                <button
                  onClick={submitReview}
                  className="rounded-md bg-slate-700 hover:bg-slate-600 px-3 text-sm cursor-pointer"
                >
                  Post
                </button>
              </div>
              {reviews.some((r) => r.author === "you") && (
                <p className="text-xs text-emerald-400">Review posted ✓</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* chat input */}
      {stage === "chat" && (
        <div className="flex gap-2 border-t border-slate-700 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={`Ask ${expert.name.split(" ")[0]} anything…`}
            className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
          <button
            onClick={sendMessage}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 px-4 text-sm font-semibold cursor-pointer"
          >
            Send
          </button>
        </div>
      )}
    </aside>
  );
}
