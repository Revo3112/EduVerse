/**
 * Complete Deployment Script for EduVerse Platform
 * Deploys all contracts and automatically exports ABIs
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ExportSystem } = require("./export-system");

async function deployContract(contractName, ...args) {
  console.log(`\n🚀 Deploying ${contractName}...`);
  const ContractFactory = await ethers.getContractFactory(contractName);
  const contract = await ContractFactory.deploy(...args);
  await contract.waitForDeployment();
  console.log(`✅ ${contractName} deployed to: ${contract.target}`);
  return contract;
}

async function main() {
  console.log("🚀 Starting Complete EduVerse Platform Deployment...");

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with address: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  try {
    // Deploy all contracts
    const courseFactory = await deployContract("CourseFactory");

    const courseLicense = await deployContract(
      "CourseLicense",
      courseFactory.target,
      deployer.address
    );

    const progressTracker = await deployContract(
      "ProgressTracker",
      courseFactory.target,
      courseLicense.target
    );

    const certificateManager = await deployContract(
      "CertificateManager",
      courseFactory.target,
      progressTracker.target,
      deployer.address
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

    fs.writeFileSync("deployed-contracts.json", JSON.stringify(addresses, null, 2));
    console.log("\n💾 Contract addresses saved to deployed-contracts.json");

    // Auto-export ABIs and update environments using unified system
    const exportSystem = new ExportSystem();
    await exportSystem.export({ target: "all" });

    console.log("\n🎉 Complete deployment and setup finished successfully!");
    console.log("\n📋 Summary:");
    console.log(`  Network: ${addresses.network} (Chain ID: ${addresses.chainId})`);
    console.log(`  CourseFactory: ${addresses.courseFactory}`);
    console.log(`  CourseLicense: ${addresses.courseLicense}`);
    console.log(`  ProgressTracker: ${addresses.progressTracker}`);
    console.log(`  CertificateManager: ${addresses.certificateManager}`);
    console.log("\n✅ All ABIs exported and environments updated using unified system!");

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
