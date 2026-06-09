"use client";

import { useState } from "react";
import Header from "@/components/Header";

type Message = { role: "user" | "assistant"; content: string };

export default function Test() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const content = input.trim();
    if (!content || loading) return;

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(JSON.stringify(data));
      } else {
        setMessages([...next, { role: "assistant", content: data.reply }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
        <div className="flex flex-1 flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Send a message to test /api/chat.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "self-end bg-black text-white dark:bg-zinc-50 dark:text-black"
                  : "self-start border border-black/[.08] bg-white text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="self-start rounded-2xl border border-black/[.08] bg-white px-4 py-2 text-sm text-zinc-500 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-400">
              Thinking…
            </div>
          )}
          {error && (
            <pre className="self-stretch overflow-x-auto rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </pre>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-full border border-black/[.08] bg-white px-4 py-2 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-white/40"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            disabled={loading}
          />
          <button
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#383838] disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-[#ccc]"
            onClick={send}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
