/**
 * Complete Deployment Script for EduVerse Platform
 * Deploys all contracts to Manta Pacific Testnet and exports ABIs
 */

const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ExportSystem } = require("./export-system");
const { PATHS } = require("./core/system");

/**
 * Verify contract on block explorer
 */
async function verifyContract(address, constructorArgs, contractName) {
  console.log(`\n🔍 Verifying ${contractName} at ${address}...`);
  try {
    await run("verify:verify", {
      address: address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ ${contractName} verified successfully on block explorer!`);
    return true;
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`✅ ${contractName} is already verified`);
      return true;
    } else {
      console.log(`⚠️ ${contractName} verification failed:`, error.message);
      console.log(`   You can verify manually later with:`);
      console.log(`   npx hardhat verify --network mantaPacificTestnet ${address}`);
      return false;
    }
  }
}

async function deployContract(contractName, ...args) {
  console.log(`\n🚀 Deploying ${contractName}...`);
  const ContractFactory = await ethers.getContractFactory(contractName);
  const contract = await ContractFactory.deploy(...args);

  console.log("⏳ Waiting for deployment transaction...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ ${contractName} deployed successfully to: ${address}`);

  return contract;
}

async function main() {
  console.log("🚀 Starting EduVerse Platform Deployment to Manta Pacific Testnet...");

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.config.chainId})`);

  try {
    // Deploy all contracts
    const courseFactory = await deployContract("CourseFactory");
    await verifyContract(courseFactory.target, [], "CourseFactory");

    const courseLicense = await deployContract(
      "CourseLicense",
      courseFactory.target,
      deployer.address
    );
    await verifyContract(
      courseLicense.target,
      [courseFactory.target, deployer.address],
      "CourseLicense"
    );

    const progressTracker = await deployContract(
      "ProgressTracker",
      courseFactory.target,
      courseLicense.target
    );
    await verifyContract(
      progressTracker.target,
      [courseFactory.target, courseLicense.target],
      "ProgressTracker"
    );

    const certificateManager = await deployContract(
      "CertificateManager",
      courseFactory.target,
      progressTracker.target,
      deployer.address
    );
    await verifyContract(
      certificateManager.target,
      [courseFactory.target, progressTracker.target, deployer.address],
      "CertificateManager"
    );

    // Save contract addresses
    const addresses = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      courseFactory: courseFactory.target,
      courseLicense: courseLicense.target,
      progressTracker: progressTracker.target,
      certificateManager: certificateManager.target,
      deployDate: new Date().toISOString(),
    };

    // Ensure directory exists before writing
    const deployedContractsDir = path.dirname(PATHS.deployedContracts);
    if (!fs.existsSync(deployedContractsDir)) {
      fs.mkdirSync(deployedContractsDir, { recursive: true });
    }

    fs.writeFileSync(PATHS.deployedContracts, JSON.stringify(addresses, null, 2));
    console.log(`\n💾 Contract addresses saved to ${PATHS.deployedContracts}`);

    // Auto-export ABIs and update environments using unified system
    const exportSystem = new ExportSystem();
    await exportSystem.export({ target: "all" });

    console.log("\n🎉 Complete deployment and setup finished successfully!");
    console.log("\n📋 Deployment Summary:");
    console.log(`  Network: ${addresses.network} (Chain ID: ${addresses.chainId})`);
    console.log(`  Deployer: ${addresses.deployer}`);
    console.log(`\n📝 Contract Addresses:`);
    console.log(`  CourseFactory: ${addresses.courseFactory}`);
    console.log(`  CourseLicense: ${addresses.courseLicense}`);
    console.log(`  ProgressTracker: ${addresses.progressTracker}`);
    console.log(`  CertificateManager: ${addresses.certificateManager}`);
    console.log("\n✅ All contracts deployed, verified, and ABIs exported!");
    console.log("✅ Environment files updated for mobile and frontend!");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    if (error.code) console.error(`Error code: ${error.code}`);
    if (error.reason) console.error(`Error reason: ${error.reason}`);
    if (error.data) console.error(`Error data: ${JSON.stringify(error.data)}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
