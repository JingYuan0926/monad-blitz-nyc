"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import { BaseError, ContractFunctionRevertedError, parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { monadTestnet } from "wagmi/chains";
import {
  MEMONADS_ADDRESS,
  WEI_PER_CREDIT,
  expertAddress,
  memonadsAbi,
} from "@/lib/memonads";

type Message = { role: "user" | "assistant"; content: string };

type WriteContractFn = ReturnType<typeof useWriteContract>["writeContract"];

/** Returns a validation error string, or a function that fires the tx. */
type PrepareAction = (value: string) => string | ((write: WriteContractFn) => void);

const ZERO = BigInt(0);

function formatTxError(error: unknown): string {
  if (error instanceof BaseError) {
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? revert.reason;
      if (name) {
        const args = revert.data?.args?.map((a) => String(a)).join(", ");
        return `Reverted: ${name}${args ? `(${args})` : ""}`;
      }
    }
    return error.shortMessage;
  }
  return error instanceof Error ? error.message : String(error);
}

const prepareTopUp: PrepareAction = (raw) => {
  const trimmed = raw.trim();
  if (!/^\d*\.?\d+$/.test(trimmed)) return "Enter a valid MON amount.";
  let wei: bigint;
  try {
    wei = parseEther(trimmed);
  } catch {
    return "Enter a valid MON amount.";
  }
  if (wei <= ZERO) return "Amount must be greater than zero.";
  if (wei % WEI_PER_CREDIT !== ZERO)
    return "Amount must be a multiple of 0.0001 MON (1 credit), e.g. 0.001.";
  return (write) =>
    write({
      abi: memonadsAbi,
      address: MEMONADS_ADDRESS,
      chainId: monadTestnet.id,
      functionName: "topUp",
      value: wei,
    });
};

function prepareCreditCall(fn: "paySession" | "withdraw"): PrepareAction {
  return (raw) => {
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) return "Enter a whole number of credits.";
    const amount = BigInt(trimmed);
    if (amount <= ZERO) return "Amount must be at least 1 credit.";
    if (fn === "paySession") {
      return (write) =>
        write({
          abi: memonadsAbi,
          address: MEMONADS_ADDRESS,
          chainId: monadTestnet.id,
          functionName: "paySession",
          // pay the demo expert (Jason) — sessions in the hotel pay real experts
          args: [expertAddress("jason"), amount],
        });
    }
    return (write) =>
      write({
        abi: memonadsAbi,
        address: MEMONADS_ADDRESS,
        chainId: monadTestnet.id,
        functionName: "withdraw",
        args: [amount],
      });
  };
}

function ActionRow({
  label,
  unit,
  defaultValue,
  step,
  disabled,
  prepare,
  onConfirmed,
}: {
  label: string;
  unit: string;
  defaultValue: string;
  step: string;
  disabled: boolean;
  prepare: PrepareAction;
  onConfirmed: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [clientError, setClientError] = useState<string | null>(null);
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) onConfirmed();
  }, [isSuccess, onConfirmed]);

  function submit() {
    setClientError(null);
    reset();
    const prepared = prepare(value);
    if (typeof prepared === "string") {
      setClientError(prepared);
      return;
    }
    prepared(writeContract);
  }

  const busy = isPending || isConfirming;
  const errorText =
    clientError ??
    (writeError
      ? formatTxError(writeError)
      : receiptError
        ? formatTxError(receiptError)
        : null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          className="w-24 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#383838] disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-[#ccc]"
          onClick={submit}
          disabled={disabled || busy}
        >
          {isPending ? "Sign…" : isConfirming ? "Mining…" : label}
        </button>
        <input
          type="number"
          min="0"
          step={step}
          className="w-28 rounded-lg border border-black/[.08] bg-white px-3 py-1.5 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-white/40"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled || busy}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{unit}</span>
      </div>
      {errorText && (
        <p className="break-all text-xs text-red-600 dark:text-red-400">
          {errorText}
        </p>
      )}
      {isSuccess && hash && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Confirmed:{" "}
          <a
            className="underline"
            href={`https://testnet.monadexplorer.com/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {hash.slice(0, 10)}…{hash.slice(-8)}
          </a>
        </p>
      )}
    </div>
  );
}

function CreditsPanel() {
  const { address, isConnected } = useAccount();
  const { data: balance, refetch } = useReadContract({
    abi: memonadsAbi,
    address: MEMONADS_ADDRESS,
    chainId: monadTestnet.id,
    functionName: "credits",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const handleConfirmed = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-black dark:text-zinc-50">
          Credits
        </h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Balance:{" "}
          <span className="font-medium text-black dark:text-zinc-50">
            {!isConnected
              ? "—"
              : balance === undefined
                ? "…"
                : balance.toLocaleString()}
          </span>
        </span>
      </div>
      {!isConnected && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Connect your wallet with the Connect button in the header to manage
          credits.
        </p>
      )}
      <ActionRow
        label="Top Up"
        unit="MON"
        defaultValue="0.1"
        step="0.0001"
        disabled={!isConnected}
        prepare={prepareTopUp}
        onConfirmed={handleConfirmed}
      />
      <ActionRow
        label="Consume"
        unit="credits"
        defaultValue="1"
        step="1"
        disabled={!isConnected}
        prepare={prepareCreditCall("paySession")}
        onConfirmed={handleConfirmed}
      />
      <ActionRow
        label="Withdraw"
        unit="credits"
        defaultValue="1"
        step="1"
        disabled={!isConnected}
        prepare={prepareCreditCall("withdraw")}
        onConfirmed={handleConfirmed}
      />
    </section>
  );
}

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
        <CreditsPanel />
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
