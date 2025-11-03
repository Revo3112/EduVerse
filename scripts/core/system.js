/**
 * EduVerse Core System - Base utilities dan common functions
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// ==================== CONSTANTS ====================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Project root path resolver
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Centralized path configuration
const PATHS = {
  deployedContracts: path.join(PROJECT_ROOT, 'deployed-contracts.json'),
  artifacts: path.join(PROJECT_ROOT, 'artifacts/contracts'),
  mobileAbi: path.join(PROJECT_ROOT, 'EduVerseApp/src/constants/abi'),
  mobileAddresses: path.join(PROJECT_ROOT, 'EduVerseApp/src/constants/abi/contract-addresses.json'),
  mobileEnv: path.join(PROJECT_ROOT, 'EduVerseApp/.env'),
  frontendAbi: path.join(PROJECT_ROOT, 'eduweb/abis'),
  frontendAddresses: path.join(PROJECT_ROOT, 'eduweb/abis/contract-addresses.json')
};

const NETWORK_CONFIG = {
  mantaPacificTestnet: {
    name: "mantaPacificTestnet",
    displayName: "Manta Pacific Sepolia Testnet",
    chainId: 3441006,
    rpcUrl: "https://pacific-rpc.sepolia-testnet.manta.network/http",
    explorerUrl: "https://pacific-explorer.sepolia-testnet.manta.network",
    currency: "ETH"
  }
};

// Singleton readline interface to prevent resource leaks
let readlineInstance = null;

function getReadlineInterface() {
  if (!readlineInstance) {
    const readline = require('readline');
    readlineInstance = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Cleanup on process exit
    process.on('exit', () => {
      if (readlineInstance) {
        readlineInstance.close();
        readlineInstance = null;
      }
    });
  }
  return readlineInstance;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Validate network configuration for Manta Pacific Sepolia Testnet
 */
function validateMantaNetwork() {
  const networkInfo = getNetworkInfo();
  const expectedConfig = NETWORK_CONFIG.mantaPacificTestnet;

  if (!networkInfo.chainId || networkInfo.chainId !== expectedConfig.chainId) {
    return {
      valid: false,
      error: `Invalid Chain ID. Expected: ${expectedConfig.chainId}, Got: ${networkInfo.chainId}`,
      expected: expectedConfig,
      current: networkInfo
    };
  }

  return {
    valid: true,
    config: expectedConfig,
    message: `Network validation passed - ${expectedConfig.displayName}`
  };
}

/**
 * Colorize text for console output
 */
function colorize(text, color) {
  return `${COLORS[color] || COLORS.white}${text}${COLORS.reset}`;
}

/**
 * Enhanced logging with different levels
 */
class Logger {
  static info(message) {
    console.log(colorize(`ℹ️  ${message}`, 'blue'));
  }

  static success(message) {
    console.log(colorize(`✅ ${message}`, 'green'));
  }

  static warning(message) {
    console.log(colorize(`⚠️  ${message}`, 'yellow'));
  }

  static error(message) {
    console.log(colorize(`❌ ${message}`, 'red'));
  }

  static step(step, total, message) {
    console.log(colorize(`📋 Step ${step}/${total}: ${message}`, 'cyan'));
  }

  static header(title) {
    const line = '='.repeat(60);
    console.log('\n' + colorize(line, 'cyan'));
    console.log(colorize(`🚀 ${title}`, 'bright'));
    console.log(colorize(line, 'cyan') + '\n');
  }

  static section(title) {
    console.log(colorize(`\n📋 ${title}`, 'yellow'));
    console.log(colorize('-'.repeat(40), 'yellow'));
  }

  static separator() {
    console.log(colorize('-'.repeat(60), 'dim'));
  }
}

/**
 * Execute command with enhanced logging and error handling
 */
function executeCommand(command, description, options = {}) {
  return new Promise((resolve, reject) => {
    Logger.info(`Executing: ${description}`);
    console.log(colorize(`📝 Command: ${command}`, 'dim'));

    // Use shell-appropriate execution based on platform
    const isWindows = process.platform === 'win32';
    const child = spawn(isWindows ? 'cmd' : 'sh', [isWindows ? '/c' : '-c', command], {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: process.cwd(),
      ...options
    });

    let output = '';
    let errorOutput = '';

    if (options.silent) {
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        Logger.success(`${description} completed successfully!`);
        resolve({ output, code });
      } else {
        Logger.error(`${description} failed with code ${code}`);
        if (options.silent && errorOutput) {
          console.log(colorize('Error output:', 'red'));
          console.log(errorOutput);
        }
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      Logger.error(`Error executing command: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Get network information from deployed contracts
 */
function getNetworkInfo() {
  try {
    const deployedContracts = JSON.parse(fs.readFileSync(PATHS.deployedContracts, 'utf8'));

    // Determine current network dynamically based on environment
    let currentNetwork = 'hardhat'; // default
    if (process.env.HARDHAT_NETWORK) {
      currentNetwork = process.env.HARDHAT_NETWORK;
    } else if (deployedContracts.network) {
      currentNetwork = deployedContracts.network;
    }

    return {
      current: currentNetwork,
      deployed: deployedContracts.network,
      chainId: deployedContracts.chainId,
      compatible: currentNetwork === deployedContracts.network || currentNetwork === 'hardhat',
      contracts: deployedContracts
    };
  } catch (error) {
    return {
      current: 'hardhat',
      deployed: 'unknown',
      chainId: 'unknown',
      compatible: false,
      contracts: null
    };
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Read JSON file safely
 */
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    Logger.warning(`Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Write JSON file safely
 */
function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    Logger.error(`Could not write ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Create directory if it doesn't exist
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    Logger.info(`Created directory: ${dirPath}`);
    return true;
  }
  return false;
}

/**
 * Get project status overview
 */
function getProjectStatus() {
  const status = {
    deployedContracts: fileExists(PATHS.deployedContracts),
    mobileAbiFiles: fileExists(PATHS.mobileAddresses),
    frontendAbiFiles: fileExists(PATHS.frontendAddresses),
    mobileEnvFile: fileExists(PATHS.mobileEnv),
    compiledContracts: fileExists(PATHS.artifacts),
    networkInfo: getNetworkInfo()
  };

  status.overall = Object.values(status).filter(v => typeof v === 'boolean').every(Boolean);

  return status;
}

/**
 * Display project status in a formatted way
 */
function displayProjectStatus() {
  const status = getProjectStatus();

  Logger.header("Project Status Overview");

  Logger.section("Core Files");
  console.log(`  Deployed Contracts: ${status.deployedContracts ? '✅' : '❌'}`);
  console.log(`  Compiled Artifacts: ${status.compiledContracts ? '✅' : '❌'}`);

  Logger.section("Mobile App");
  console.log(`  ABI Files: ${status.mobileAbiFiles ? '✅' : '❌'}`);
  console.log(`  Environment: ${status.mobileEnvFile ? '✅' : '❌'}`);

  Logger.section("Frontend");
  console.log(`  ABI Files: ${status.frontendAbiFiles ? '✅' : '❌'}`);

  Logger.section("Network");
  const networkInfo = status.networkInfo;
  console.log(`  Current: ${networkInfo.current}`);
  console.log(`  Deployed: ${networkInfo.deployed} (${networkInfo.chainId})`);
  console.log(`  Compatible: ${networkInfo.compatible ? '✅' : '❌'}`);

  Logger.section("Overall Status");
  console.log(`  ${status.overall ? '🎉 All systems ready!' : '⚠️  Some components need attention'}`);

  return status;
}

/**
 * Pause execution and wait for user input
 */
function pause(message = 'Press Enter to continue...') {
  return new Promise(resolve => {
    const rl = getReadlineInterface();
    rl.question(colorize(message, 'yellow'), () => {
      resolve();
    });
  });
}

/**
 * Get user input
 */
function getUserInput(question) {
  return new Promise(resolve => {
    const rl = getReadlineInterface();
    rl.question(colorize(question, 'cyan'), (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Validate network compatibility
 */
function validateNetworkCompatibility() {
  const networkInfo = getNetworkInfo();

  if (networkInfo.current === 'hardhat' && networkInfo.deployed !== 'hardhat') {
    Logger.warning('Network mismatch detected!');
    Logger.info(`Current: ${networkInfo.current}`);
    Logger.info(`Deployed: ${networkInfo.deployed}`);
    Logger.info('Recommendation: Use --network mantaPacificTestnet for blockchain operations');
    return false;
  }

  return true;
}

// ==================== EXPORTS ====================

module.exports = {
  // Constants
  COLORS,
  NETWORK_CONFIG,
  PATHS,
  PROJECT_ROOT,

  // Classes
  Logger,

  // Core functions
  colorize,
  executeCommand,
  getNetworkInfo,
  fileExists,
  readJsonFile,
  writeJsonFile,
  ensureDirectory,
  getProjectStatus,
  displayProjectStatus,
  pause,
  getUserInput,
  validateNetworkCompatibility,
  validateMantaNetwork,
  getReadlineInterface
};
