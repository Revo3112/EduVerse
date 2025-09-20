/**
 * Comprehensive Verification Script
 * Handles both verification on block explorer and ABI consistency checks
 */

const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function verifyContract(address, constructorArgs, contractName) {
  console.log(`\n🔍 Verifying ${contractName} at ${address}...`);
  try {
    await run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ ${contractName} verified successfully`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`✅ ${contractName} is already verified`);
      return true;
    } else {
      console.log(`⚠️ ${contractName} verification failed:`, error.message);
      return false;
    }
  }
}

async function verifyBlockchainContracts() {
  console.log("🔍 Starting blockchain contract verification...");

  try {
    // Load contract addresses
    const addressFile = "deployed-contracts.json";

    if (!fs.existsSync(addressFile)) {
      throw new Error("deployed-contracts.json not found. Please deploy contracts first.");
    }

    const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));
    console.log(`Verifying contracts on ${addresses.network} (Chain ID: ${addresses.chainId})...`);

    // Check if we're on the correct network
    const currentNetwork = network.name;
    const targetNetwork = addresses.network;

    console.log(`Current network: ${currentNetwork}`);
    console.log(`Target network: ${targetNetwork}`);

    if (currentNetwork === "hardhat" && targetNetwork !== "hardhat") {
      console.log(`⚠️ Network mismatch: Currently on 'hardhat' but contracts deployed on '${targetNetwork}'`);
      console.log(`ℹ️ Skipping blockchain verification. To verify, run with correct network:`);
      console.log(`   npx hardhat run scripts/verify-comprehensive.js --network ${targetNetwork}`);

      return {
        courseFactory: false,
        courseLicense: false,
        progressTracker: false,
        certificateManager: false,
        skipped: true,
        reason: `Network mismatch: contracts on ${targetNetwork}, script running on ${currentNetwork}`
      };
    }

    // If networks match or we're using correct network, proceed with verification
    if (currentNetwork !== targetNetwork && currentNetwork !== "hardhat") {
      console.log(`⚠️ Warning: Running on '${currentNetwork}' but contracts deployed on '${targetNetwork}'`);
    }

    const verificationResults = {};

    // Verify CourseFactory (no constructor args)
    verificationResults.courseFactory = await verifyContract(
      addresses.courseFactory,
      [], // No constructor arguments
      "CourseFactory"
    );

    // Verify CourseLicense (2 args: courseFactory address, platform wallet)
    verificationResults.courseLicense = await verifyContract(
      addresses.courseLicense,
      [addresses.courseFactory, addresses.deployer],
      "CourseLicense"
    );

    // Verify ProgressTracker (2 args: courseFactory, courseLicense)
    verificationResults.progressTracker = await verifyContract(
      addresses.progressTracker,
      [addresses.courseFactory, addresses.courseLicense],
      "ProgressTracker"
    );

    // Verify CertificateManager (3 args: courseFactory, progressTracker, platform wallet)
    verificationResults.certificateManager = await verifyContract(
      addresses.certificateManager,
      [addresses.courseFactory, addresses.progressTracker, addresses.deployer],
      "CertificateManager"
    );

    return verificationResults;

  } catch (error) {
    console.error("\n❌ Blockchain verification failed:", error.message);
    throw error;
  }
}async function verifyABIConsistency() {
  console.log("\n🔍 Starting ABI consistency verification...");

  try {
    // Load contract definitions
    const deployedContracts = JSON.parse(fs.readFileSync('deployed-contracts.json', 'utf8'));
    const CONTRACTS = {
      CourseFactory: {
        name: 'CourseFactory',
        address: deployedContracts.courseFactory,
        key: 'courseFactory'
      },
      CourseLicense: {
        name: 'CourseLicense',
        address: deployedContracts.courseLicense,
        key: 'courseLicense'
      },
      ProgressTracker: {
        name: 'ProgressTracker',
        address: deployedContracts.progressTracker,
        key: 'progressTracker'
      },
      CertificateManager: {
        name: 'CertificateManager',
        address: deployedContracts.certificateManager,
        key: 'certificateManager'
      }
    };

    const results = {
      mobileApp: { hasAllContracts: true, addressesMatch: true, abiFilesExist: true },
      frontend: { hasAllContracts: true, addressesMatch: true, abiFilesExist: true },
      consistency: { addressesConsistent: true, networkConsistent: true, chainIdConsistent: true }
    };

    // Verify mobile app
    const mobileAbiPath = 'EduVerseApp/src/constants/abi/';
    const mobileAddresses = JSON.parse(fs.readFileSync('EduVerseApp/src/constants/abi/contract-addresses.json', 'utf8'));

    for (const [key, contract] of Object.entries(CONTRACTS)) {
      const abiPath = path.join(mobileAbiPath, `${contract.name}.json`);
      const address = mobileAddresses.addresses[contract.key];

      if (!fs.existsSync(abiPath)) {
        results.mobileApp.abiFilesExist = false;
        console.error(`❌ Missing ABI: ${contract.name}.json in mobile app`);
      }

      if (address !== contract.address) {
        results.mobileApp.addressesMatch = false;
        console.error(`❌ Address mismatch for ${contract.name}: expected ${contract.address}, got ${address}`);
      }
    }

    // Verify frontend
    const frontendAbiPath = 'eduweb/abis/';
    const frontendAddresses = JSON.parse(fs.readFileSync('eduweb/abis/contract-addresses.json', 'utf8'));

    for (const [key, contract] of Object.entries(CONTRACTS)) {
      const abiPath = path.join(frontendAbiPath, `${contract.name}.json`);
      const address = frontendAddresses.addresses[contract.key];

      if (!fs.existsSync(abiPath)) {
        results.frontend.abiFilesExist = false;
        console.error(`❌ Missing ABI: ${contract.name}.json in frontend`);
      }

      if (address !== contract.address) {
        results.frontend.addressesMatch = false;
        console.error(`❌ Address mismatch for ${contract.name}: expected ${contract.address}, got ${address}`);
      }
    }

    // Check consistency between mobile app and frontend
    for (const [key, contract] of Object.entries(CONTRACTS)) {
      const mobileAddr = mobileAddresses.addresses[contract.key];
      const frontendAddr = frontendAddresses.addresses[contract.key];

      if (mobileAddr !== frontendAddr) {
        results.consistency.addressesConsistent = false;
        console.error(`❌ Address inconsistency for ${contract.name}: mobile=${mobileAddr}, frontend=${frontendAddr}`);
      }
    }

    if (mobileAddresses.networkName !== frontendAddresses.networkName) {
      results.consistency.networkConsistent = false;
    }

    if (mobileAddresses.chainId !== frontendAddresses.chainId) {
      results.consistency.chainIdConsistent = false;
    }

    return results;

  } catch (error) {
    console.error("\n❌ ABI consistency verification failed:", error.message);
    throw error;
  }
}

async function main() {
  console.log("🔍 Starting Comprehensive Verification Process...");
  console.log("================================================");

  try {
    // 1. Verify contracts on blockchain
    const blockchainResults = await verifyBlockchainContracts();

    // 2. Verify ABI consistency
    const abiResults = await verifyABIConsistency();

    // 3. Generate comprehensive report
    console.log("\n📊 Comprehensive Verification Results:");
    console.log("======================================");

    console.log("\n🔗 Blockchain Verification:");
    if (blockchainResults.skipped) {
      console.log(`  ⚠️ Skipped: ${blockchainResults.reason}`);
    } else {
      Object.entries(blockchainResults).forEach(([contract, verified]) => {
        if (contract !== 'skipped' && contract !== 'reason') {
          console.log(`  ${contract}: ${verified ? '✅ Verified' : '❌ Failed'}`);
        }
      });
    }

    console.log("\n📱 Mobile App ABI:");
    console.log(`  ABI Files Exist: ${abiResults.mobileApp.abiFilesExist ? '✅' : '❌'}`);
    console.log(`  Addresses Match: ${abiResults.mobileApp.addressesMatch ? '✅' : '❌'}`);

    console.log("\n🌐 Frontend ABI:");
    console.log(`  ABI Files Exist: ${abiResults.frontend.abiFilesExist ? '✅' : '❌'}`);
    console.log(`  Addresses Match: ${abiResults.frontend.addressesMatch ? '✅' : '❌'}`);

    console.log("\n🔄 Consistency Check:");
    console.log(`  Addresses Consistent: ${abiResults.consistency.addressesConsistent ? '✅' : '❌'}`);
    console.log(`  Network Consistent: ${abiResults.consistency.networkConsistent ? '✅' : '❌'}`);
    console.log(`  Chain ID Consistent: ${abiResults.consistency.chainIdConsistent ? '✅' : '❌'}`);

    // Overall status
    const allBlockchainVerified = blockchainResults.skipped ? true : Object.values(blockchainResults)
      .filter((_, i, arr) => arr.indexOf('skipped') === -1 && arr.indexOf('reason') === -1)
      .every(result => result);
    const allABIsGood = abiResults.mobileApp.abiFilesExist &&
                       abiResults.mobileApp.addressesMatch &&
                       abiResults.frontend.abiFilesExist &&
                       abiResults.frontend.addressesMatch &&
                       abiResults.consistency.addressesConsistent;

    console.log("\n🎯 Overall Status:");
    if (blockchainResults.skipped) {
      console.log(`  Blockchain Verification: ⚠️ SKIPPED (${blockchainResults.reason})`);
    } else {
      console.log(`  Blockchain Verification: ${allBlockchainVerified ? '✅ PASSED' : '❌ FAILED'}`);
    }
    console.log(`  ABI Consistency: ${allABIsGood ? '✅ PASSED' : '❌ FAILED'}`);

    if ((blockchainResults.skipped || allBlockchainVerified) && allABIsGood) {
      console.log("\n🎉 All available verifications passed successfully!");
      if (blockchainResults.skipped) {
        console.log(`ℹ️ To verify contracts on blockchain, run with correct network parameter.`);
      }
    } else {
      console.log("\n⚠️ Some verifications failed. Please review the details above.");
    }

  } catch (error) {
    console.error("\n❌ Verification process failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
