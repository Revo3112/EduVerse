/**
 * EduVerse Verification Module
 * Handles all verification-related operations
 */

const { Logger, executeCommand, getNetworkInfo, colors, fileExists, readJsonFile } = require('../../core/system');
const fs = require('fs');
const path = require('path');

class VerificationManager {
  constructor() {
    this.verificationResults = {};
  }

  /**
   * Complete verification (blockchain + ABI consistency)
   */
  async verifyComplete() {
    Logger.header("Complete Verification Process");

    try {
      // Step 1: Verify contracts on blockchain
      const blockchainResults = await this.verifyBlockchain();

      // Step 2: Verify ABI consistency
      const abiResults = await this.verifyABIConsistency();

      // Step 3: Generate report
      this.generateVerificationReport(blockchainResults, abiResults);

      Logger.success("Complete verification finished!");
      return true;

    } catch (error) {
      Logger.error(`Verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify contracts on blockchain explorer
   */
  async verifyBlockchain() {
    Logger.header("Blockchain Contract Verification");

    try {
      await executeCommand(
        'npx hardhat run scripts/verify-comprehensive.js --network mantaPacificTestnet',
        'Verifying contracts on blockchain'
      );

      return { success: true, verified: true };

    } catch (error) {
      Logger.warning(`Blockchain verification had issues: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify comprehensive (blockchain + ABI)
   */
  async verifyComprehensive() {
    Logger.header("Comprehensive Verification");

    try {
      await executeCommand(
        'npx hardhat run scripts/verify-comprehensive.js --network mantaPacificTestnet',
        'Running comprehensive verification'
      );

      return { success: true };

    } catch (error) {
      Logger.warning(`Comprehensive verification had issues: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify ABI consistency across mobile and frontend
   */
  async verifyABIConsistency() {
    Logger.header("ABI Consistency Verification");

    try {
      const result = await executeCommand(
        'npx hardhat run scripts/verify-comprehensive.js --network mantaPacificTestnet',
        'Checking ABI consistency',
        { silent: true }
      );

      // Parse the output to get results
      const abiResults = this.parseABIResults(result.output);

      Logger.success("ABI consistency check completed!");
      return abiResults;

    } catch (error) {
      Logger.error(`ABI verification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse ABI verification results from output
   */
  parseABIResults(output) {
    // Simple parsing - in real implementation, this would be more sophisticated
    const hasError = output.includes('❌') || output.includes('ERROR');
    const hasSuccess = output.includes('✅') && output.includes('PASSED');

    return {
      success: !hasError && hasSuccess,
      mobileApp: { consistent: hasSuccess },
      frontend: { consistent: hasSuccess },
      crossPlatform: { consistent: hasSuccess }
    };
  }

  /**
   * Check verification prerequisites
   */
  checkVerificationPrerequisites() {
    Logger.section("Checking Verification Prerequisites");

    const issues = [];

    // Check if contracts are deployed
    if (!fileExists('deployed-contracts.json')) {
      issues.push('No deployed contracts found (run deployment first)');
    }

    // Check if compiled artifacts exist
    if (!fileExists('artifacts')) {
      issues.push('No compiled artifacts found (run compilation first)');
    }

    // Check network configuration
    const networkInfo = getNetworkInfo();
    if (!networkInfo.contracts) {
      issues.push('Invalid network configuration');
    }

    if (issues.length > 0) {
      Logger.error("Verification prerequisites not met:");
      issues.forEach(issue => {
        console.log(`  ❌ ${issue}`);
      });
      return false;
    }

    Logger.success("All verification prerequisites satisfied!");
    return true;
  }

  /**
   * Get verification status
   */
  getVerificationStatus() {
    const status = {
      hasDeployedContracts: fileExists('deployed-contracts.json'),
      hasArtifacts: fileExists('artifacts'),
      hasMobileABIs: fileExists('EduVerseApp/src/constants/abi/contract-addresses.json'),
      hasFrontendABIs: fileExists('frontend_website/eduverse/abis/contract-addresses.json'),
      networkCompatible: this.checkNetworkCompatibility()
    };

    // Check ABI file consistency
    status.abiConsistency = this.checkABIFileConsistency();

    return status;
  }

  /**
   * Check network compatibility for verification
   */
  checkNetworkCompatibility() {
    const networkInfo = getNetworkInfo();
    return networkInfo.deployed === 'mantaPacificTestnet';
  }

  /**
   * Check if ABI files are consistent
   */
  checkABIFileConsistency() {
    try {
      const mobileAddresses = readJsonFile('EduVerseApp/src/constants/abi/contract-addresses.json');
      const frontendAddresses = readJsonFile('frontend_website/eduverse/abis/contract-addresses.json');

      if (!mobileAddresses || !frontendAddresses) {
        return false;
      }

      // Check if addresses match
      const mobileAddr = mobileAddresses.addresses;
      const frontendAddr = frontendAddresses.addresses;

      return JSON.stringify(mobileAddr) === JSON.stringify(frontendAddr);

    } catch (error) {
      Logger.warning(`Could not check ABI consistency: ${error.message}`);
      return false;
    }
  }

  /**
   * Display verification status
   */
  displayStatus() {
    Logger.header("Verification Status");

    const status = this.getVerificationStatus();

    Logger.section("Prerequisites");
    console.log(`  Deployed Contracts: ${status.hasDeployedContracts ? '✅' : '❌'}`);
    console.log(`  Compiled Artifacts: ${status.hasArtifacts ? '✅' : '❌'}`);
    console.log(`  Network Compatible: ${status.networkCompatible ? '✅' : '❌'}`);

    Logger.section("ABI Files");
    console.log(`  Mobile App ABIs: ${status.hasMobileABIs ? '✅' : '❌'}`);
    console.log(`  Frontend ABIs: ${status.hasFrontendABIs ? '✅' : '❌'}`);
    console.log(`  ABI Consistency: ${status.abiConsistency ? '✅' : '❌'}`);

    const canVerify = status.hasDeployedContracts && status.hasArtifacts;

    Logger.section("Verification Readiness");
    console.log(`  Ready for Verification: ${canVerify ? '✅' : '❌'}`);

    if (!canVerify) {
      Logger.warning("Run deployment first before verification");
    }

    return status;
  }

  /**
   * Generate verification report
   */
  generateVerificationReport(blockchainResults, abiResults) {
    Logger.header("Verification Report");

    Logger.section("Blockchain Verification");
    if (blockchainResults.success) {
      Logger.success("All contracts verified on Manta Pacific Explorer");
    } else {
      Logger.warning("Blockchain verification had issues");
      if (blockchainResults.error) {
        console.log(`  Error: ${blockchainResults.error}`);
      }
    }

    Logger.section("ABI Consistency");
    if (abiResults.success) {
      Logger.success("ABI files are consistent across all platforms");
    } else {
      Logger.warning("ABI consistency issues detected");
      if (abiResults.error) {
        console.log(`  Error: ${abiResults.error}`);
      }
    }

    const overallSuccess = blockchainResults.success && abiResults.success;

    Logger.section("Overall Result");
    if (overallSuccess) {
      Logger.success("🎉 All verifications passed successfully!");
    } else {
      Logger.warning("⚠️  Some verifications need attention");
    }

    return { blockchain: blockchainResults, abi: abiResults, overall: overallSuccess };
  }

  /**
   * Quick verification check
   */
  async quickCheck() {
    Logger.header("Quick Verification Check");

    try {
      // Just run ABI consistency check (faster)
      await this.verifyABIConsistency();

      // Check network info
      const networkInfo = getNetworkInfo();
      Logger.info(`Network: ${networkInfo.deployed} (${networkInfo.chainId})`);

      Logger.success("Quick check completed!");
      return true;

    } catch (error) {
      Logger.error(`Quick check failed: ${error.message}`);
      return false;
    }
  }
}

// ==================== EXPORTS ====================

module.exports = {
  VerificationManager
};
