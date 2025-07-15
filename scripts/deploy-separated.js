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
    // Contract yang sudah di-deploy
    const deployedCourseFactory = "0x58052b96b05fFbE5ED31C376E7762b0F6051e15A";
    const deployedCourseLicense = "0x32b235fDabbcF4575aF259179e30a228b1aC72a9";

    console.log("\n📋 Using existing contracts:");
    console.log(`   CourseFactory: ${deployedCourseFactory}`);
    console.log(`   CourseLicense: ${deployedCourseLicense}`);

    // Deploy contracts yang belum
    const progressTracker = await deployContract(
      "ProgressTracker",
      deployedCourseFactory,
      deployedCourseLicense
    );
    const certificateManager = await deployContract(
      "CertificateManager",
      deployedCourseFactory,
      progressTracker.target,
      deployer.address
    );

    

    // Save contract addresses to JSON file
    const addresses = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      
      courseFactory: deployedCourseFactory,
      courseLicense: deployedCourseLicense,
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
