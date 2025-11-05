const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const GOLDSKY_INDEXER_PATH = path.join(
  __dirname,
  "../goldsky-indexer/subgraph-custom"
);
const DEPLOYED_CONTRACTS_PATH = path.join(__dirname, "../deployed-contracts.json");

function executeCommand(command, options = {}) {
  try {
    execSync(command, {
      cwd: options.cwd || process.cwd(),
      stdio: "inherit",
      ...options,
    });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const rebuild = args.includes("--rebuild");
  const deploy = args.includes("--deploy");
  const version = args.find((arg) => arg.startsWith("--version="))?.split("=")[1] || "1.4.0";

  console.log("🔗 Goldsky Indexer Sync Tool");
  console.log("=".repeat(80));

  if (!fs.existsSync(DEPLOYED_CONTRACTS_PATH)) {
    console.error("❌ deployed-contracts.json not found. Deploy contracts first.");
    process.exit(1);
  }

  const contracts = JSON.parse(fs.readFileSync(DEPLOYED_CONTRACTS_PATH, "utf8"));

  console.log("\n📊 Contract Deployment Info:");
  console.log(`   Network: ${contracts.network}`);
  console.log(`   Chain ID: ${contracts.chainId}`);
  console.log(`   CourseFactory:      ${contracts.courseFactory} (Block ${contracts.courseFactoryBlock})`);
  console.log(`   CourseLicense:      ${contracts.courseLicense} (Block ${contracts.courseLicenseBlock})`);
  console.log(`   ProgressTracker:    ${contracts.progressTracker} (Block ${contracts.progressTrackerBlock})`);
  console.log(`   CertificateManager: ${contracts.certificateManager} (Block ${contracts.certificateManagerBlock})`);

  console.log("\n🔄 Step 1: Syncing ABIs and contract addresses...");
  if (!executeCommand("node scripts/export-system.js --target=goldsky")) {
    process.exit(1);
  }

  if (rebuild) {
    console.log("\n🔨 Step 2: Running codegen...");
    if (!executeCommand("npm run codegen", { cwd: GOLDSKY_INDEXER_PATH })) {
      process.exit(1);
    }

    console.log("\n🏗️  Step 3: Building subgraph...");
    if (!executeCommand("npm run build", { cwd: GOLDSKY_INDEXER_PATH })) {
      process.exit(1);
    }
  } else {
    console.log("\n⏭️  Skipping rebuild (use --rebuild to force)");
  }

  if (deploy) {
    console.log(`\n🚀 Step 4: Deploying to Goldsky (version ${version})...`);
    const deployCmd = `goldsky subgraph deploy eduverse-manta-pacific-sepolia/${version} --path .`;

    console.log(`\n📝 Command: ${deployCmd}`);
    console.log("⏳ This may take a few minutes...\n");

    if (!executeCommand(deployCmd, { cwd: GOLDSKY_INDEXER_PATH })) {
      console.error("\n❌ Deployment failed!");
      console.log("\n💡 Manual deployment:");
      console.log(`   cd goldsky-indexer/subgraph-custom`);
      console.log(`   ${deployCmd}`);
      process.exit(1);
    }

    console.log("\n✅ Deployment successful!");
    console.log("\n📋 Next steps:");
    console.log(`   1. Check status: goldsky subgraph status eduverse-manta-pacific-sepolia/${version}`);
    console.log("   2. Wait for indexing to complete (2-5 minutes)");
    console.log("   3. Test GraphQL endpoint");
  } else {
    console.log("\n⏭️  Skipping deployment (use --deploy to deploy)");
    console.log("\n📋 Manual deployment:");
    console.log("   cd goldsky-indexer/subgraph-custom");
    console.log(`   goldsky subgraph deploy eduverse-manta-pacific-sepolia/${version} --path .`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Goldsky sync completed!");
  console.log("=".repeat(80));
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
