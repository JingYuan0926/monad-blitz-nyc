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
  onBubble,
  onClose,
}: {
  expert: Expert;
  balance: number;
  onPay: (amount: number) => Promise<boolean>;
  onBubble: (role: "user" | "expert", text: string) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"profile" | "paying" | "chat">("profile");
  const [payError, setPayError] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [reviews, setReviews] = useState<Review[]>(expert.reviews);
  const [myRating, setMyRating] = useState(5);
  const [myReview, setMyReview] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [justPosted, setJustPosted] = useState(false);

  const section = SECTIONS.find((s) => s.id === expert.sectionId);

  const handlePay = async () => {
    setPayError(false);
    setStage("paying");
    const ok = await onPay(expert.priceCredits);
    if (!ok) {
      setPayError(true);
      setStage("profile");
      return;
    }
    setStage("chat");
    const greeting = `Hey, I'm ${expert.name}. You've unlocked a session with my memory vault — ask me anything about ${section?.name.toLowerCase()}.`;
    setMessages([{ role: "expert", text: greeting }]);
    onBubble("expert", greeting);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    const history = messages;
    setMessages((m) => [...m, { role: "user", text }]);
    onBubble("user", text);
    setThinking(true);
    try {
      const persona = `You are ${expert.name}, ${expert.title}, an expert in ${section?.name.toLowerCase()} inside Memonads — a hotel of memory vaults where visitors pay to query an expert's experience. Bio: ${expert.bio} Answer in first person as this expert, drawing on your experience. Be practical and concise (2-4 sentences).`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: persona },
            ...history.map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.text,
            })),
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.reply !== "string") throw new Error(data.error);
      setMessages((m) => [...m, { role: "expert", text: data.reply }]);
      onBubble("expert", data.reply);
    } catch {
      const fallback = `(offline) Great question — in my experience, "${text.slice(0, 60)}" comes down to fundamentals. Set OPENAI_API_KEY in .env.local to get my real answers.`;
      setMessages((m) => [...m, { role: "expert", text: fallback }]);
      onBubble("expert", fallback);
    } finally {
      setThinking(false);
    }
  };

  const submitReview = () => {
    if (!myReview.trim()) return;
    setReviews((r) => [{ author: "you", rating: myRating, text: myReview.trim() }, ...r]);
    setMyReview("");
    setReviewOpen(false);
    setJustPosted(true);
    setTimeout(() => setJustPosted(false), 2000);
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
        {stage === "chat" && (
          <button
            onClick={() => setReviewOpen((o) => !o)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors ${
              reviewOpen
                ? "border-amber-400 text-amber-300 bg-amber-400/10"
                : "border-slate-600 text-slate-300 hover:border-amber-400 hover:text-amber-300"
            }`}
            aria-label="Leave a review"
          >
            ★ Review
          </button>
        )}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xl leading-none cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* review popover (anchored under the header, out of the chat flow) */}
      {reviewOpen && stage === "chat" && (
        <div className="absolute right-3 top-[84px] z-20 w-72 rounded-xl border border-slate-600 bg-slate-800 p-3 shadow-2xl space-y-2">
          <p className="flex items-center justify-between text-xs font-semibold text-slate-300">
            Rate this session
            <Stars value={myRating} onChange={setMyRating} />
          </p>
          <div className="flex gap-2">
            <input
              value={myReview}
              onChange={(e) => setMyReview(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitReview()}
              placeholder="How was the session?"
              autoFocus
              className="flex-1 rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
            />
            <button
              onClick={submitReview}
              disabled={!myReview.trim()}
              className="rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-40 px-3 text-sm font-semibold text-slate-900 cursor-pointer"
            >
              Post
            </button>
          </div>
        </div>
      )}
      {justPosted && (
        <p className="absolute left-1/2 top-[88px] z-20 -translate-x-1/2 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow">
          Review posted ✓
        </p>
      )}

      {/* body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {stage === "profile" && (
          <>
            <p className="text-sm text-slate-300">{expert.bio}</p>

            <button
              onClick={handlePay}
              disabled={balance < expert.priceCredits}
              className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 font-semibold transition-colors cursor-pointer"
            >
              Pay {expert.priceCredits.toLocaleString()} credits · Start Talking
            </button>
            {balance < expert.priceCredits && (
              <p className="text-xs text-red-400 text-center">Not enough credits — top up your balance.</p>
            )}
            {payError && (
              <p className="text-xs text-red-400 text-center">
                Payment didn&apos;t go through — check your credits and try again.
              </p>
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
              Confirming payment of {expert.priceCredits.toLocaleString()} credits on Monad…
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
              {thinking && (
                <div className="max-w-[85%] rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-400">
                  thinking…
                </div>
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
