/**
 * EduVerse Utilities Module
 * Handles ABI export, environment management, and other utilities
 */

const { Logger, executeCommand, getNetworkInfo, colors, ensureDirectory, fileExists } = require('../../core/system');
const { ExportSystem } = require('../../export-system');
const fs = require('fs');
const path = require('path');

class UtilitiesManager {
  constructor() {
    this.exportSystem = new ExportSystem();
    // Keep abiPaths for backward compatibility with existing functions
    this.abiPaths = {
      mobile: 'EduVerseApp/src/constants/abi',
      frontend: 'eduweb/abis',
      artifacts: 'artifacts/contracts'
    };
  }

  /**
   * Complete mobile app setup (export ABIs + update environment)
   */
  async setupMobileComplete() {
    Logger.header("Complete Mobile App Setup");

    try {
      // Use unified export system for complete mobile setup
      await this.exportSystem.export({ target: "mobile" });

      Logger.success("Complete mobile setup finished!");
      return true;

    } catch (error) {
      Logger.error(`Mobile setup failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Export ABI files to mobile app and frontend
   */
  async exportABIs() {
    Logger.header("ABI Export Process");

    try {
      await this.exportSystem.export({ target: "all", skipEnv: true });
      return true;

    } catch (error) {
      Logger.error(`ABI export failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Update mobile app environment variables
   */
  async updateMobileEnvironment() {
    Logger.header("Mobile Environment Update");

    try {
      await this.exportSystem.export({ envOnly: true });
      return true;

    } catch (error) {
      Logger.error(`Mobile environment update failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Manual ABI export with detailed feedback
   */
  async exportABIsManual() {
    Logger.header("Manual ABI Export");

    try {
      await this.exportSystem.export({ target: "all", skipEnv: true });
      Logger.success("Manual ABI export completed!");
      return true;

    } catch (error) {
      Logger.error(`Manual ABI export failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Export ABI files to mobile only
   */
  async exportMobileOnly() {
    Logger.header("Mobile ABI Export");

    try {
      await this.exportSystem.export({ target: "mobile", skipEnv: true });
      Logger.success("Mobile ABI export completed!");
      return true;

    } catch (error) {
      Logger.error(`Mobile ABI export failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Export ABI files to frontend only
   */
  async exportFrontendOnly() {
    Logger.header("Frontend ABI Export");

    try {
      await this.exportSystem.export({ target: "frontend" });
      Logger.success("Frontend ABI export completed!");
      return true;

    } catch (error) {
      Logger.error(`Frontend ABI export failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Export single contract ABI
   */
  async exportSingleContract(contractName) {
    try {
      const artifactPath = path.join(this.abiPaths.artifacts, `${contractName}.sol`, `${contractName}.json`);

      if (!fileExists(artifactPath)) {
        throw new Error(`Artifact not found: ${artifactPath}`);
      }

      const artifact = readJsonFile(artifactPath);
      const abiContent = JSON.stringify(artifact.abi, null, 2);

      // Export to mobile
      const mobileFilePath = path.join(this.abiPaths.mobile, `${contractName}.json`);
      fs.writeFileSync(mobileFilePath, abiContent);
      Logger.success(`Exported ${contractName} ABI to mobile app`);

      // Export to frontend
      const frontendFilePath = path.join(this.abiPaths.frontend, `${contractName}.json`);
      fs.writeFileSync(frontendFilePath, abiContent);
      Logger.success(`Exported ${contractName} ABI to frontend`);

    } catch (error) {
      Logger.error(`Failed to export ${contractName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export contract addresses configuration
   */
  async exportContractAddresses() {
    try {
      const deployedContracts = readJsonFile('deployed-contracts.json');

      if (!deployedContracts) {
        throw new Error('No deployed contracts found');
      }

      const contractData = {
        networkName: deployedContracts.network,
        chainId: deployedContracts.chainId,
        deployer: deployedContracts.deployer,
        deployDate: deployedContracts.deployDate,
        addresses: {
          courseFactory: deployedContracts.courseFactory,
          courseLicense: deployedContracts.courseLicense,
          progressTracker: deployedContracts.progressTracker,
          certificateManager: deployedContracts.certificateManager
        }
      };

      // Export to mobile
      const mobileAddressPath = path.join(this.abiPaths.mobile, 'contract-addresses.json');
      writeJsonFile(mobileAddressPath, contractData);
      Logger.success("Exported contract addresses to mobile app");

      // Export to frontend
      const frontendAddressPath = path.join(this.abiPaths.frontend, 'contract-addresses.json');
      writeJsonFile(frontendAddressPath, contractData);
      Logger.success("Exported contract addresses to frontend");

    } catch (error) {
      Logger.error(`Failed to export contract addresses: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create index file for mobile app
   */
  async createMobileIndexFile(contracts) {
    try {
      const indexContent = `// Auto-generated ABI exports
// Generated on: ${new Date().toISOString()}

${contracts.map(contract =>
  `export { default as ${contract}ABI } from './${contract}.json';`
).join('\n')}

export { default as ContractAddresses } from './contract-addresses.json';

// Contract names constant
export const CONTRACT_NAMES = {
${contracts.map(contract =>
  `  ${contract.toUpperCase()}: '${contract}',`
).join('\n')}
};

// ABI mapping for dynamic access
export const CONTRACT_ABIS = {
${contracts.map(contract =>
  `  [CONTRACT_NAMES.${contract.toUpperCase()}]: ${contract}ABI,`
).join('\n')}
};
`;

      const indexPath = path.join(this.abiPaths.mobile, 'index.js');
      fs.writeFileSync(indexPath, indexContent);
      Logger.success("Created mobile app index file");

    } catch (error) {
      Logger.error(`Failed to create index file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update mobile environment file manually
   */
  async updateMobileEnvironmentManual() {
    Logger.header("Manual Mobile Environment Update");

    try {
      const deployedContracts = readJsonFile('deployed-contracts.json');

      if (!deployedContracts) {
        throw new Error('No deployed contracts found');
      }

      const envTemplate = `# Contract Addresses - Auto-generated
EXPO_PUBLIC_COURSE_FACTORY_ADDRESS=${deployedContracts.courseFactory}
EXPO_PUBLIC_COURSE_LICENSE_ADDRESS=${deployedContracts.courseLicense}
EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS=${deployedContracts.progressTracker}
EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=${deployedContracts.certificateManager}

# Network Configuration
EXPO_PUBLIC_CHAIN_ID=${deployedContracts.chainId}
EXPO_PUBLIC_NETWORK_NAME=${deployedContracts.network}
`;

      // Create backup of existing .env
      const envPath = 'EduVerseApp/.env';
      if (fileExists(envPath)) {
        const backupPath = `EduVerseApp/.env.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;
        fs.copyFileSync(envPath, backupPath);
        Logger.info(`Created backup: ${backupPath}`);
      }

      // Read existing .env to preserve other variables
      const existingEnv = fileExists(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
      const existingLines = existingEnv.split('\n').filter(line =>
        !line.startsWith('EXPO_PUBLIC_COURSE_') &&
        !line.startsWith('EXPO_PUBLIC_PROGRESS_') &&
        !line.startsWith('EXPO_PUBLIC_CERTIFICATE_') &&
        !line.startsWith('EXPO_PUBLIC_CHAIN_ID') &&
        !line.startsWith('EXPO_PUBLIC_NETWORK_NAME') &&
        line.trim() !== ''
      );

      // Combine existing and new environment variables
      const finalEnv = existingLines.join('\n') + '\n\n' + envTemplate;

      // Write updated .env file
      fs.writeFileSync(envPath, finalEnv);
      Logger.success("Mobile environment file updated successfully!");

      return true;

    } catch (error) {
      Logger.error(`Failed to update mobile environment: ${error.message}`);
      return false;
    }
  }

  /**
   * Get network information and display
   */
  async getNetworkInfo() {
    Logger.header("Network Information");

    try {
      await executeCommand('node scripts/network-helper.js', 'Getting network information');
      return true;

    } catch (error) {
      Logger.error(`Failed to get network info: ${error.message}`);
      return false;
    }
  }

  /**
   * Check utilities status
   */
  getUtilitiesStatus() {
    const status = {
      hasDeployedContracts: fileExists('deployed-contracts.json'),
      hasCompiledArtifacts: fileExists(this.abiPaths.artifacts),
      hasMobileABIs: fileExists(path.join(this.abiPaths.mobile, 'contract-addresses.json')),
      hasFrontendABIs: fileExists(path.join(this.abiPaths.frontend, 'contract-addresses.json')),
      hasMobileEnv: fileExists('EduVerseApp/.env'),
      hasMobileIndexFile: fileExists(path.join(this.abiPaths.mobile, 'index.js'))
    };

    // Check ABI file consistency
    status.abiConsistency = this.checkABIConsistency();

    return status;
  }

  /**
   * Check ABI consistency between mobile and frontend
   */
  checkABIConsistency() {
    try {
      const mobileAddresses = readJsonFile(path.join(this.abiPaths.mobile, 'contract-addresses.json'));
      const frontendAddresses = readJsonFile(path.join(this.abiPaths.frontend, 'contract-addresses.json'));

      if (!mobileAddresses || !frontendAddresses) {
        return false;
      }

      return JSON.stringify(mobileAddresses.addresses) === JSON.stringify(frontendAddresses.addresses);

    } catch (error) {
      return false;
    }
  }

  /**
   * Display utilities status
   */
  displayStatus() {
    Logger.header("Utilities Status");

    const status = this.getUtilitiesStatus();

    Logger.section("Prerequisites");
    console.log(`  Deployed Contracts: ${status.hasDeployedContracts ? '✅' : '❌'}`);
    console.log(`  Compiled Artifacts: ${status.hasCompiledArtifacts ? '✅' : '❌'}`);

    Logger.section("ABI Files");
    console.log(`  Mobile App ABIs: ${status.hasMobileABIs ? '✅' : '❌'}`);
    console.log(`  Frontend ABIs: ${status.hasFrontendABIs ? '✅' : '❌'}`);
    console.log(`  ABI Consistency: ${status.abiConsistency ? '✅' : '❌'}`);

    Logger.section("Mobile App");
    console.log(`  Environment File: ${status.hasMobileEnv ? '✅' : '❌'}`);
    console.log(`  Index File: ${status.hasMobileIndexFile ? '✅' : '❌'}`);

    const canExport = status.hasDeployedContracts && status.hasCompiledArtifacts;

    Logger.section("Export Readiness");
    console.log(`  Ready for Export: ${canExport ? '✅' : '❌'}`);

    if (!canExport) {
      Logger.warning("Run deployment and compilation first");
    }

    return status;
  }

  /**
   * Clean utility files
   */
  async clean() {
    Logger.header("Cleaning Utility Files");

    try {
      const filesToClean = [
        path.join(this.abiPaths.mobile, 'contract-addresses.json'),
        path.join(this.abiPaths.mobile, 'index.js'),
        path.join(this.abiPaths.frontend, 'contract-addresses.json'),
        'EduVerseApp/.env.contracts'
      ];

      filesToClean.forEach(file => {
        if (fileExists(file)) {
          fs.unlinkSync(file);
          Logger.success(`Removed ${file}`);
        }
      });

      // Clean ABI files
      const contracts = ['CourseFactory', 'CourseLicense', 'ProgressTracker', 'CertificateManager'];
      contracts.forEach(contract => {
        const mobileFile = path.join(this.abiPaths.mobile, `${contract}.json`);
        const frontendFile = path.join(this.abiPaths.frontend, `${contract}.json`);

        if (fileExists(mobileFile)) {
          fs.unlinkSync(mobileFile);
          Logger.success(`Removed mobile ${contract} ABI`);
        }

        if (fileExists(frontendFile)) {
          fs.unlinkSync(frontendFile);
          Logger.success(`Removed frontend ${contract} ABI`);
        }
      });

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
  UtilitiesManager
};
