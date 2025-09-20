import { defineChain } from "thirdweb";

// Manta Pacific Testnet configuration (matching EduVerse setup)
export const mantaPacificTestnet = defineChain({
  id: 3441006,
  name: "Manta Pacific Testnet",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: "https://pacific-rpc.sepolia-testnet.manta.network/http",
  blockExplorers: [
    {
      name: "Manta Pacific Explorer",
      url: "https://pacific-explorer.sepolia-testnet.manta.network",
    },
  ],
  testnet: true,
});

// Export as default chain for EduVerse
export const chain = mantaPacificTestnet;
