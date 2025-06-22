// src/constants/blockchain.js
import { defineChain } from "viem";

export const mantaPacificTestnet = defineChain({
  id: 3441006,
  name: "Manta Pacific Testnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://pacific-rpc.sepolia-testnet.manta.network/http"],
    },
  },
  blockExplorers: {
    default: {
      name: "Manta Pacific Explorer",
      url: "https://pacific-explorer.sepolia-testnet.manta.network/",
    },
  },
  contracts: {
    courseFactory: {
      address: process.env.EXPO_PUBLIC_COURSE_FACTORY_ADDRESS,
    },
    courseLicense: {
      address: process.env.EXPO_PUBLIC_COURSE_LICENSE_ADDRESS,
    },
    progressTracker: {
      address: process.env.EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS,
    },
    certificateManager: {
      address: process.env.EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS,
    },
    platformRegistry: {
      address: process.env.EXPO_PUBLIC_PLATFORM_REGISTRY_ADDRESS,
    },
    mockV3Aggregator: {
      address: process.env.EXPO_PUBLIC_MOCK_V3_AGGREGATOR_ADDRESS,
    },
  },
});

export const BLOCKCHAIN_CONFIG = {
  CHAIN_ID: mantaPacificTestnet.id,
  RPC_URL: mantaPacificTestnet.rpcUrls.default.http[0],
  CHAIN_NAME: mantaPacificTestnet.name,
  NATIVE_CURRENCY_SYMBOL: mantaPacificTestnet.nativeCurrency.symbol,
  BLOCK_EXPLORER_URL: mantaPacificTestnet.blockExplorers.default.url,
};
