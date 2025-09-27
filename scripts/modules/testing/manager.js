/**
 * EduVerse Testing Module
 * Handles all testing-related operations
 */

const { Logger, executeCommand, getNetworkInfo, fileExists, validateMantaNetwork } = require('../../core/system');

class TestingManager {
  constructor() {
    this.testResults = {};
    this.testScripts = {
      interactive: 'testnet-interact.js',
      courseExploration: 'testing-explore-courses.js',
      licenseSystem: 'testing-my-licenses.js',
      courseUpdate: 'update_course.js'
    };
  }

  /**
   * Generic test executor with network validation
   */
  async executeTest(testName, scriptName, description) {
    Logger.header(description);

    try {
      // Validate network before testing
      if (!this.validateTestNetwork()) {
        throw new Error("Invalid network configuration for testing");
      }

      await executeCommand(
        `npx hardhat run scripts/${scriptName} --network mantaPacificTestnet`,
        description
      );

      Logger.success(`${description} completed!`);
      this.testResults[testName] = { success: true, timestamp: new Date() };
      return true;

    } catch (error) {
      Logger.error(`${description} failed: ${error.message}`);
      this.testResults[testName] = { success: false, error: error.message, timestamp: new Date() };
      return false;
    }
  }

  /**
   * Validate network configuration for testing
   */
  validateTestNetwork() {
    const validation = validateMantaNetwork();

    if (!validation.valid) {
      Logger.error(`Testing requires Manta Pacific Sepolia Testnet`);
      Logger.error(validation.error);
      return false;
    }

    return true;
  }

  /**
   * Run interactive contract testing
   */
  async runInteractiveTest() {
    return await this.executeTest(
      'interactive',
      this.testScripts.interactive,
      'Interactive Contract Testing'
    );
  }

  /**
   * Test course exploration functionality
   */
  async testCourseExploration() {
    return await this.executeTest(
      'courseExploration',
      this.testScripts.courseExploration,
      'Course Exploration Testing'
    );
  }

  /**
   * Test license functionality
   */
  async testLicenseSystem() {
    return await this.executeTest(
      'licenseSystem',
      this.testScripts.licenseSystem,
      'License System Testing'
    );
  }

  /**
   * Test course update functionality
   */
  async testCourseUpdate() {
    return await this.executeTest(
      'courseUpdate',
      this.testScripts.courseUpdate,
      'Course Update Testing'
    );
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
