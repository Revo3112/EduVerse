/**
 * EduVerse Deployment Module
 * Handles all deployment-related operations
 */

const { Logger, executeCommand, getNetworkInfo, ensureDirectory } = require('../../core/system');
const { ExportSystem } = require('../../export-system');
const fs = require('fs');
const path = require('path');

class DeploymentManager {
  constructor() {
    this.deploymentHistory = [];
    this.exportSystem = new ExportSystem();
  }

  /**
   * Deploy complete system (all contracts)
   */
  async deployComplete() {
    Logger.header("Complete System Deployment");

    try {
      // Step 1: Compile contracts
      await this.compile();

      // Step 2: Deploy to Manta Pacific
      await this.deployToMantaPacific();

      // Step 3: Export ABIs
      await this.exportABIs();

      // Step 4: Update mobile environment
      await this.updateMobileEnvironment();

      Logger.success("Complete deployment finished successfully!");
      return true;

    } catch (error) {
      Logger.error(`Deployment failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Deploy to localhost for development
   */
  async deployLocal() {
    Logger.header("Local Development Deployment");

    try {
      await this.compile();
      await executeCommand(
        'npx hardhat run scripts/deploy.js --network localhost',
        'Deploying to localhost'
      );

      Logger.success("Local deployment completed!");
      return true;

    } catch (error) {
      Logger.error(`Local deployment failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Deploy with separated approach (reuse existing contracts)
   */
  async deploySeparated() {
    Logger.header("Separated Deployment (Reuse Existing)");

    try {
      await this.compile();
      await executeCommand(
        'npx hardhat run scripts/deploy.js --network mantaPacificTestnet',
        'Deploying with separated approach'
      );

      Logger.success("Separated deployment completed!");
      return true;

    } catch (error) {
      Logger.error(`Separated deployment failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Compile smart contracts
   */
  async compile() {
    Logger.step(1, 4, "Compiling smart contracts");
    await executeCommand('npx hardhat compile', 'Compiling contracts');
  }

  /**
   * Deploy to Manta Pacific Testnet
   */
  async deployToMantaPacific() {
    Logger.step(2, 4, "Deploying to Manta Pacific Testnet");
    await executeCommand(
      'npx hardhat run scripts/deploy.js --network mantaPacificTestnet',
      'Deploying to Manta Pacific'
    );
  }

  /**
   * Export ABI files
   */
  async exportABIs() {
    Logger.step(3, 4, "Exporting ABI files");
    await this.exportSystem.export({ target: "all", skipEnv: true });
  }

  /**
   * Update mobile app environment
   */
  async updateMobileEnvironment() {
    Logger.step(4, 4, "Updating mobile environment");
    await this.exportSystem.export({ envOnly: true });
  }

  /**
   * Check deployment prerequisites
   */
  checkPrerequisites() {
    Logger.section("Checking Prerequisites");

    const issues = [];

    // Check if .env exists
    if (!fs.existsSync('.env')) {
      issues.push('Missing .env file with PRIVATE_KEY');
    }

    // Check if contracts exist
    if (!fs.existsSync('contracts')) {
      issues.push('Missing contracts directory');
    }

    // Check hardhat config
    if (!fs.existsSync('hardhat.config.js')) {
      issues.push('Missing hardhat.config.js');
    }

    if (issues.length > 0) {
      Logger.error("Prerequisites check failed:");
      issues.forEach(issue => {
        console.log(`  ❌ ${issue}`);
      });
      return false;
    }

    Logger.success("All prerequisites satisfied!");
    return true;
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus() {
    const status = {
      hasDeployedContracts: fs.existsSync('deployed-contracts.json'),
      hasCompiledArtifacts: fs.existsSync('artifacts'),
      hasMobileABIs: fs.existsSync('EduVerseApp/src/constants/abi'),
      hasFrontendABIs: fs.existsSync('frontend_website/eduverse/abis'),
      networkInfo: getNetworkInfo()
    };

    return status;
  }

  /**
   * Display deployment status
   */
  displayStatus() {
    Logger.header("Deployment Status");

    const status = this.getDeploymentStatus();

    Logger.section("Contract Deployment");
    console.log(`  Deployed Contracts: ${status.hasDeployedContracts ? '✅' : '❌'}`);
    console.log(`  Compiled Artifacts: ${status.hasCompiledArtifacts ? '✅' : '❌'}`);

    Logger.section("ABI Distribution");
    console.log(`  Mobile App ABIs: ${status.hasMobileABIs ? '✅' : '❌'}`);
    console.log(`  Frontend ABIs: ${status.hasFrontendABIs ? '✅' : '❌'}`);

    Logger.section("Network");
    const networkInfo = status.networkInfo;
    console.log(`  Target Network: ${networkInfo.deployed || 'Not deployed'}`);
    console.log(`  Chain ID: ${networkInfo.chainId || 'Unknown'}`);

    if (status.hasDeployedContracts) {
      Logger.section("Contract Addresses");
      const contracts = networkInfo.contracts;
      if (contracts) {
        console.log(`  CourseFactory: ${contracts.courseFactory}`);
        console.log(`  CourseLicense: ${contracts.courseLicense}`);
        console.log(`  ProgressTracker: ${contracts.progressTracker}`);
        console.log(`  CertificateManager: ${contracts.certificateManager}`);
        console.log(`  Deployed: ${new Date(contracts.deployDate).toLocaleString()}`);
      }
    }

    return status;
  }

  /**
   * Clean deployment artifacts
   */
  async clean() {
    Logger.header("Cleaning Deployment Artifacts");

    try {
      await executeCommand('npx hardhat clean', 'Cleaning compiled artifacts');

      // Remove deployed contracts file if it exists
      if (fs.existsSync('deployed-contracts.json')) {
        fs.unlinkSync('deployed-contracts.json');
        Logger.success("Removed deployed-contracts.json");
      }

      Logger.success("Cleanup completed!");
      return true;

    } catch (error) {
      Logger.error(`Cleanup failed: ${error.message}`);
      return false;
    }
  }
}

// ==================== EXPORTS ====================

module.exports = {
  DeploymentManager
};
