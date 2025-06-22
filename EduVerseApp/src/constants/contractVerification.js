// Contract Setup Verification Test
import {
  CONTRACT_NAMES,
  CONTRACT_ABIS,
  getContractAddress,
  getContractABI,
  validateContractSetup,
  ADDRESSES,
} from "./abi/contracts";
import { mantaPacificTestnet, BLOCKCHAIN_CONFIG } from "./blockchain";

// Test all contract setup
export const runContractVerification = () => {
  console.log("🔍 Running EduVerse Contract Verification...\n");

  // 1. Test Network Configuration
  console.log("📡 Network Configuration:");
  console.log(`  ✅ Network: ${BLOCKCHAIN_CONFIG.CHAIN_NAME}`);
  console.log(`  ✅ Chain ID: ${BLOCKCHAIN_CONFIG.CHAIN_ID}`);
  console.log(`  ✅ RPC URL: ${BLOCKCHAIN_CONFIG.RPC_URL}`);
  console.log(`  ✅ Explorer: ${BLOCKCHAIN_CONFIG.BLOCK_EXPLORER_URL}\n`);

  // 2. Test Contract Validation
  console.log("📋 Contract Validation:");
  const validation = validateContractSetup();
  console.log(`  ✅ Total Contracts: ${validation.totalContracts}`);
  console.log(`  ✅ Available Contracts: ${validation.availableContracts}`);
  console.log(`  ✅ Setup Valid: ${validation.isValid}`);

  if (validation.missingContracts.length > 0) {
    console.log(
      `  ⚠️ Missing Contracts: ${validation.missingContracts.join(", ")}`
    );
  }
  console.log("");

  // 3. Test Individual Contract Addresses
  console.log("📍 Contract Addresses:");
  Object.entries(ADDRESSES).forEach(([name, address]) => {
    if (address && address !== "0x...") {
      console.log(`  ✅ ${name}: ${address}`);
    } else {
      console.log(`  ⚠️ ${name}: Not deployed`);
    }
  });
  console.log("");

  // 4. Test ABI Availability
  console.log("📜 ABI Availability:");
  Object.values(CONTRACT_NAMES).forEach((contractName) => {
    try {
      const abi = getContractABI(contractName);
      console.log(`  ✅ ${contractName}: ${abi.length} functions/events`);
    } catch (error) {
      console.log(`  ❌ ${contractName}: ABI not found`);
    }
  });
  console.log("");
  // 5. Test Contract Summary
  console.log("📊 Contract Summary:");
  console.log(`  ✅ Network: ${mantaPacificTestnet.name}`);
  console.log(`  ✅ Chain ID: ${mantaPacificTestnet.id}`);
  console.log(
    `  ✅ Explorer: ${mantaPacificTestnet.blockExplorers.default.url}`
  );
  console.log(`  ✅ All contracts configured: ${validation.isValid}`);
  console.log("");

  // 6. Environment Variables Check
  console.log("🔧 Environment Variables:");
  const requiredEnvs = [
    "EXPO_PUBLIC_THIRDWEB_CLIENT_ID",
    "EXPO_PUBLIC_COURSE_FACTORY_ADDRESS",
    "EXPO_PUBLIC_COURSE_LICENSE_ADDRESS",
    "EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS",
    "EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS",
    "EXPO_PUBLIC_PLATFORM_REGISTRY_ADDRESS",
    "EXPO_PUBLIC_MOCK_V3_AGGREGATOR_ADDRESS",
    "EXPO_PUBLIC_CHAIN_ID",
  ];

  requiredEnvs.forEach((envVar) => {
    const value = process.env[envVar];
    if (value && value !== "undefined") {
      console.log(`  ✅ ${envVar}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`  ❌ ${envVar}: Not set`);
    }
  });

  console.log("\n🎉 Contract verification completed!");
  return {
    networkValid: !!BLOCKCHAIN_CONFIG.CHAIN_NAME,
    contractsValid: validation.isValid,
    abisValid: Object.values(CONTRACT_NAMES).every((name) => {
      try {
        getContractABI(name);
        return true;
      } catch {
        return false;
      }
    }),
    addressesValid: Object.values(ADDRESSES).some(
      (addr) => addr && addr !== "0x..."
    ),
  };
};

// Quick health check
export const healthCheck = () => {
  const results = runContractVerification();
  const allValid = Object.values(results).every(Boolean);

  console.log(
    `\n🏥 Health Check: ${allValid ? "✅ HEALTHY" : "❌ ISSUES FOUND"}`
  );

  return {
    status: allValid ? "healthy" : "unhealthy",
    details: results,
  };
};
