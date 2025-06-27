// src/providers/WagmiProvider.js
import React from "react";
import { View, Platform } from "react-native";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createAppKit,
  defaultWagmiConfig,
  AppKit,
} from "@reown/appkit-wagmi-react-native";
import { mantaPacificTestnet } from "../constants/blockchain";
import { ENV_PROJECT_ID } from "@env";

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = ENV_PROJECT_ID;
// 2. Create wagmiConfig with proper chains setup
const metadata = {
  name: "EduVerse",
  description: "Educational DApp on Manta Pacific",
  url: "https://eduverse.app",
  icons: ["https://eduverse.app/icon.png"],
  redirect: {
    native: "eduverse://",
    universal: "https://eduverse.app",
  },
};

// 3. Define chains array
const chains = [mantaPacificTestnet];

// ✅ Enhanced Manta Pacific configuration
const mantaPacificTestnetOptimized = {
  ...mantaPacificTestnet,
  rpcUrls: {
    default: {
      http: [
        "https://pacific-rpc.sepolia-testnet.manta.network/http",
        "https://pacific-rpc.testnet.manta.network/http", // Backup
      ],
    },
  },
  // ✅ Optimized settings for faster transactions
  blockExplorers: {
    default: {
      name: "Manta Pacific Explorer",
      url: "https://pacific-explorer.sepolia-testnet.manta.network/",
    },
  },
};

// ✅ Optimized wagmi config
const wagmiConfig = defaultWagmiConfig({
  chains: [mantaPacificTestnetOptimized],
  projectId,
  metadata,
  pollingInterval: 8000, // Reduced from 12000
  cacheTime: 20000, // Reduced from 30000
  // ✅ Add batch settings for better performance
  batch: {
    multicall: true,
  },
});

// 5. Create AppKit instance
createAppKit({
  projectId,
  wagmiConfig,
  defaultChain: mantaPacificTestnet,
  enableAnalytics: true,
  features: {
    email: true,
    socials: Platform.OS === "ios" ? ["apple"] : ["google"],
  },
});

// 6. Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10 * 1000,
    },
  },
});

export function WagmiWeb3ModalProvider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1 }}>
          {children}
          <AppKit />
        </View>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
