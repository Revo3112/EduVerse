const fs = require("fs");
const path = require("path");

async function updateMobileEnv() {
  try {
    console.log("📱 Updating mobile app environment variables...");

    // Load deployed contract addresses
    const deployedContractsPath = path.join(
      __dirname,
      "../deployed-contracts.json"
    );
    if (!fs.existsSync(deployedContractsPath)) {
      throw new Error(
        "deployed-contracts.json not found. Please deploy contracts first."
      );
    }

    const addresses = JSON.parse(
      fs.readFileSync(deployedContractsPath, "utf8")
    );

    // Path to mobile app .env file
    const mobileEnvPath = path.join(__dirname, "../EduVerseApp/.env");

    // Read existing .env content or create new
    let envContent = "";
    if (fs.existsSync(mobileEnvPath)) {
      envContent = fs.readFileSync(mobileEnvPath, "utf8");
    } // Contract addresses to update
    const contractAddresses = {
      EXPO_PUBLIC_COURSE_FACTORY_ADDRESS: addresses.courseFactory,
      EXPO_PUBLIC_COURSE_LICENSE_ADDRESS: addresses.courseLicense,
      EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS: addresses.progressTracker,
      EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS: addresses.certificateManager,
      EXPO_PUBLIC_PLATFORM_REGISTRY_ADDRESS: addresses.platformRegistry,
      EXPO_PUBLIC_MOCK_V3_AGGREGATOR_ADDRESS: addresses.mockPriceFeed, // Map mockPriceFeed to MOCK_V3_AGGREGATOR for consistency
      EXPO_PUBLIC_CHAIN_ID: addresses.chainId.toString(),
      EXPO_PUBLIC_NETWORK_NAME: addresses.network,
    };

    // Update or add environment variables
    Object.entries(contractAddresses).forEach(([key, value]) => {
      if (!value) {
        console.warn(`⚠️ Warning: ${key} is empty or undefined`);
        return;
      }

      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        // Update existing variable
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Add new variable
        envContent += `\n${key}=${value}`;
      }
    });

    // Clean up extra newlines
    envContent = envContent.replace(/\n\n+/g, "\n\n").trim();

    // Write updated content back to file
    fs.writeFileSync(mobileEnvPath, envContent);

    console.log("✅ Mobile app .env file updated successfully!");
    console.log("📱 Updated contract addresses:");
    Object.entries(contractAddresses).forEach(([key, value]) => {
      if (value) {
        console.log(`   ${key}: ${value}`);
      }
    });

    // Create backup of .env file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
      __dirname,
      "../EduVerseApp",
      `.env.backup.${timestamp}`
    );
    fs.writeFileSync(backupPath, envContent);
    console.log(`💾 Backup created: ${backupPath}`);
  } catch (error) {
    console.error("❌ Error updating mobile env:", error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  updateMobileEnv()
    .then(() => {
      console.log("🎉 Mobile environment update completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to update mobile environment:", error);
      process.exit(1);
    });
}

module.exports = { updateMobileEnv };
