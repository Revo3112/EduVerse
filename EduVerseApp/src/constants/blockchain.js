// src/constants/blockchain.js - Fixed Configuration
import { defineChain } from "viem";

export const mantaPacificTestnet = defineChain({
  id: 3441006,
  name: "Manta Pacific Testnet",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
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
  testnet: true,
});

export const BLOCKCHAIN_CONFIG = {
  CHAIN_ID: mantaPacificTestnet.id,
  RPC_URL: mantaPacificTestnet.rpcUrls.default.http[0],
  CHAIN_NAME: mantaPacificTestnet.name,
  NATIVE_CURRENCY_SYMBOL: mantaPacificTestnet.nativeCurrency.symbol,
  BLOCK_EXPLORER_URL: mantaPacificTestnet.blockExplorers.default.url,

  // Contract addresses
  CONTRACTS: {
    courseFactory: process.env.EXPO_PUBLIC_COURSE_FACTORY_ADDRESS,
    courseLicense: process.env.EXPO_PUBLIC_COURSE_LICENSE_ADDRESS,
    progressTracker: process.env.EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS,
    certificateManager: process.env.EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS,
    platformRegistry: process.env.EXPO_PUBLIC_PLATFORM_REGISTRY_ADDRESS,
    mockV3Aggregator: process.env.EXPO_PUBLIC_MOCK_V3_AGGREGATOR_ADDRESS,
  },
};
