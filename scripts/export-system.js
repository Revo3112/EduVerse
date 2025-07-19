/**
 * EduVerse Unified Export System
 * Consolidates ABI export and environment update functionality
 *
 * Usage:
 *   node export-system.js --target=all          # Export to all targets
 *   node export-system.js --target=mobile       # Export only to mobile
 *   node export-system.js --target=frontend     # Export only to frontend
 *   node export-system.js --env-only            # Update environment only
 */

const fs = require("fs");
const path = require("path");

class ExportSystem {
  constructor() {
    this.config = {
      contracts: [
        "CourseFactory",
        "CourseLicense",
        "ProgressTracker",
        "CertificateManager",
      ],
      paths: {
        mobile: {
          abi: path.join(__dirname, "../EduVerseApp/src/constants/abi"),
          env: path.join(__dirname, "../EduVerseApp/.env"),
          envContracts: path.join(__dirname, "../EduVerseApp/.env.contracts"),
        },
        frontend: {
          abi: path.join(__dirname, "../eduweb/abis"),
          env: path.join(__dirname, "../eduweb/.env.local"),
        },
        artifacts: path.join(__dirname, "../artifacts/contracts"),
        deployedContracts: path.join(__dirname, "../deployed-contracts.json"),
      },
    };
  }

  /**
   * Main export function with configurable targets
   */
  async export(options = {}) {
    const { target = "all", envOnly = false, skipEnv = false } = options;

    console.log("🚀 EduVerse Unified Export System");
    console.log(`📅 Started: ${new Date().toISOString()}`);

    try {
      if (!envOnly) {
        await this.exportABIs(target);
      }

      if (!skipEnv && (target === "all" || target === "mobile")) {
        await this.updateMobileEnvironment();
      }

      if (!skipEnv && (target === "all" || target === "frontend")) {
        await this.updateFrontendEnvironment();
      }

      console.log("\n🎉 Export process completed successfully!");
      return true;

    } catch (error) {
      console.error("\n❌ Export process failed:", error.message);
      throw error;
    }
  }

  /**
   * Export ABI files to specified targets
   */
  async exportABIs(target) {
    console.log(`\n📜 Exporting ABI files (target: ${target})...`);

    // Ensure directories exist
    const targets = this.getTargets(target);
    targets.forEach(targetPath => {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        console.log(`📁 Created directory: ${targetPath}`);
      }
    });

    console.log(`🔄 Exporting ${this.config.contracts.length} contracts...`);

    // Export each contract's ABI
    for (const contract of this.config.contracts) {
      try {
        const artifactPath = path.join(
          this.config.paths.artifacts,
          `${contract}.sol/${contract}.json`
        );

        if (!fs.existsSync(artifactPath)) {
          console.warn(`⚠️ Artifact not found: ${artifactPath}`);
          continue;
        }

        const artifact = require(artifactPath);
        const abiContent = JSON.stringify(artifact.abi, null, 2);

        // Export to selected targets
        targets.forEach(targetPath => {
          const filePath = path.join(targetPath, `${contract}.json`);
          fs.writeFileSync(filePath, abiContent);

          const targetName = targetPath.includes("EduVerseApp") ? "mobile" : "frontend";
          console.log(`✅ Exported ${contract} ABI to ${targetName}: ${filePath}`);
        });

      } catch (error) {
        console.error(`❌ Failed to export ${contract}:`, error.message);
      }
    }

    // Export contract addresses and configuration
    await this.exportContractAddresses(targets);

    // Create mobile app index file if mobile target is included
    if (target === "all" || target === "mobile") {
      await this.createMobileIndexFile();
    }
  }

  /**
   * Export contract addresses to specified targets
   */
  async exportContractAddresses(targets) {
    try {
      if (!fs.existsSync(this.config.paths.deployedContracts)) {
        console.warn("⚠️ deployed-contracts.json not found, skipping address export");
        return;
      }

      const addresses = JSON.parse(
        fs.readFileSync(this.config.paths.deployedContracts, "utf8")
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
        },
      };

      // Export to all targets
      targets.forEach(targetPath => {
        const addressPath = path.join(targetPath, "contract-addresses.json");
        fs.writeFileSync(addressPath, JSON.stringify(contractData, null, 2));

        const targetName = targetPath.includes("EduVerseApp") ? "mobile" : "frontend";
        console.log(`✅ Exported contract addresses to ${targetName}: ${addressPath}`);
      });

    } catch (error) {
      console.error("❌ Failed to export contract addresses:", error.message);
    }
  }

  /**
   * Create mobile app index file for easy imports
   */
  async createMobileIndexFile() {
    const indexContent = `// Auto-generated ABI exports
// Generated on: ${new Date().toISOString()}

${this.config.contracts
  .map(contract => `export { default as ${contract}ABI } from './${contract}.json';`)
  .join("\n")}

export { default as ContractAddresses } from './contract-addresses.json';

// Contract names constant
export const CONTRACT_NAMES = {
${this.config.contracts
  .map(contract => `  ${contract.toUpperCase()}: '${contract}',`)
  .join("\n")}
};

// ABI mapping for dynamic access
export const CONTRACT_ABIS = {
${this.config.contracts
  .map(contract => `  [CONTRACT_NAMES.${contract.toUpperCase()}]: ${contract}ABI,`)
  .join("\n")}
};
`;

    const indexPath = path.join(this.config.paths.mobile.abi, "index.js");
    fs.writeFileSync(indexPath, indexContent);
    console.log(`✅ Created mobile index file: ${indexPath}`);
  }

  /**
   * Update mobile app environment variables
   */
  async updateMobileEnvironment() {
    console.log("\n📱 Updating mobile app environment variables...");

    try {
      if (!fs.existsSync(this.config.paths.deployedContracts)) {
        throw new Error("deployed-contracts.json not found. Please deploy contracts first.");
      }

      const addresses = JSON.parse(
        fs.readFileSync(this.config.paths.deployedContracts, "utf8")
      );

      // Read existing .env content or create new
      let envContent = "";
      if (fs.existsSync(this.config.paths.mobile.env)) {
        envContent = fs.readFileSync(this.config.paths.mobile.env, "utf8");
      }

      const contractAddresses = {
        EXPO_PUBLIC_COURSE_FACTORY_ADDRESS: addresses.courseFactory,
        EXPO_PUBLIC_COURSE_LICENSE_ADDRESS: addresses.courseLicense,
        EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS: addresses.progressTracker,
        EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS: addresses.certificateManager,
        EXPO_PUBLIC_CHAIN_ID: addresses.chainId?.toString(),
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
      fs.writeFileSync(this.config.paths.mobile.env, envContent);

      console.log("✅ Mobile app .env file updated successfully!");
      console.log("📱 Updated contract addresses:");
      Object.entries(contractAddresses).forEach(([key, value]) => {
        if (value) {
          console.log(`   ${key}: ${value}`);
        }
      });

      // Create .env.contracts template
      await this.createContractsEnvTemplate(addresses);

      // Create backup
      await this.createEnvBackup(envContent);

    } catch (error) {
      console.error("❌ Error updating mobile env:", error.message);
      throw error;
    }
  }

  /**
   * Create .env.contracts template for mobile app
   */
  async createContractsEnvTemplate(addresses) {
    const envTemplate = `# Contract Addresses - Auto-generated from Export System
# Generated on: ${new Date().toISOString()}

EXPO_PUBLIC_COURSE_FACTORY_ADDRESS=${addresses.courseFactory}
EXPO_PUBLIC_COURSE_LICENSE_ADDRESS=${addresses.courseLicense}
EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS=${addresses.progressTracker}
EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=${addresses.certificateManager}

# Network Configuration
EXPO_PUBLIC_CHAIN_ID=${addresses.chainId}
EXPO_PUBLIC_NETWORK_NAME=${addresses.network}
`;

    fs.writeFileSync(this.config.paths.mobile.envContracts, envTemplate);
    console.log(`✅ Created contract environment template: ${this.config.paths.mobile.envContracts}`);
  }

  /**
   * Create backup of .env file with timestamp
   */
  async createEnvBackup(envContent) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(
      path.dirname(this.config.paths.mobile.env),
      `.env.backup.${timestamp}`
    );
    fs.writeFileSync(backupPath, envContent);
    console.log(`💾 Backup created: ${backupPath}`);
  }

  /**
   * Update frontend environment variables
   */
  async updateFrontendEnvironment() {
    console.log("\n🌐 Updating frontend environment variables...");

    try {
      const deployedContracts = JSON.parse(
        fs.readFileSync(this.config.paths.deployedContracts, "utf8")
      );

      const addresses = {
        courseFactory: deployedContracts.courseFactory,
        courseLicense: deployedContracts.courseLicense,
        progressTracker: deployedContracts.progressTracker,
        certificateManager: deployedContracts.certificateManager,
        chainId: deployedContracts.chainId,
        network: deployedContracts.network,
      };

      // Read existing .env.local content or create new
      let envContent = "";
      if (fs.existsSync(this.config.paths.frontend.env)) {
        envContent = fs.readFileSync(this.config.paths.frontend.env, "utf8");
      }

      // Update or add environment variables
      const envVars = {
        "NEXT_PUBLIC_CHAIN_ID": addresses.chainId.toString(),
        "NEXT_PUBLIC_RPC_URL": "https://pacific-rpc.sepolia-testnet.manta.network/http",
        "NEXT_PUBLIC_COURSE_FACTORY": addresses.courseFactory,
        "NEXT_PUBLIC_COURSE_LICENSE": addresses.courseLicense,
        "NEXT_PUBLIC_PROGRESS_TRACKER": addresses.progressTracker,
        "NEXT_PUBLIC_CERTIFICATE_MANAGER": addresses.certificateManager,
      };

      // Update environment content
      Object.entries(envVars).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (envContent.match(regex)) {
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          envContent += `\n${key}=${value}`;
        }
      });

      // Ensure directory exists
      const envDir = path.dirname(this.config.paths.frontend.env);
      if (!fs.existsSync(envDir)) {
        fs.mkdirSync(envDir, { recursive: true });
      }

      // Write updated content
      fs.writeFileSync(this.config.paths.frontend.env, envContent.trim());

      console.log(`✅ Frontend environment updated: ${this.config.paths.frontend.env}`);
      console.log("📝 Updated variables:", Object.keys(envVars).join(", "));

    } catch (error) {
      console.error("❌ Error updating frontend env:", error.message);
      throw error;
    }
  }

  /**
   * Get target paths based on target parameter
   */
  getTargets(target) {
    const targets = [];

    if (target === "all" || target === "mobile") {
      targets.push(this.config.paths.mobile.abi);
    }

    if (target === "all" || target === "frontend") {
      targets.push(this.config.paths.frontend.abi);
    }

    if (targets.length === 0) {
      throw new Error(`Invalid target: ${target}. Use 'all', 'mobile', or 'frontend'`);
    }

    return targets;
  }
}

// CLI interface (untuk npm scripts saja - gunakan Portal untuk interface interaktif)
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  args.forEach(arg => {
    if (arg.startsWith('--target=')) {
      options.target = arg.split('=')[1];
    } else if (arg === '--env-only') {
      options.envOnly = true;
    } else if (arg === '--skip-env') {
      options.skipEnv = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
🚀 EduVerse Unified Export System

⚠️  NOTICE: For interactive operations, use 'npm run portal'
⚠️  This CLI is intended for npm scripts only

Usage:
  node export-system.js [options]

Options:
  --target=<target>     Target to export to (all|mobile|frontend) [default: all]
  --env-only           Only update environment variables
  --skip-env           Skip environment variable updates
  --help, -h           Show this help message

Examples:
  npm run export:abi                       # Use npm scripts instead
  npm run export:mobile                    # Use npm scripts instead
  npm run portal                           # Use Portal for interactive operations
      `);
      process.exit(0);
    }
  });

  console.log("🚀 EduVerse Export System (via npm script)");
  console.log("💡 For interactive operations, use: npm run portal");

  const exportSystem = new ExportSystem();

  try {
    await exportSystem.export(options);
    process.exit(0);
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { ExportSystem };

// Run if called directly
if (require.main === module) {
  main();
}
