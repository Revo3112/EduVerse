#!/usr/bin/env node
/**
 * EduVerse Development Portal
 * Single entry point for all development operations
 * Professional modular architecture with organized folder structure
 */

// ==================== IMPORTS ====================

const readline = require('readline');
const { Logger, displayProjectStatus, pause, getUserInput, colorize } = require('./core/system');
const { DeploymentManager } = require('./modules/deployment/manager');
const { VerificationManager } = require('./modules/verification/manager');
const { TestingManager } = require('./modules/testing/manager');
const { UtilitiesManager } = require('./modules/utilities/manager');
const { DevelopmentManager } = require('./modules/development/manager');

// ==================== PORTAL CLASS ====================

class EduVersePortal {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Initialize managers
    this.deployment = new DeploymentManager();
    this.verification = new VerificationManager();
    this.testing = new TestingManager();
    this.utilities = new UtilitiesManager();
    this.development = new DevelopmentManager();

    // Menu structure
    this.mainMenu = {
      '1': { name: '🚀 Deployment Operations', handler: () => this.deploymentMenu() },
      '2': { name: '🔍 Verification Operations', handler: () => this.verificationMenu() },
      '3': { name: '🧪 Testing Operations', handler: () => this.testingMenu() },
      '4': { name: '🛠️ Utility Operations', handler: () => this.utilitiesMenu() },
      '5': { name: '⚙️ Development Operations', handler: () => this.developmentMenu() },
      '6': { name: '📊 Project Status', handler: () => this.projectStatusMenu() },
      '7': { name: '🔧 Quick Actions', handler: () => this.quickActionsMenu() },
      '0': { name: '❌ Exit', handler: () => this.exit() }
    };
  }

  // ==================== MAIN INTERFACE ====================

  /**
   * Start the portal
   */
  async start() {
    this.displayWelcome();
    await this.mainLoop();
  }

  /**
   * Display welcome message
   */
  displayWelcome() {
    console.clear();
    Logger.header("EduVerse Development Portal");

    console.log(colorize('🎯 Professional Development Environment', 'cyan'));
    console.log(colorize('🏗️ Modular Architecture with Organized Structure', 'blue'));
    console.log(colorize('🚀 Single Portal for All Operations', 'green'));
    console.log('');

    Logger.info('Welcome to the unified development portal!');
    console.log('');
  }

  /**
   * Main application loop
   */
  async mainLoop() {
    while (true) {
      this.displayMainMenu();

      const choice = await this.getUserChoice('Select an option');

      if (this.mainMenu[choice]) {
        console.clear();
        await this.mainMenu[choice].handler();
      } else {
        Logger.error('Invalid option. Please try again.');
        await pause();
      }
    }
  }

  /**
   * Display main menu
   */
  displayMainMenu() {
    console.clear();
    Logger.header("EduVerse Development Portal - Main Menu");

    // Show quick project status
    this.displayQuickStatus();

    Logger.section("Available Operations");
    Object.entries(this.mainMenu).forEach(([key, option]) => {
      const color = key === '0' ? 'red' : 'cyan';
      console.log(`${colorize(key + '.', color)} ${option.name}`);
    });

    console.log('');
  }

  /**
   * Display quick project status
   */
  displayQuickStatus() {
    Logger.section("Quick Status");

    const deploymentStatus = this.deployment.getDeploymentStatus();
    const verificationStatus = this.verification.getVerificationStatus();
    const utilitiesStatus = this.utilities.getUtilitiesStatus();

    console.log(`  📦 Deployed: ${deploymentStatus.hasDeployedContracts ? '✅' : '❌'}`);
    console.log(`  🔍 Verified: ${verificationStatus.networkCompatible ? '✅' : '❌'}`);
    console.log(`  📱 Mobile Ready: ${utilitiesStatus.hasMobileABIs && utilitiesStatus.hasMobileEnv ? '✅' : '❌'}`);
    console.log(`  🌐 Frontend Ready: ${utilitiesStatus.hasFrontendABIs ? '✅' : '❌'}`);

    console.log('');
  }

  // ==================== MENU HANDLERS ====================

  /**
   * Deployment operations menu
   */
  async deploymentMenu() {
    const menu = {
      '1': { name: 'Deploy Complete System', handler: () => this.deployment.deployComplete() },
      '2': { name: 'Deploy to Local Network', handler: () => this.deployment.deployLocal() },
      '3': { name: 'Deploy Separated (Reuse)', handler: () => this.deployment.deploySeparated() },
      '4': { name: 'Check Prerequisites', handler: () => this.deployment.checkPrerequisites() },
      '5': { name: 'Show Deployment Status', handler: () => this.deployment.displayStatus() },
      '6': { name: 'Clean Deployment', handler: () => this.deployment.clean() },
      '0': { name: '← Back to Main Menu', handler: () => true }
    };

    await this.showSubMenu('🚀 Deployment Operations', menu);
  }

  /**
   * Verification operations menu
   */
  async verificationMenu() {
    const menu = {
      '1': { name: 'Complete Verification', handler: () => this.verification.verifyComplete() },
      '2': { name: 'Blockchain Verification', handler: () => this.verification.verifyBlockchain() },
      '3': { name: 'Comprehensive Verification', handler: () => this.verification.verifyComprehensive() },
      '4': { name: 'ABI Consistency Check', handler: () => this.verification.verifyABIConsistency() },
      '5': { name: 'Quick Verification Check', handler: () => this.verification.quickCheck() },
      '6': { name: 'Show Verification Status', handler: () => this.verification.displayStatus() },
      '0': { name: '← Back to Main Menu', handler: () => true }
    };

    await this.showSubMenu('🔍 Verification Operations', menu);
  }

  /**
   * Testing operations menu
   */
  async testingMenu() {
    const menu = {
      '1': { name: 'Run All Tests', handler: () => this.testing.runAllTests() },
      '2': { name: 'Interactive Contract Test', handler: () => this.testing.runInteractiveTest() },
      '3': { name: 'Course Exploration Test', handler: () => this.testing.testCourseExploration() },
      '4': { name: 'License System Test', handler: () => this.testing.testLicenseSystem() },
      '5': { name: 'Course Update Test', handler: () => this.testing.testCourseUpdate() },
      '6': { name: 'Check Testing Prerequisites', handler: () => this.testing.checkTestingPrerequisites() },
      '7': { name: 'Show Testing Status', handler: () => this.testing.displayStatus() },
      '0': { name: '← Back to Main Menu', handler: () => true }
    };

    await this.showSubMenu('🧪 Testing Operations', menu);
  }

  /**
   * Utilities operations menu
   */
  async utilitiesMenu() {
    const menu = {
      '1': { name: 'Complete Mobile Setup', handler: () => this.utilities.setupMobileComplete() },
      '2': { name: 'Export ABI Files', handler: () => this.utilities.exportABIs() },
      '3': { name: 'Update Mobile Environment', handler: () => this.utilities.updateMobileEnvironment() },
      '4': { name: 'Manual ABI Export', handler: () => this.utilities.exportABIsManual() },
      '5': { name: 'Get Network Information', handler: () => this.utilities.getNetworkInfo() },
      '6': { name: 'Show Utilities Status', handler: () => this.utilities.displayStatus() },
      '7': { name: 'Clean Utility Files', handler: () => this.utilities.clean() },
      '0': { name: '← Back to Main Menu', handler: () => true }
    };

    await this.showSubMenu('🛠️ Utility Operations', menu);
  }

  /**
   * Development operations menu
   */
  async developmentMenu() {
    const menu = {
      '1': { name: 'Complete Development Setup', handler: () => this.development.setupDevelopment() },
      '2': { name: 'Compile Contracts', handler: () => this.development.compile() },
      '3': { name: 'Run Unit Tests', handler: () => this.development.runUnitTests() },
      '4': { name: 'Start Local Node', handler: () => this.development.startLocalNode() },
      '5': { name: 'Open Console', handler: () => this.development.openConsole() },
      '6': { name: 'Clean Build', handler: () => this.development.clean() },
      '7': { name: 'Quick Development Check', handler: () => this.development.quickCheck() },
      '8': { name: 'Show Development Status', handler: () => this.development.displayStatus() },
      '0': { name: '← Back to Main Menu', handler: () => true }
    };

    await this.showSubMenu('⚙️ Development Operations', menu);
  }

  /**
   * Project status menu
   */
  async projectStatusMenu() {
    const menu = {
      '1': { name: 'Complete Project Overview', handler: () => displayProjectStatus() },
      '2': { name: 'Deployment Status', handler: () => this.deployment.displayStatus() },
      '3': { name: 'Verification Status', handler: () => this.verification.displayStatus() },
      '4': { name: 'Testing Status', handler: () => this.testing.displayStatus() },
      '5': { name: 'Utilities Status', handler: () => this.utilities.displayStatus() },
      '6': { name: 'Development Status', handler: () => this.development.displayStatus() },
      '0': { name: '← Back to Main Menu', handler: () => true }
    };

    await this.showSubMenu('📊 Project Status', menu);
  }

  /**
   * Quick actions menu
   */
  async quickActionsMenu() {
    const menu = {
      '1': { name: '🚀 Full Deploy & Setup', handler: () => this.quickFullDeploy() },
      '2': { name: '🔍 Complete Verification', handler: () => this.verification.verifyComprehensive() },
      '3': { name: '📱 Sync Mobile App', handler: () => this.utilities.setupMobileComplete() },
      '4': { name: '🧪 Run All Tests', handler: () => this.testing.runAllTests() },
      '5': { name: '⚙️ Development Setup', handler: () => this.development.setupDevelopment() },
      '6': { name: '📊 Quick Status Check', handler: () => this.quickStatusCheck() },
      '0': { name: '← Back to Main Menu', handler: () => true }
    };

    await this.showSubMenu('🔧 Quick Actions', menu);
  }

  // ==================== QUICK ACTIONS ====================

  /**
   * Quick full deployment workflow
   */
  async quickFullDeploy() {
    Logger.header("🚀 Quick Full Deploy & Setup");

    try {
      Logger.step(1, 4, "Complete deployment");
      await this.deployment.deployComplete();

      Logger.step(2, 4, "Comprehensive verification");
      await this.verification.verifyComprehensive();

      Logger.step(3, 4, "Mobile app setup");
      await this.utilities.setupMobileComplete();

      Logger.step(4, 4, "Final status check");
      displayProjectStatus();

      Logger.success("🎉 Full deployment and setup completed!");

    } catch (error) {
      Logger.error(`Full deployment failed: ${error.message}`);
    }
  }

  /**
   * Quick status check across all modules
   */
  async quickStatusCheck() {
    Logger.header("📊 Quick Status Check");

    console.log(colorize('Checking all systems...', 'cyan'));
    console.log('');

    // Check each module
    const deploymentReady = this.deployment.getDeploymentStatus().hasDeployedContracts;
    const verificationReady = this.verification.getVerificationStatus().networkCompatible;
    const utilitiesReady = this.utilities.getUtilitiesStatus().abiConsistency;
    const testingReady = this.testing.getTestingStatus().prerequisitesMet;
    const developmentReady = this.development.getDevelopmentStatus().developmentReady;

    Logger.section("System Health Check");
    console.log(`  🚀 Deployment: ${deploymentReady ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`  🔍 Verification: ${verificationReady ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`  🛠️ Utilities: ${utilitiesReady ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`  🧪 Testing: ${testingReady ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`  ⚙️ Development: ${developmentReady ? '✅ Ready' : '❌ Not Ready'}`);

    const overallHealth = deploymentReady && verificationReady && utilitiesReady;

    Logger.section("Overall Status");
    if (overallHealth) {
      Logger.success("🎉 All systems operational!");
    } else {
      Logger.warning("⚠️  Some systems need attention");
    }

    return overallHealth;
  }

  // ==================== UTILITIES ====================

  /**
   * Show submenu and handle selection
   */
  async showSubMenu(title, menu) {
    while (true) {
      console.clear();
      Logger.header(title);

      Object.entries(menu).forEach(([key, option]) => {
        const color = key === '0' ? 'red' : 'cyan';
        console.log(`${colorize(key + '.', color)} ${option.name}`);
      });

      console.log('');

      const choice = await this.getUserChoice('Select an option');

      if (menu[choice]) {
        if (choice === '0') {
          break; // Return to previous menu
        }

        console.clear();
        try {
          await menu[choice].handler();
        } catch (error) {
          Logger.error(`Operation failed: ${error.message}`);
        }

        await pause();
      } else {
        Logger.error('Invalid option. Please try again.');
        await pause();
      }
    }
  }

  /**
   * Get user choice with validation
   */
  async getUserChoice(prompt) {
    return new Promise(resolve => {
      this.rl.question(colorize(`${prompt}: `, 'bright'), (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Exit the portal
   */
  async exit() {
    console.clear();
    Logger.success("👋 Thank you for using EduVerse Development Portal!");
    console.log('');
    console.log(colorize('🎯 Professional development workflow completed', 'green'));
    console.log(colorize('🏗️ Modular architecture maintained', 'blue'));
    console.log(colorize('🚀 Ready for production deployment', 'cyan'));
    console.log('');
    Logger.info('Happy coding! 🎉');

    this.rl.close();
    process.exit(0);
  }
}

// ==================== ERROR HANDLING ====================

process.on('uncaughtException', (error) => {
  Logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Logger.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n' + colorize('👋 Goodbye! Portal terminated by user.', 'yellow'));
  process.exit(0);
});

// ==================== MAIN EXECUTION ====================

async function main() {
  const portal = new EduVersePortal();
  await portal.start();
}

// Start the portal if this file is run directly
if (require.main === module) {
  main().catch(error => {
    Logger.error(`Portal startup failed: ${error.message}`);
    process.exit(1);
  });
}

// ==================== EXPORTS ====================

module.exports = {
  EduVersePortal
};
