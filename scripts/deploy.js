/**
 * Complete Deployment Script for EduVerse Platform
 * Deploys all contracts and automatically exports ABIs
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function deployContract(contractName, ...args) {
  console.log(`\n🚀 Deploying ${contractName}...`);
  const ContractFactory = await ethers.getContractFactory(contractName);
  const contract = await ContractFactory.deploy(...args);
  await contract.waitForDeployment();
  console.log(`✅ ${contractName} deployed to: ${contract.target}`);
  return contract;
}

async function exportABIs(addresses) {
  console.log("\n📜 Exporting ABI files...");

  // Create directories
  const mobileAbiDir = path.join(__dirname, "../EduVerseApp/src/constants/abi");
  const frontendAbiDir = path.join(__dirname, "../frontend_website/eduverse/abis");

  [mobileAbiDir, frontendAbiDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  const contracts = ["CourseFactory", "CourseLicense", "ProgressTracker", "CertificateManager"];

  // Export each contract's ABI
  for (const contract of contracts) {
    try {
      const artifactPath = path.join(__dirname, `../artifacts/contracts/${contract}.sol/${contract}.json`);
      const artifact = require(artifactPath);
      const abiContent = JSON.stringify(artifact.abi, null, 2);

      // Export to both locations
      const mobileFilePath = path.join(mobileAbiDir, `${contract}.json`);
      const frontendFilePath = path.join(frontendAbiDir, `${contract}.json`);

      fs.writeFileSync(mobileFilePath, abiContent);
      fs.writeFileSync(frontendFilePath, abiContent);

      console.log(`✅ Exported ${contract} ABI to both mobile app and frontend`);
    } catch (error) {
      console.error(`❌ Failed to export ${contract}:`, error.message);
    }
  }

  // Export contract addresses
  const contractData = {
    networkName: addresses.network,
    chainId: addresses.chainId,
    deployer: addresses.deployer,
    deployDate: addresses.deployDate,
    addresses: {
      courseFactory: addresses.courseFactory,
      courseLicense: addresses.courseLicense,
      progressTracker: addresses.progressTracker,
      certificateManager: addresses.certificateManager,
    },
  };

  // Export to both mobile app and frontend
  const mobileAddressPath = path.join(mobileAbiDir, "contract-addresses.json");
  const frontendAddressPath = path.join(frontendAbiDir, "contract-addresses.json");

  fs.writeFileSync(mobileAddressPath, JSON.stringify(contractData, null, 2));
  fs.writeFileSync(frontendAddressPath, JSON.stringify(contractData, null, 2));

  console.log(`✅ Exported contract addresses to both locations`);

  // Create mobile app index file
  const indexContent = `// Auto-generated ABI exports
// Generated on: ${new Date().toISOString()}

${contracts.map(contract => `export { default as ${contract}ABI } from './${contract}.json';`).join("\n")}

export { default as ContractAddresses } from './contract-addresses.json';

// Contract names constant
export const CONTRACT_NAMES = {
${contracts.map(contract => `  ${contract.toUpperCase()}: '${contract}',`).join("\n")}
};

// ABI mapping for dynamic access
export const CONTRACT_ABIS = {
${contracts.map(contract => `  [CONTRACT_NAMES.${contract.toUpperCase()}]: ${contract}ABI,`).join("\n")}
};
`;

  const indexPath = path.join(mobileAbiDir, "index.js");
  fs.writeFileSync(indexPath, indexContent);
  console.log(`✅ Created index file for easy imports: ${indexPath}`);
}

async function updateMobileEnv(addresses) {
  console.log("\n📱 Updating mobile app environment variables...");

  const mobileEnvPath = path.join(__dirname, "../EduVerseApp/.env");
  let envContent = "";

  if (fs.existsSync(mobileEnvPath)) {
    envContent = fs.readFileSync(mobileEnvPath, "utf8");
  }

  const contractAddresses = {
    EXPO_PUBLIC_COURSE_FACTORY_ADDRESS: addresses.courseFactory,
    EXPO_PUBLIC_COURSE_LICENSE_ADDRESS: addresses.courseLicense,
    EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS: addresses.progressTracker,
    EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS: addresses.certificateManager,
    EXPO_PUBLIC_CHAIN_ID: addresses.chainId.toString(),
    EXPO_PUBLIC_NETWORK_NAME: addresses.network,
  };

  Object.entries(contractAddresses).forEach(([key, value]) => {
    if (!value) {
      console.warn(`⚠️ Warning: ${key} is empty or undefined`);
      return;
    }

    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  });

  envContent = envContent.replace(/\n\n+/g, "\n\n").trim();
  fs.writeFileSync(mobileEnvPath, envContent);

  console.log("✅ Mobile app .env file updated successfully!");
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

    // Auto-export ABIs and update environments
    await exportABIs(addresses);
    await updateMobileEnv(addresses);

    console.log("\n🎉 Complete deployment and setup finished successfully!");
    console.log("\n📋 Summary:");
    console.log(`  Network: ${addresses.network} (Chain ID: ${addresses.chainId})`);
    console.log(`  CourseFactory: ${addresses.courseFactory}`);
    console.log(`  CourseLicense: ${addresses.courseLicense}`);
    console.log(`  ProgressTracker: ${addresses.progressTracker}`);
    console.log(`  CertificateManager: ${addresses.certificateManager}`);
    console.log("\n✅ All ABIs exported and environments updated!");

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
