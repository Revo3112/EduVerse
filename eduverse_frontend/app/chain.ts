import { defineChain } from "thirdweb";

// Define a chain object for Manta Pacific Sepolia Testnet
export const chain = defineChain({
  id: 3441006, // Chain ID for Manta Pacific Sepolia Testnet
  rpc: "https://3441006.rpc.thirdweb.com", // RPC URL
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
});
