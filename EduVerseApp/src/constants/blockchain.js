// src/constants/blockchain.js
import { defineChain } from "viem";

// Manta Pacific Sepolia Testnet configuration
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

// Contract addresses - UPDATE THESE AFTER DEPLOYMENT
export const BLOCKCHAIN_CONFIG = {
  CONTRACTS: {
    courseFactory:
      process.env.EXPO_PUBLIC_COURSE_FACTORY_ADDRESS ||
      "0x58052b96b05fFbE5ED31C376E7762b0F6051e15A",
    courseLicense:
      process.env.EXPO_PUBLIC_COURSE_LICENSE_ADDRESS ||
      "0x32b235fDabbcF4575aF259179e30a228b1aC72a9",
    progressTracker:
      process.env.EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS ||
      "0x6e3B6FbE90Ae4fca8Ff5eB207A61193ef204FA18",
    certificateManager:
      process.env.EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS ||
      "0x857e484cd949888736d71C0EfC7D981897Df3e61",
  },
  IPFS: {
    gateway: "https://gateway.pinata.cloud/ipfs/",
  },
  MAX_COURSE_PRICE_ETH: "0.002", // Maximum allowed price in ETH
  CERTIFICATE_FEE_ETH: "0.001", // Default certificate fee
  PLATFORM_FEE_PERCENTAGE: 2, // 2% platform fee
};

// Wagmi configuration
export const WAGMI_CONFIG = {
  chains: [mantaPacificTestnet],
  transports: {
    [mantaPacificTestnet.id]: {
      http: mantaPacificTestnet.rpcUrls.default.http[0],
    },
  },
};

// Helper function to format IPFS URLs
export const getIPFSUrl = (cid) => {
  if (!cid) return "";
  if (cid.startsWith("http")) return cid;
  return `${BLOCKCHAIN_CONFIG.IPFS.gateway}${cid}`;
};

// Helper function to validate ETH address
export const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Helper function to truncate address for display
export const truncateAddress = (address, startLength = 6, endLength = 4) => {
  if (!address) return "";
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

export default BLOCKCHAIN_CONFIG;
