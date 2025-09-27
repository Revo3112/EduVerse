require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat/config");

/** @type import('hardhat/config').HardhatUserConfig */

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200  // Nilai rendah (misal 50-200) akan mengoptimalkan ukuran kontrak
      },
      viaIR: true  // Enable Intermediate Representation to fix "Stack too deep" errors
    },
  },
  networks: {
    mantaPacificTestnet: {
      url: "https://pacific-rpc.sepolia-testnet.manta.network/http",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 3441006,
    },
  },
  etherscan: {
    apiKey: {
      mantaPacificTestnet: "any",
    },
    customChains: [
      {
        network: "mantaPacificTestnet",
        chainId: 3441006,
        urls: {
          apiURL: "https://pacific-explorer.sepolia-testnet.manta.network/api",
          browserURL: "https://pacific-explorer.sepolia-testnet.manta.network",
        },
      },
    ],
  },
};
