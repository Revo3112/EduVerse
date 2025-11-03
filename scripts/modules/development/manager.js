/**
 * EduVerse Development Module
 * Handles development-related operations (compile, clean, test, etc.)
 */

const { Logger, executeCommand, fileExists } = require('../../core/system');

class DevelopmentManager {
  constructor() {
    this.developmentHistory = [];
  }

  /**
   * Compile smart contracts
   */
  async compile() {
    Logger.header("Contract Compilation");

    try {
      await executeCommand('npx hardhat compile', 'Compiling smart contracts');
      Logger.success("Contract compilation completed!");
      return true;

    } catch (error) {
      Logger.error(`Compilation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean compiled artifacts
   */
  async clean() {
    Logger.header("Cleaning Build Artifacts");

    try {
      await executeCommand('npx hardhat clean', 'Cleaning compiled artifacts');
      Logger.success("Cleanup completed!");
      return true;

    } catch (error) {
      Logger.error(`Cleanup failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Run unit tests
   */
  async runUnitTests() {
    Logger.header("Unit Testing");

    try {
      await executeCommand('npx hardhat test', 'Running unit tests');
      Logger.success("Unit tests completed!");
      return true;

    } catch (error) {
      Logger.error(`Unit tests failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Start local Hardhat node
   */
  async startLocalNode() {
    Logger.header("Starting Local Hardhat Node");

    try {
      Logger.info("Starting local blockchain node...");
      Logger.warning("This will run in the background. Press Ctrl+C to stop.");

      await executeCommand('npx hardhat node', 'Starting local node');
      return true;

    } catch (error) {
      Logger.error(`Failed to start local node: ${error.message}`);
      return false;
    }
  }

  /**
   * Open Hardhat console
   */
  async openConsole() {
    Logger.header("Opening Hardhat Console");

    try {
      Logger.info("Opening interactive console...");
      await executeCommand('npx hardhat console', 'Opening Hardhat console');
      return true;

    } catch (error) {
      Logger.error(`Failed to open console: ${error.message}`);
      return false;
    }
  }

  /**
   * Complete development setup
   */
  async setupDevelopment() {
    Logger.header("Development Environment Setup");

    try {
      // Step 1: Clean previous builds
      Logger.step(1, 3, "Cleaning previous builds");
      await this.clean();

      // Step 2: Compile contracts
      Logger.step(2, 3, "Compiling contracts");
      await this.compile();

      // Step 3: Run tests
      Logger.step(3, 3, "Running unit tests");
      await this.runUnitTests();

      Logger.success("Development setup completed!");
      return true;

    } catch (error) {
      Logger.error(`Development setup failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check development prerequisites
   */
  checkDevelopmentPrerequisites() {
    Logger.section("Checking Development Prerequisites");

    const issues = [];

    // Check if hardhat config exists
    if (!fileExists('hardhat.config.js')) {
      issues.push('Missing hardhat.config.js configuration file');
    }

    // Check if contracts directory exists
    if (!fileExists('contracts')) {
      issues.push('Missing contracts directory');
    }

    // Check if package.json exists
    if (!fileExists('package.json')) {
      issues.push('Missing package.json file');
    }

    // Check if node_modules exists
    if (!fileExists('node_modules')) {
      issues.push('Missing node_modules (run npm install)');
    }

    if (issues.length > 0) {
      Logger.error("Development prerequisites not met:");
      issues.forEach(issue => {
        console.log(`  ❌ ${issue}`);
      });
      return false;
    }

    Logger.success("All development prerequisites satisfied!");
    return true;
  }

  /**
   * Get development status
   */
  getDevelopmentStatus() {
    const status = {
      hasHardhatConfig: fileExists('hardhat.config.js'),
      hasContracts: fileExists('contracts'),
      hasPackageJson: fileExists('package.json'),
      hasNodeModules: fileExists('node_modules'),
      hasCompiledArtifacts: fileExists('artifacts'),
      hasTestFiles: fileExists('test'),
      hasCache: fileExists('cache')
    };

    // Check if contracts need compilation
    status.needsCompilation = this.checkIfCompilationNeeded();

    // Overall readiness
    status.developmentReady = status.hasHardhatConfig &&
                             status.hasContracts &&
                             status.hasNodeModules;

    return status;
  }

  /**
   * Check if contracts need compilation
   */
  checkIfCompilationNeeded() {
    if (!fileExists('artifacts')) {
      return true;
    }

    // Simple check: if contracts folder is newer than artifacts
    try {
      const contractsStats = require('fs').statSync('contracts');
      const artifactsStats = require('fs').statSync('artifacts');

      return contractsStats.mtime > artifactsStats.mtime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Display development status
   */
  displayStatus() {
    Logger.header("Development Status");

    const status = this.getDevelopmentStatus();

    Logger.section("Project Structure");
    console.log(`  Hardhat Config: ${status.hasHardhatConfig ? '✅' : '❌'}`);
    console.log(`  Contracts Directory: ${status.hasContracts ? '✅' : '❌'}`);
    console.log(`  Package Configuration: ${status.hasPackageJson ? '✅' : '❌'}`);
    console.log(`  Dependencies Installed: ${status.hasNodeModules ? '✅' : '❌'}`);

    Logger.section("Build Status");
    console.log(`  Compiled Artifacts: ${status.hasCompiledArtifacts ? '✅' : '❌'}`);
    console.log(`  Test Files: ${status.hasTestFiles ? '✅' : '❌'}`);
    console.log(`  Build Cache: ${status.hasCache ? '✅' : '❌'}`);

    Logger.section("Development Readiness");
    console.log(`  Ready for Development: ${status.developmentReady ? '✅' : '❌'}`);
    console.log(`  Needs Compilation: ${status.needsCompilation ? '⚠️  Yes' : '✅ No'}`);

    if (!status.developmentReady) {
      Logger.warning("Development environment not ready. Run npm install first.");
    }

    if (status.needsCompilation) {
      Logger.info("💡 Tip: Run compilation to update artifacts");
    }

    return status;
  }

  /**
   * Development workflow helper
   */
  async developmentWorkflow() {
    Logger.header("Development Workflow Assistant");

    const status = this.getDevelopmentStatus();

    if (!status.developmentReady) {
      Logger.error("Development environment not ready!");
      return false;
    }

    Logger.info("Available development actions:");
    console.log("  1. Clean and compile contracts");
    console.log("  2. Run unit tests");
    console.log("  3. Start local blockchain node");
    console.log("  4. Open interactive console");
    console.log("  5. Complete development setup");

    return true;
  }

  /**
   * Quick development check
   */
  async quickCheck() {
    Logger.header("Quick Development Check");

    const status = this.getDevelopmentStatus();

    Logger.section("Environment Status");
    console.log(`  Development Ready: ${status.developmentReady ? '✅' : '❌'}`);

    if (status.needsCompilation) {
      Logger.warning("Contracts need compilation");
      return { ready: status.developmentReady, needsCompilation: true };
    }

    Logger.success("Development environment is ready!");
    return { ready: status.developmentReady, needsCompilation: false };
  }
}

// ==================== EXPORTS ====================

module.exports = {
  DevelopmentManager
};
