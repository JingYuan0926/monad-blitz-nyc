"use client";

import { useEffect, useRef, useState } from "react";

/* hotel news ticker: messages keep flushing in at the bottom and
   slowly push the older ones up, habbo-notification style */
const FEED = [
  "🏠 Mark Zuckerberg just moved in",
  "🚀 Elon Musk is busy doing SpaceX",
  "🏆 Vitalik Buterin won another hackathon",
  "🏀 Stephen Curry hit 50 threes in practice",
  "🧠 Jensen Huang shipped a new gene paper",
  "⚡ Cristiano Ronaldo set a sprint record",
  "🔧 Kartik Talwar fixed prod at 3am again",
  "📦 Balaji Srinivasan launched product #25",
  "🥗 Jeremy Lin posted a new meal plan",
  "🛎 New memories checked in at reception",
  "🛗 Floors 2-4 are still coming soon",
  "💜 Credits top-ups now live on Monad",
];

type NewsItem = { id: number; text: string };

export default function NewsFeed() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const next = useRef(0);

  useEffect(() => {
    const push = () =>
      setItems((list) => {
        const id = next.current;
        const text = FEED[next.current % FEED.length];
        next.current += 1;
        return [...list, { id, text }].slice(-6); // keep the stack small
      });
    push();
    const timer = setInterval(push, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-0 min-w-full rounded-xl border border-slate-700 bg-slate-900/90 text-slate-100">
      <p className="flex items-center gap-2 border-b border-slate-700 px-3 py-1.5 text-xs font-semibold text-amber-300">
        📰 Hotel news
      </p>
      <div
        className="flex h-40 flex-col justify-end gap-1 overflow-hidden px-3 py-2"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 30%)" }}
      >
        {items.map((m) => (
          <p key={m.id} className="news-item text-xs leading-snug text-slate-200">
            {m.text}
          </p>
        ))}
      </div>
    </div>
  );
}
