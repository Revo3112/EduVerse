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
  console.log(
    `💰 Account balance: ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )} ETH`
  );

  try {
    // Load existing deployed contracts if available
    let existingContracts = {};
    const deployedContractsFile = "deployed-contracts.json";

    if (fs.existsSync(deployedContractsFile)) {
      existingContracts = JSON.parse(fs.readFileSync(deployedContractsFile, "utf8"));
      console.log("\n📋 Found existing contracts:");
      if (existingContracts.courseFactory) console.log(`   CourseFactory: ${existingContracts.courseFactory}`);
      if (existingContracts.courseLicense) console.log(`   CourseLicense: ${existingContracts.courseLicense}`);
    } else {
      console.log("\n⚠️ No existing contracts found. Will deploy all contracts.");
    }

    // Deploy or use existing CourseFactory
    let courseFactoryAddress;
    if (existingContracts.courseFactory) {
      courseFactoryAddress = existingContracts.courseFactory;
      console.log(`\n✅ Using existing CourseFactory: ${courseFactoryAddress}`);
    } else {
      const courseFactory = await deployContract("CourseFactory");
      courseFactoryAddress = courseFactory.target;
    }

    // Deploy or use existing CourseLicense
    let courseLicenseAddress;
    if (existingContracts.courseLicense) {
      courseLicenseAddress = existingContracts.courseLicense;
      console.log(`\n✅ Using existing CourseLicense: ${courseLicenseAddress}`);
    } else {
      const courseLicense = await deployContract("CourseLicense", courseFactoryAddress, deployer.address);
      courseLicenseAddress = courseLicense.target;
    }

    // Deploy remaining contracts
    const progressTracker = await deployContract(
      "ProgressTracker",
      courseFactoryAddress,
      courseLicenseAddress
    );
    const certificateManager = await deployContract(
      "CertificateManager",
      courseFactoryAddress,
      progressTracker.target,
      deployer.address
    );



    // Save contract addresses to JSON file
    const addresses = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,

      courseFactory: courseFactoryAddress,
      courseLicense: courseLicenseAddress,
      progressTracker: progressTracker.target,
      certificateManager: certificateManager.target,

      deployDate: new Date().toISOString(),
    };

    fs.writeFileSync(
      "deployed-contracts.json",
      JSON.stringify(addresses, null, 2)
    );
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
