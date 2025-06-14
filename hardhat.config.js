require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

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
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
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
