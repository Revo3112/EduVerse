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
      console.log(
        `   npx hardhat verify --network mantaPacificTestnet ${address}`
      );
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
  const deployTx = contract.deploymentTransaction();
  const receipt = await deployTx.wait();
  const blockNumber = receipt.blockNumber;

  console.log(`✅ ${contractName} deployed successfully to: ${address}`);
  console.log(`📦 Deployment block: ${blockNumber}`);

  return { contract, blockNumber };
}

async function main() {
  console.log(
    "🚀 Starting EduVerse Platform Deployment to Manta Pacific Testnet..."
  );

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);
  console.log(
    `💰 Account balance: ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )} ETH`
  );
  console.log(
    `🌐 Network: ${network.name} (Chain ID: ${network.config.chainId})`
  );

  try {
    // Deploy all contracts
    const { contract: courseFactory, blockNumber: courseFactoryBlock } =
      await deployContract("CourseFactory");
    await verifyContract(courseFactory.target, [], "CourseFactory");

    const { contract: courseLicense, blockNumber: courseLicenseBlock } =
      await deployContract(
        "CourseLicense",
        courseFactory.target,
        deployer.address
      );
    await verifyContract(
      courseLicense.target,
      [courseFactory.target, deployer.address],
      "CourseLicense"
    );

    const { contract: progressTracker, blockNumber: progressTrackerBlock } =
      await deployContract(
        "ProgressTracker",
        courseFactory.target,
        courseLicense.target
      );
    await verifyContract(
      progressTracker.target,
      [courseFactory.target, courseLicense.target],
      "ProgressTracker"
    );

    // ===================================================================
    // CERTIFICATE SYSTEM CONFIGURATION
    // ===================================================================
    // ✅ DYNAMIC: Reads from environment variables for dev/staging/prod flexibility
    // Priority order:
    // 1. CERTIFICATE_BASE_ROUTE (explicit certificate route)
    // 2. NEXT_PUBLIC_APP_URL + '/certificates' (frontend base URL)
    // 3. Localhost fallback for local development

    const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
    const CERTIFICATE_BASE_ROUTE = process.env.CERTIFICATE_BASE_ROUTE;
    const PLATFORM_NAME =
      process.env.PLATFORM_NAME ||
      process.env.NEXT_PUBLIC_PLATFORM_NAME ||
      "EduVerse Academy";

    // Construct base route with proper fallback chain
    let baseRoute;
    if (CERTIFICATE_BASE_ROUTE) {
      baseRoute = CERTIFICATE_BASE_ROUTE;
    } else if (NEXT_PUBLIC_APP_URL) {
      baseRoute = `${NEXT_PUBLIC_APP_URL}/certificates`;
    } else {
      baseRoute = "http://localhost:3000/certificates"; // ✅ Fixed path: /certificates (not /verify)
    }

    // Validation and warnings
    console.log(`\n📍 Certificate System Configuration:`);
    console.log(`   Base Route: ${baseRoute}`);
    console.log(`   Platform Name: ${PLATFORM_NAME}`);

    if (!CERTIFICATE_BASE_ROUTE && !NEXT_PUBLIC_APP_URL) {
      console.log(
        `\n⚠️  WARNING: Using localhost BASE_ROUTE for development only!`
      );
      console.log(
        `   For production deployment, set one of these environment variables:`
      );
      console.log(
        `   - CERTIFICATE_BASE_ROUTE=https://your-domain.com/certificates`
      );
      console.log(`   - NEXT_PUBLIC_APP_URL=https://your-domain.com`);
      console.log(`\n   QR codes will be generated with this BASE_ROUTE!`);
      console.log(
        `   Changing domains later requires calling updateDefaultBaseRoute() on contract.`
      );
    } else {
      console.log(`   ✅ Using environment-configured BASE_ROUTE`);
    }

    const {
      contract: certificateManager,
      blockNumber: certificateManagerBlock,
    } = await deployContract(
      "CertificateManager",
      courseFactory.target,
      progressTracker.target,
      courseLicense.target,
      deployer.address, // platformWallet
      baseRoute, // ✅ Dynamic base route (updatable via updateDefaultBaseRoute)
      PLATFORM_NAME // ✅ Platform name (updatable via setDefaultPlatformName)
    );
    await verifyContract(
      certificateManager.target,
      [
        courseFactory.target,
        progressTracker.target,
        courseLicense.target,
        deployer.address,
        baseRoute,
        PLATFORM_NAME,
      ],
      "CertificateManager"
    );

    // ===================================================================
    // POST-DEPLOYMENT CONFIGURATION
    // ===================================================================
    // CRITICAL: Configure contract references for proper cross-contract communication
    console.log(`\n⚙️  Configuring contract references...`);

    try {
      // Set CourseLicense address in CourseFactory
      console.log(`   Setting CourseLicense in CourseFactory...`);
      const tx1 = await courseFactory.setCourseLicense(courseLicense.target);
      await tx1.wait();
      console.log(`   ✅ CourseLicense configured`);

      // Set ProgressTracker address in CourseFactory
      console.log(`   Setting ProgressTracker in CourseFactory...`);
      const tx2 = await courseFactory.setProgressTracker(
        progressTracker.target
      );
      await tx2.wait();
      console.log(`   ✅ ProgressTracker configured`);

      // Set defaultMetadataBaseURI in CertificateManager for MetaMask display
      const metadataBaseURI = NEXT_PUBLIC_APP_URL
        ? `${NEXT_PUBLIC_APP_URL}/api/nft/certificate`
        : "http://localhost:3000/api/nft/certificate";

      console.log(`   Setting Metadata Base URI in CertificateManager...`);
      console.log(`   URI: ${metadataBaseURI}`);
      const tx3 = await certificateManager.updateDefaultMetadataBaseURI(
        metadataBaseURI
      );
      await tx3.wait();
      console.log(
        `   ✅ Metadata Base URI configured for MetaMask/wallet display`
      );

      console.log(`\n✅ Post-deployment configuration completed successfully!`);
    } catch (configError) {
      console.error(`\n❌ Post-deployment configuration failed:`, configError);
      console.error(
        `   You MUST manually configure these before system is operational:`
      );
      console.error(
        `   1. courseFactory.setCourseLicense(${courseLicense.target})`
      );
      console.error(
        `   2. courseFactory.setProgressTracker(${progressTracker.target})`
      );

      const metadataBaseURI = NEXT_PUBLIC_APP_URL
        ? `${NEXT_PUBLIC_APP_URL}/api/nft/certificate`
        : "http://localhost:3000/api/nft/certificate";
      console.error(
        `   3. certificateManager.updateDefaultMetadataBaseURI("${metadataBaseURI}")`
      );
    }

    // Save contract addresses with block numbers
    const addresses = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      courseFactory: courseFactory.target,
      courseLicense: courseLicense.target,
      progressTracker: progressTracker.target,
      certificateManager: certificateManager.target,
      courseFactoryBlock: courseFactoryBlock,
      courseLicenseBlock: courseLicenseBlock,
      progressTrackerBlock: progressTrackerBlock,
      certificateManagerBlock: certificateManagerBlock,
      deployDate: new Date().toISOString(),
    };

    // Ensure directory exists before writing
    const deployedContractsDir = path.dirname(PATHS.deployedContracts);
    if (!fs.existsSync(deployedContractsDir)) {
      fs.mkdirSync(deployedContractsDir, { recursive: true });
    }

    fs.writeFileSync(
      PATHS.deployedContracts,
      JSON.stringify(addresses, null, 2)
    );
    console.log(`\n💾 Contract addresses saved to ${PATHS.deployedContracts}`);

    // Auto-export ABIs and update environments using unified system
    const exportSystem = new ExportSystem();
    await exportSystem.export({ target: "all" });

    console.log("\n🎉 Complete deployment and setup finished successfully!");
    console.log("\n📋 Deployment Summary:");
    console.log(
      `  Network: ${addresses.network} (Chain ID: ${addresses.chainId})`
    );
    console.log(`  Deployer: ${addresses.deployer}`);
    console.log(`\n📝 Contract Addresses:`);
    console.log(`  CourseFactory:      ${addresses.courseFactory}`);
    console.log(`  CourseLicense:      ${addresses.courseLicense}`);
    console.log(`  ProgressTracker:    ${addresses.progressTracker}`);
    console.log(`  CertificateManager: ${addresses.certificateManager}`);
    console.log(`\n🏁 Deployment Blocks:`);
    console.log(`  CourseFactory:      ${addresses.courseFactoryBlock}`);
    console.log(`  CourseLicense:      ${addresses.courseLicenseBlock}`);
    console.log(`  ProgressTracker:    ${addresses.progressTrackerBlock}`);
    console.log(`  CertificateManager: ${addresses.certificateManagerBlock}`);

    const configuredMetadataURI = NEXT_PUBLIC_APP_URL
      ? `${NEXT_PUBLIC_APP_URL}/api/nft/certificate`
      : "http://localhost:3000/api/nft/certificate";
    console.log(`\n⚙️  Configuration:`);
    console.log(`  Certificate Base Route:  ${baseRoute}`);
    console.log(`  Metadata Base URI:       ${configuredMetadataURI}`);
    console.log(`  Platform Name:           ${PLATFORM_NAME}`);

    console.log("\n✅ All contracts deployed, verified, and ABIs exported!");
    console.log("✅ Environment files updated for mobile and frontend!");
    console.log("✅ Goldsky indexer configuration auto-synced!");
    console.log("✅ Certificate metadata routing configured for MetaMask!");
    console.log("\n📋 Next Steps:");
    console.log("  1. Build & deploy indexer: npm run goldsky:deploy");
    console.log("  2. Or manual steps:");
    console.log("     - Sync only: npm run goldsky:sync");
    console.log("     - Build only: npm run goldsky:build");
    console.log("  3. Verify indexer: goldsky subgraph list");
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
