"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { monadTestnet } from "wagmi/chains";

import { MEMONADS_ADDRESS, memonadsAbi } from "@/lib/memonads";

function CreditsBadge() {
  const { address, isConnected } = useAccount();

  const { data: balance, isLoading } = useReadContract({
    address: MEMONADS_ADDRESS,
    abi: memonadsAbi,
    functionName: "credits",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId: monadTestnet.id,
    query: {
      enabled: Boolean(address),
      // Keep the badge live: poll the chain every few seconds.
      refetchInterval: 4_000,
    },
  });

  if (!isConnected) return null;

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-black/[.08] bg-zinc-50 px-3 py-1.5 text-sm font-medium text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50">
      {isLoading || balance === undefined
        ? "…"
        : `${balance.toLocaleString()} credits`}
    </span>
  );
}

export default function Header() {
  return (
    <header className="flex w-full items-center justify-between border-b border-black/[.08] bg-white px-6 py-4 dark:border-white/[.145] dark:bg-black">
      <span className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
        monadnyc
      </span>
      <div className="flex items-center gap-3">
        <CreditsBadge />
        <ConnectButton label="Connect Wallet" />
      </div>
    </header>
  );
}
