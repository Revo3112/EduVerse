/**
 * Network Helper Script
 * Provides utilities for network management and validation
 */

const { network } = require("hardhat");
const fs = require("fs");
const { PATHS } = require("./core/system");

// Network configurations based on Manta Pacific documentation
const NETWORK_CONFIGS = {
  mantaPacificTestnet: {
    name: "mantaPacificTestnet",
    displayName: "Manta Pacific Sepolia Testnet",
    chainId: 3441006,
    rpcUrl: "https://pacific-rpc.sepolia-testnet.manta.network/http",
    explorerUrl: "https://pacific-explorer.sepolia-testnet.manta.network",
    explorerApiUrl: "https://pacific-explorer.sepolia-testnet.manta.network/api",
    currency: "ETH"
  }
};

function getCurrentNetwork() {
  return {
    name: network.name,
    config: network.config,
    details: NETWORK_CONFIGS[network.name] || null
  };
}

function getDeployedContractsNetwork() {
  try {
    if (!fs.existsSync(PATHS.deployedContracts)) {
      return null;
    }

    const deployed = JSON.parse(fs.readFileSync(PATHS.deployedContracts, "utf8"));
    return {
      name: deployed.network,
      chainId: deployed.chainId,
      details: NETWORK_CONFIGS[deployed.network] || null
    };
  } catch (error) {
    console.error("Error reading deployed contracts:", error.message);
    return null;
  }
}

function validateNetworkCompatibility() {
  const current = getCurrentNetwork();
  const deployed = getDeployedContractsNetwork();

  if (!deployed) {
    return {
      compatible: false,
      reason: "No deployed contracts found",
      recommendation: "Deploy contracts first using: npx hardhat run scripts/deploy.js --network <network>"
    };
  }

  if (current.name === "hardhat" && deployed.name !== "hardhat") {
    return {
      compatible: false,
      reason: `Running on '${current.name}' but contracts deployed on '${deployed.name}'`,
      recommendation: `Use: npx hardhat run <script> --network ${deployed.name}`
    };
  }

  if (current.name !== deployed.name && current.name !== "hardhat") {
    return {
      compatible: false,
      reason: `Network mismatch: current '${current.name}' vs deployed '${deployed.name}'`,
      recommendation: `Switch to correct network: --network ${deployed.name}`
    };
  }

  return {
    compatible: true,
    reason: `Networks match: ${current.name}`,
    recommendation: null
  };
}

function displayNetworkInfo() {
  const current = getCurrentNetwork();
  const deployed = getDeployedContractsNetwork();
  const compatibility = validateNetworkCompatibility();

  console.log("🌐 Network Information:");
  console.log("=====================");

  console.log(`\n📡 Current Network: ${current.name}`);
  if (current.details) {
    console.log(`   Display Name: ${current.details.displayName}`);
    console.log(`   Chain ID: ${current.details.chainId}`);
    console.log(`   RPC URL: ${current.details.rpcUrl}`);
    if (current.details.explorerUrl) {
      console.log(`   Explorer: ${current.details.explorerUrl}`);
    }
  }

  if (deployed) {
    console.log(`\n🚀 Deployed Contracts Network: ${deployed.name}`);
    console.log(`   Chain ID: ${deployed.chainId}`);
    if (deployed.details) {
      console.log(`   Display Name: ${deployed.details.displayName}`);
      if (deployed.details.explorerUrl) {
        console.log(`   Explorer: ${deployed.details.explorerUrl}`);
      }
    }
  } else {
    console.log("\n⚠️ No deployed contracts found");
  }

  console.log(`\n🔗 Compatibility: ${compatibility.compatible ? '✅ Compatible' : '❌ Incompatible'}`);
  console.log(`   Reason: ${compatibility.reason}`);
  if (compatibility.recommendation) {
    console.log(`   Recommendation: ${compatibility.recommendation}`);
  }

  return { current, deployed, compatibility };
}

function getNetworkCommand(scriptName) {
  const deployed = getDeployedContractsNetwork();
  if (!deployed || deployed.name === "hardhat") {
    return `node scripts/${scriptName}`;
  }
  return `npx hardhat run scripts/${scriptName} --network ${deployed.name}`;
}

function suggestCorrectCommand(scriptName) {
  const compatibility = validateNetworkCompatibility();

  if (compatibility.compatible) {
    return null;
  }

  const deployed = getDeployedContractsNetwork();
  if (!deployed) {
    return "npx hardhat run scripts/deploy.js --network mantaPacificTestnet";
  }

  return `npx hardhat run scripts/${scriptName} --network ${deployed.name}`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    displayNetworkInfo();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'info':
      displayNetworkInfo();
      break;
    case 'check':
      const compatibility = validateNetworkCompatibility();
      if (compatibility.compatible) {
        console.log("✅ Network configuration is correct");
        process.exit(0);
      } else {
        console.log("❌ Network configuration issue:");
        console.log(`   ${compatibility.reason}`);
        console.log(`   ${compatibility.recommendation}`);
        process.exit(1);
      }
      break;
    case 'suggest':
      const scriptName = args[1] || 'verify-comprehensive.js';
      const suggestion = suggestCorrectCommand(scriptName);
      if (suggestion) {
        console.log(`💡 Suggested command: ${suggestion}`);
      } else {
        console.log("✅ Current configuration is correct");
      }
      break;
    default:
      console.log("Usage:");
      console.log("  node scripts/network-helper.js info     - Show network information");
      console.log("  node scripts/network-helper.js check    - Check network compatibility");
      console.log("  node scripts/network-helper.js suggest <script> - Suggest correct command");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  NETWORK_CONFIGS,
  getCurrentNetwork,
  getDeployedContractsNetwork,
  validateNetworkCompatibility,
  displayNetworkInfo,
  getNetworkCommand,
  suggestCorrectCommand
};
