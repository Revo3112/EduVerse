const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Memulai deployment terpisah Eduverse Platform...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with address: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);

  try {
    // 1. Deploy MockV3Aggregator untuk ETH/USD price feed
    console.log("\n1️⃣ Deploying MockV3Aggregator...");
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    const mockPriceFeed = await MockV3Aggregator.deploy(
      8,                // 8 decimals
      200000000000      // $2000 per ETH (8 decimals)
    );
    await mockPriceFeed.deployed();
    console.log(`✅ MockV3Aggregator deployed to: ${mockPriceFeed.address}`);

    // 2. Deploy CourseFactory
    console.log("\n2️⃣ Deploying CourseFactory...");
    const CourseFactory = await ethers.getContractFactory("CourseFactory");
    const courseFactory = await CourseFactory.deploy(mockPriceFeed.address);
    await courseFactory.deployed();
    console.log(`✅ CourseFactory deployed to: ${courseFactory.address}`);

    // 3. Deploy CourseLicense
    console.log("\n3️⃣ Deploying CourseLicense...");
    const CourseLicense = await ethers.getContractFactory("CourseLicense");
    const courseLicense = await CourseLicense.deploy(
      courseFactory.address,
      deployer.address,  // Platform wallet
      mockPriceFeed.address
    );
    await courseLicense.deployed();
    console.log(`✅ CourseLicense deployed to: ${courseLicense.address}`);

    // 4. Deploy ProgressTracker
    console.log("\n4️⃣ Deploying ProgressTracker...");
    const ProgressTracker = await ethers.getContractFactory("ProgressTracker");
    const progressTracker = await ProgressTracker.deploy(
      courseFactory.address,
      courseLicense.address
    );
    await progressTracker.deployed();
    console.log(`✅ ProgressTracker deployed to: ${progressTracker.address}`);

    // 5. Deploy CertificateManager
    console.log("\n5️⃣ Deploying CertificateManager...");
    const CertificateManager = await ethers.getContractFactory("CertificateManager");
    const certificateManager = await CertificateManager.deploy(
      courseFactory.address,
      progressTracker.address,
      deployer.address  // Platform wallet
    );
    await certificateManager.deployed();
    console.log(`✅ CertificateManager deployed to: ${certificateManager.address}`);

    // 6. Deploy PlatformRegistry - kontrak ringan untuk registrasi
    console.log("\n6️⃣ Deploying PlatformRegistry...");
    const PlatformRegistry = await ethers.getContractFactory("PlatformRegistry");
    const platformRegistry = await PlatformRegistry.deploy();
    await platformRegistry.deployed();
    console.log(`✅ PlatformRegistry deployed to: ${platformRegistry.address}`);

    // 7. Register semua komponen di Registry
    console.log("\n7️⃣ Registering platform components...");
    const registerTx = await platformRegistry.registerPlatform(
      courseFactory.address,
      courseLicense.address,
      progressTracker.address,
      certificateManager.address
    );
    await registerTx.wait();
    console.log("✅ All components registered in PlatformRegistry");

    // Simpan alamat kontrak di file JSON
    const addresses = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      mockPriceFeed: mockPriceFeed.address,
      courseFactory: courseFactory.address,
      courseLicense: courseLicense.address,
      progressTracker: progressTracker.address,
      certificateManager: certificateManager.address,
      platformRegistry: platformRegistry.address,
      deployDate: new Date().toISOString()
    };

    fs.writeFileSync(
      "deployed-contracts.json",
      JSON.stringify(addresses, null, 2)
    );
    console.log("\n💾 Contract addresses saved to deployed-contracts.json");

    // Informasi tambahan tentang gas savings
    console.log("\n💹 Gas Savings Information:");
    console.log("Deploying contracts separately instead of using PlatformFactory");
    console.log("reduces gas costs and avoids contract size limitations.");

    console.log("\n🎉 Deployment completed successfully!");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
