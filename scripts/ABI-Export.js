const fs = require("fs");
const path = require("path");

async function main() {
  console.log("📜 Exporting ABI files for EduVerse Mobile App...");

  // Create mobile app ABI directory
  const mobileAbiDir = path.join(__dirname, "../EduVerseApp/src/constants/abi");

  // Create frontend ABI directory (existing functionality)
  const frontendDir = path.join(__dirname, "../frontend_website/eduverse");
  const frontendAbiDir = path.join(frontendDir, "abis");

  // Ensure directories exist
  [mobileAbiDir, frontendAbiDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  // Complete list of all contracts in the project
  const contracts = [
    "CourseFactory",
    "CourseLicense",
    "ProgressTracker",
    "CertificateManager",
    // "PlatformFactory", // Not used in actual deployment, skipped for cleaner exports
  ];

  console.log(`🔄 Exporting ${contracts.length} contracts...`);

  // Export each contract's ABI to both locations
  for (const contract of contracts) {
    try {
      const artifactPath = `../artifacts/contracts/${contract}.sol/${contract}.json`;
      const artifact = require(artifactPath);

      const abiContent = JSON.stringify(artifact.abi, null, 2);

      // Export to mobile app
      const mobileFilePath = path.join(mobileAbiDir, `${contract}.json`);
      fs.writeFileSync(mobileFilePath, abiContent);
      console.log(
        `✅ Exported ${contract} ABI to mobile app: ${mobileFilePath}`
      );

      // Export to frontend (existing functionality)
      const frontendFilePath = path.join(frontendAbiDir, `${contract}.json`);
      fs.writeFileSync(frontendFilePath, abiContent);
      console.log(
        `✅ Exported ${contract} ABI to frontend: ${frontendFilePath}`
      );
    } catch (error) {
      console.error(`❌ Failed to export ${contract}:`, error.message);
    }
  }

  // Export contract addresses and configuration
  try {
    const addresses = JSON.parse(
      fs.readFileSync("deployed-contracts.json", "utf8")
    );
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
        // platformFactory: addresses.platformFactory || null, // Not used in actual deployment
      },
    };

    // Export to mobile app
    const mobileAddressPath = path.join(
      mobileAbiDir,
      "contract-addresses.json"
    );
    fs.writeFileSync(mobileAddressPath, JSON.stringify(contractData, null, 2));
    console.log(
      `✅ Exported contract addresses to mobile app: ${mobileAddressPath}`
    );

    // Export to frontend
    const frontendAddressPath = path.join(
      frontendAbiDir,
      "contract-addresses.json"
    );
    fs.writeFileSync(
      frontendAddressPath,
      JSON.stringify(contractData, null, 2)
    );
    console.log(
      `✅ Exported contract addresses to frontend: ${frontendAddressPath}`
    );

    // Create mobile app environment file template
    const envTemplate = `# Contract Addresses - Auto-generated from ABI Export
EXPO_PUBLIC_COURSE_FACTORY_ADDRESS=${addresses.courseFactory}
EXPO_PUBLIC_COURSE_LICENSE_ADDRESS=${addresses.courseLicense}
EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS=${addresses.progressTracker}
EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=${addresses.certificateManager}

# Network Configuration
EXPO_PUBLIC_CHAIN_ID=${addresses.chainId}
EXPO_PUBLIC_NETWORK_NAME=${addresses.network}
`;

    const envTemplatePath = path.join(
      __dirname,
      "../EduVerseApp/.env.contracts"
    );
    fs.writeFileSync(envTemplatePath, envTemplate);
    console.log(`✅ Created contract environment template: ${envTemplatePath}`);
  } catch (error) {
    console.error("❌ Failed to export contract addresses:", error.message);
  }

  // Create index file for easy imports in mobile app
  const indexContent = `// Auto-generated ABI exports
// Generated on: ${new Date().toISOString()}

${contracts
  .map(
    (contract) =>
      `export { default as ${contract}ABI } from './${contract}.json';`
  )
  .join("\n")}

export { default as ContractAddresses } from './contract-addresses.json';

// Contract names constant
export const CONTRACT_NAMES = {
${contracts
  .map((contract) => `  ${contract.toUpperCase()}: '${contract}',`)
  .join("\n")}
};

// ABI mapping for dynamic access
export const CONTRACT_ABIS = {
${contracts
  .map(
    (contract) =>
      `  [CONTRACT_NAMES.${contract.toUpperCase()}]: ${contract}ABI,`
  )
  .join("\n")}
};
`;

  const indexPath = path.join(mobileAbiDir, "index.js");
  fs.writeFileSync(indexPath, indexContent);
  console.log(`✅ Created index file for easy imports: ${indexPath}`);

  console.log("\n🎉 ABI export completed successfully!");
  console.log(`📱 Mobile app ABIs: ${mobileAbiDir}`);
  console.log(`🌐 Frontend ABIs: ${frontendAbiDir}`);
  console.log(`📄 Contract addresses exported to both locations`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error exporting ABI:", error);
    process.exit(1);
  });
