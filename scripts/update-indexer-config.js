/**
 * Auto-Update Indexer Configuration Script
 * Reads deployed-contracts.json and updates Goldsky indexer configs
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// PATHS
// ============================================================================

const DEPLOYED_CONTRACTS_PATH = path.join(
  __dirname,
  "../deployed-contracts.json"
);

const EDUVERSE_SUBGRAPH_CONFIG = path.join(
  __dirname,
  "../goldsky-indexer/subgraph-custom/configs/eduverse-subgraph.json"
);

const SUBGRAPH_YAML = path.join(
  __dirname,
  "../goldsky-indexer/subgraph-custom/subgraph.yaml"
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function loadDeployedContracts() {
  if (!fs.existsSync(DEPLOYED_CONTRACTS_PATH)) {
    throw new Error(
      `❌ deployed-contracts.json not found at ${DEPLOYED_CONTRACTS_PATH}`
    );
  }

  const content = fs.readFileSync(DEPLOYED_CONTRACTS_PATH, "utf8");
  return JSON.parse(content);
}

function updateEdiverseSubgraphJson(contracts) {
  console.log("\n📝 Updating eduverse-subgraph.json...");

  if (!fs.existsSync(EDUVERSE_SUBGRAPH_CONFIG)) {
    throw new Error(
      `❌ eduverse-subgraph.json not found at ${EDUVERSE_SUBGRAPH_CONFIG}`
    );
  }

  const config = JSON.parse(fs.readFileSync(EDUVERSE_SUBGRAPH_CONFIG, "utf8"));

  // Update instances with new addresses and startBlocks
  const instanceMap = {
    courseFactory: {
      address: contracts.courseFactory,
      startBlock: contracts.courseFactoryBlock || 0,
    },
    courseLicense: {
      address: contracts.courseLicense,
      startBlock: contracts.courseLicenseBlock || 0,
    },
    progressTracker: {
      address: contracts.progressTracker,
      startBlock: contracts.progressTrackerBlock || 0,
    },
    certificateManager: {
      address: contracts.certificateManager,
      startBlock: contracts.certificateManagerBlock || 0,
    },
  };

  config.instances = config.instances.map((instance) => {
    const update = instanceMap[instance.abi];
    if (update) {
      return {
        ...instance,
        address: update.address,
        startBlock: update.startBlock,
      };
    }
    return instance;
  });

  fs.writeFileSync(
    EDUVERSE_SUBGRAPH_CONFIG,
    JSON.stringify(config, null, 2),
    "utf8"
  );

  console.log("✅ eduverse-subgraph.json updated successfully");
}

function updateSubgraphYaml(contracts) {
  console.log("\n📝 Updating subgraph.yaml...");

  if (!fs.existsSync(SUBGRAPH_YAML)) {
    throw new Error(`❌ subgraph.yaml not found at ${SUBGRAPH_YAML}`);
  }

  let yaml = fs.readFileSync(SUBGRAPH_YAML, "utf8");

  // Update CourseFactory
  yaml = yaml.replace(
    /(name: CourseFactory[\s\S]*?address: ")[^"]+(")/,
    `$1${contracts.courseFactory}$2`
  );
  yaml = yaml.replace(
    /(name: CourseFactory[\s\S]*?startBlock: )\d+/,
    `$1${contracts.courseFactoryBlock || 0}`
  );

  // Update CourseLicense
  yaml = yaml.replace(
    /(name: CourseLicense[\s\S]*?address: ")[^"]+(")/,
    `$1${contracts.courseLicense}$2`
  );
  yaml = yaml.replace(
    /(name: CourseLicense[\s\S]*?startBlock: )\d+/,
    `$1${contracts.courseLicenseBlock || 0}`
  );

  // Update ProgressTracker
  yaml = yaml.replace(
    /(name: ProgressTracker[\s\S]*?address: ")[^"]+(")/,
    `$1${contracts.progressTracker}$2`
  );
  yaml = yaml.replace(
    /(name: ProgressTracker[\s\S]*?startBlock: )\d+/,
    `$1${contracts.progressTrackerBlock || 0}`
  );

  // Update CertificateManager
  yaml = yaml.replace(
    /(name: CertificateManager[\s\S]*?address: ")[^"]+(")/,
    `$1${contracts.certificateManager}$2`
  );
  yaml = yaml.replace(
    /(name: CertificateManager[\s\S]*?startBlock: )\d+/,
    `$1${contracts.certificateManagerBlock || 0}`
  );

  fs.writeFileSync(SUBGRAPH_YAML, yaml, "utf8");

  console.log("✅ subgraph.yaml updated successfully");
}

function displaySummary(contracts) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 INDEXER CONFIGURATION UPDATE SUMMARY");
  console.log("=".repeat(80));
  console.log(`\n🌐 Network: ${contracts.network || "Unknown"}`);
  console.log(`🔗 Chain ID: ${contracts.chainId || "Unknown"}`);
  console.log(`📅 Deployed: ${contracts.deployDate || "Unknown"}`);
  console.log(`\n📝 Contract Addresses:`);
  console.log(`   CourseFactory:      ${contracts.courseFactory}`);
  console.log(`   CourseLicense:      ${contracts.courseLicense}`);
  console.log(`   ProgressTracker:    ${contracts.progressTracker}`);
  console.log(`   CertificateManager: ${contracts.certificateManager}`);
  console.log(`\n🏁 Start Blocks:`);
  console.log(
    `   CourseFactory:      ${contracts.courseFactoryBlock || "Not set"}`
  );
  console.log(
    `   CourseLicense:      ${contracts.courseLicenseBlock || "Not set"}`
  );
  console.log(
    `   ProgressTracker:    ${contracts.progressTrackerBlock || "Not set"}`
  );
  console.log(
    `   CertificateManager: ${contracts.certificateManagerBlock || "Not set"}`
  );
  console.log("\n" + "=".repeat(80));
  console.log("✅ All indexer configs updated successfully!");
  console.log("=".repeat(80));
  console.log("\n📋 Next Steps:");
  console.log(
    "   1. cd goldsky-indexer/subgraph-custom && npm run codegen && npm run build"
  );
  console.log(
    "   2. goldsky subgraph deploy eduverse-manta-pacific-sepolia/1.4.0 --path ."
  );
  console.log("   3. Wait for indexer to sync (2-5 minutes)");
  console.log("   4. Verify with: goldsky subgraph list\n");
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("🚀 Starting Indexer Configuration Update...\n");

  try {
    // Load deployed contracts
    console.log("📖 Reading deployed-contracts.json...");
    const contracts = loadDeployedContracts();
    console.log("✅ Loaded contract addresses successfully");

    // Validate required fields
    const required = [
      "courseFactory",
      "courseLicense",
      "progressTracker",
      "certificateManager",
    ];

    const missing = required.filter((field) => !contracts[field]);
    if (missing.length > 0) {
      throw new Error(
        `❌ Missing required fields in deployed-contracts.json: ${missing.join(
          ", "
        )}`
      );
    }

    // Update configs
    updateEdiverseSubgraphJson(contracts);
    updateSubgraphYaml(contracts);

    // Display summary
    displaySummary(contracts);
  } catch (error) {
    console.error("\n❌ Update failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
