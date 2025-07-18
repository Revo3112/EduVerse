/**
 * EduVerse Testing Module
 * Handles all testing-related operations
 */

const { Logger, executeCommand, getNetworkInfo, colors, fileExists } = require('../../core/system');

class TestingManager {
  constructor() {
    this.testResults = {};
  }

  /**
   * Run interactive contract testing
   */
  async runInteractiveTest() {
    Logger.header("Interactive Contract Testing");

    try {
      await executeCommand(
        'npx hardhat run scripts/testnet-interact.js --network mantaPacificTestnet',
        'Running interactive contract tests'
      );

      Logger.success("Interactive testing completed!");
      return true;

    } catch (error) {
      Logger.error(`Interactive testing failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test course exploration functionality
   */
  async testCourseExploration() {
    Logger.header("Course Exploration Testing");

    try {
      await executeCommand(
        'npx hardhat run scripts/testing-explore-courses.js --network mantaPacificTestnet',
        'Testing course exploration'
      );

      Logger.success("Course exploration testing completed!");
      return true;

    } catch (error) {
      Logger.error(`Course exploration testing failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test license functionality
   */
  async testLicenseSystem() {
    Logger.header("License System Testing");

    try {
      await executeCommand(
        'npx hardhat run scripts/testing-my-licenses.js --network mantaPacificTestnet',
        'Testing license functionality'
      );

      Logger.success("License system testing completed!");
      return true;

    } catch (error) {
      Logger.error(`License system testing failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test course update functionality
   */
  async testCourseUpdate() {
    Logger.header("Course Update Testing");

    try {
      await executeCommand(
        'npx hardhat run scripts/update_course.js --network mantaPacificTestnet',
        'Testing course update functionality'
      );

      Logger.success("Course update testing completed!");
      return true;

    } catch (error) {
      Logger.error(`Course update testing failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Run all tests sequentially
   */
  async runAllTests() {
    Logger.header("Complete Testing Suite");

    const tests = [
      { name: 'Interactive Test', method: () => this.runInteractiveTest() },
      { name: 'Course Exploration', method: () => this.testCourseExploration() },
      { name: 'License System', method: () => this.testLicenseSystem() },
      { name: 'Course Update', method: () => this.testCourseUpdate() }
    ];

    const results = {};

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      Logger.step(i + 1, tests.length, `Running ${test.name}`);

      try {
        results[test.name] = await test.method();
      } catch (error) {
        results[test.name] = false;
        Logger.error(`${test.name} failed: ${error.message}`);
      }

      Logger.separator();
    }

    // Generate test report
    this.generateTestReport(results);

    const allPassed = Object.values(results).every(result => result === true);

    if (allPassed) {
      Logger.success("🎉 All tests passed!");
    } else {
      Logger.warning("⚠️  Some tests failed. Check the report above.");
    }

    return results;
  }

  /**
   * Check testing prerequisites
   */
  checkTestingPrerequisites() {
    Logger.section("Checking Testing Prerequisites");

    const issues = [];

    // Check if contracts are deployed
    if (!fileExists('deployed-contracts.json')) {
      issues.push('No deployed contracts found (run deployment first)');
    }

    // Check network compatibility
    const networkInfo = getNetworkInfo();
    if (networkInfo.deployed !== 'mantaPacificTestnet') {
      issues.push('Contracts not deployed to Manta Pacific Testnet');
    }

    // Check if test scripts exist
    const testScripts = [
      'scripts/testnet-interact.js',
      'scripts/testing-explore-courses.js',
      'scripts/testing-my-licenses.js',
      'scripts/update_course.js'
    ];

    testScripts.forEach(script => {
      if (!fileExists(script)) {
        issues.push(`Missing test script: ${script}`);
      }
    });

    if (issues.length > 0) {
      Logger.error("Testing prerequisites not met:");
      issues.forEach(issue => {
        console.log(`  ❌ ${issue}`);
      });
      return false;
    }

    Logger.success("All testing prerequisites satisfied!");
    return true;
  }

  /**
   * Generate test report
   */
  generateTestReport(results) {
    Logger.header("Testing Report");

    Object.entries(results).forEach(([testName, passed]) => {
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`  ${testName}: ${status}`);
    });

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r === true).length;
    const failedTests = totalTests - passedTests;

    Logger.section("Summary");
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests}`);
    console.log(`  Failed: ${failedTests}`);
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    return { total: totalTests, passed: passedTests, failed: failedTests };
  }

  /**
   * Get testing status
   */
  getTestingStatus() {
    const status = {
      hasDeployedContracts: fileExists('deployed-contracts.json'),
      hasTestScripts: this.checkTestScripts(),
      networkCompatible: this.checkNetworkCompatibility(),
      prerequisitesMet: false
    };

    status.prerequisitesMet = status.hasDeployedContracts &&
                             status.hasTestScripts &&
                             status.networkCompatible;

    return status;
  }

  /**
   * Check if test scripts exist
   */
  checkTestScripts() {
    const testScripts = [
      'scripts/testnet-interact.js',
      'scripts/testing-explore-courses.js',
      'scripts/testing-my-licenses.js',
      'scripts/update_course.js'
    ];

    return testScripts.every(script => fileExists(script));
  }

  /**
   * Check network compatibility for testing
   */
  checkNetworkCompatibility() {
    const networkInfo = getNetworkInfo();
    return networkInfo.deployed === 'mantaPacificTestnet';
  }

  /**
   * Display testing status
   */
  displayStatus() {
    Logger.header("Testing Status");

    const status = this.getTestingStatus();

    Logger.section("Prerequisites");
    console.log(`  Deployed Contracts: ${status.hasDeployedContracts ? '✅' : '❌'}`);
    console.log(`  Test Scripts Available: ${status.hasTestScripts ? '✅' : '❌'}`);
    console.log(`  Network Compatible: ${status.networkCompatible ? '✅' : '❌'}`);

    Logger.section("Test Readiness");
    console.log(`  Ready for Testing: ${status.prerequisitesMet ? '✅' : '❌'}`);

    if (!status.prerequisitesMet) {
      Logger.warning("Testing prerequisites not met. Run deployment first.");
    }

    const networkInfo = getNetworkInfo();
    if (networkInfo.contracts) {
      Logger.section("Network Information");
      console.log(`  Network: ${networkInfo.deployed}`);
      console.log(`  Chain ID: ${networkInfo.chainId}`);
    }

    return status;
  }
}

// ==================== EXPORTS ====================

module.exports = {
  TestingManager
};
