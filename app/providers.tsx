"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { monadTestnet } from "wagmi/chains";

const config = getDefaultConfig({
  appName: "monadnyc",
  // Get a free project ID at https://cloud.reown.com (WalletConnect)
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [monadTestnet],
  ssr: true,
});

const queryClient = new QueryClient();

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={monadTestnet}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
