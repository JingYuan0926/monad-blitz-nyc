"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="flex w-full items-center justify-between border-b border-black/[.08] bg-white px-6 py-4 dark:border-white/[.145] dark:bg-black">
      <span className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
        monadnyc
      </span>
      <ConnectButton label="Connect Wallet" />
    </header>
  );
}
