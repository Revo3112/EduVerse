const { ethers, network } = require("hardhat");
const fs = require("fs");

async function deployContract(contractName, ...args) {
  console.log(`\n🚀 Deploying ${contractName}...`);
  const ContractFactory = await ethers.getContractFactory(contractName);
  const contract = await ContractFactory.deploy(...args);
  await contract.deploymentTransaction().wait();
  console.log(`✅ ${contractName} deployed to: ${contract.target}`);
  return contract;
}

async function main() {
  console.log("🚀 Memulai deployment terpisah Eduverse Platform...");

  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with address: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  try {
    // Deploy contracts
    const mockPriceFeed = await deployContract("MockV3Aggregator", 8, 200000000000);
    const courseFactory = await deployContract("CourseFactory", mockPriceFeed.target);
    const courseLicense = await deployContract("CourseLicense", courseFactory.target, deployer.address, mockPriceFeed.target);
    const progressTracker = await deployContract("ProgressTracker", courseFactory.target, courseLicense.target);
    const certificateManager = await deployContract("CertificateManager", courseFactory.target, progressTracker.target, deployer.address);
    const platformRegistry = await deployContract("PlatformRegistry");

    // Register components in PlatformRegistry
    console.log("\n🔗 Registering platform components...");
    const registerTx = await platformRegistry.registerPlatform(
      courseFactory.target,
      courseLicense.target,
      progressTracker.target,
      certificateManager.target
    );
    await registerTx.wait();
    console.log("✅ All components registered in PlatformRegistry");

    // Save contract addresses to JSON file
    const addresses = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      mockPriceFeed: mockPriceFeed.target,
      courseFactory: courseFactory.target,
      courseLicense: courseLicense.target,
      progressTracker: progressTracker.target,
      certificateManager: certificateManager.target,
      platformRegistry: platformRegistry.target,
      deployDate: new Date().toISOString()
    };

    fs.writeFileSync("deployed-contracts.json", JSON.stringify(addresses, null, 2));
    console.log("\n💾 Contract addresses saved to deployed-contracts.json");

    console.log("\n🎉 Deployment completed successfully!");
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
