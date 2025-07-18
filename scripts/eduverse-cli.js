#!/usr/bin/env node
/**
 * EduVerse CLI - Unified Development Tool
 * Menggabungkan semua script development dalam satu interface
 */

const fs = require("fs");
const path = require("path");
const { spawn, exec } = require("child_process");
const readline = require("readline");

// Color constants for better UX
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'white') {
  console.log(colorize(message, color));
}

function header(title) {
  const line = '='.repeat(60);
  console.log('\n' + colorize(line, 'cyan'));
  console.log(colorize(`🚀 ${title}`, 'bright'));
  console.log(colorize(line, 'cyan') + '\n');
}

function section(title) {
  console.log(colorize(`\n📋 ${title}`, 'yellow'));
  console.log(colorize('-'.repeat(40), 'yellow'));
}

// Network information
function getNetworkInfo() {
  try {
    const deployedContracts = JSON.parse(fs.readFileSync('deployed-contracts.json', 'utf8'));
    return {
      current: 'hardhat',
      deployed: deployedContracts.network,
      chainId: deployedContracts.chainId,
      compatible: false
    };
  } catch (error) {
    return {
      current: 'hardhat',
      deployed: 'unknown',
      chainId: 'unknown',
      compatible: false
    };
  }
}

// Execute command with proper handling
function executeCommand(command, description) {
  return new Promise((resolve, reject) => {
    log(`\n🔄 ${description}...`, 'cyan');
    log(`📝 Command: ${command}`, 'blue');

    const child = spawn('cmd', ['/c', command], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${description} completed successfully!`, 'green');
        resolve();
      } else {
        log(`❌ ${description} failed with code ${code}`, 'red');
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      log(`❌ Error executing command: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Main menu options
const MENU_OPTIONS = {
  // 1. DEPLOYMENT GROUP
  deployment: {
    title: "🚀 DEPLOYMENT OPERATIONS",
    options: {
      '1': {
        name: 'Deploy Complete System',
        command: 'npm run deploy',
        description: 'Deploy semua contracts ke Manta Pacific Testnet'
      },
      '2': {
        name: 'Deploy Separated (Reuse existing)',
        command: 'npm run deploy:separated',
        description: 'Deploy dengan reuse existing contracts'
      },
      '3': {
        name: 'Deploy to Local Network',
        command: 'npm run deploy:local',
        description: 'Deploy ke localhost untuk development'
      }
    }
  },

  // 2. VERIFICATION GROUP
  verification: {
    title: "🔍 VERIFICATION OPERATIONS",
    options: {
      '1': {
        name: 'Complete Verification',
        command: 'npm run verify:comprehensive',
        description: 'Verifikasi blockchain + ABI consistency (RECOMMENDED)'
      },
      '2': {
        name: 'Blockchain Verification Only',
        command: 'npm run verify',
        description: 'Verifikasi contracts di blockchain explorer'
      },
      '3': {
        name: 'ABI Consistency Check',
        command: 'npm run verify:abi',
        description: 'Check konsistensi ABI antara mobile & frontend'
      }
    }
  },

  // 3. TESTING GROUP
  testing: {
    title: "🧪 TESTING OPERATIONS",
    options: {
      '1': {
        name: 'Interactive Contract Testing',
        command: 'npm run test:interact',
        description: 'Test interaksi dengan contracts'
      },
      '2': {
        name: 'Course Exploration Test',
        command: 'npm run test:courses',
        description: 'Test course exploration functionality'
      },
      '3': {
        name: 'License System Test',
        command: 'npm run test:licenses',
        description: 'Test license functionality'
      },
      '4': {
        name: 'Course Update Test',
        command: 'npm run test:update',
        description: 'Test course update functionality'
      }
    }
  },

  // 4. UTILITIES GROUP
  utilities: {
    title: "🛠️ UTILITY OPERATIONS",
    options: {
      '1': {
        name: 'Export ABI Files',
        command: 'npm run export:abi',
        description: 'Export ABI files ke mobile app & frontend'
      },
      '2': {
        name: 'Update Mobile Environment',
        command: 'npm run update:env',
        description: 'Update mobile app environment variables'
      },
      '3': {
        name: 'Complete Mobile Setup',
        command: 'npm run setup:mobile',
        description: 'Export ABI + update environment (All-in-one)'
      },
      '4': {
        name: 'Network Information',
        command: 'npm run network',
        description: 'Show network compatibility info'
      }
    }
  },

  // 5. DEVELOPMENT GROUP
  development: {
    title: "⚙️ DEVELOPMENT OPERATIONS",
    options: {
      '1': {
        name: 'Compile Contracts',
        command: 'npm run compile',
        description: 'Compile semua smart contracts'
      },
      '2': {
        name: 'Clean Build Files',
        command: 'npm run clean',
        description: 'Clean compiled artifacts'
      },
      '3': {
        name: 'Run Tests',
        command: 'npm run test',
        description: 'Run unit tests'
      },
      '4': {
        name: 'Start Local Node',
        command: 'npm run node',
        description: 'Start Hardhat local blockchain node'
      }
    }
  }
};

// Display main menu
function displayMainMenu() {
  header("EduVerse Development CLI");

  const networkInfo = getNetworkInfo();
  section("Network Status");
  log(`📡 Current: ${networkInfo.current}`, 'blue');
  log(`🚀 Deployed: ${networkInfo.deployed} (${networkInfo.chainId})`, 'green');
  log(`🔗 Compatible: ${networkInfo.compatible ? '✅' : '❌'}`, networkInfo.compatible ? 'green' : 'red');

  section("Available Operations");
  console.log(colorize('1.', 'cyan') + ' 🚀 Deployment Operations');
  console.log(colorize('2.', 'cyan') + ' 🔍 Verification Operations');
  console.log(colorize('3.', 'cyan') + ' 🧪 Testing Operations');
  console.log(colorize('4.', 'cyan') + ' 🛠️ Utility Operations');
  console.log(colorize('5.', 'cyan') + ' ⚙️ Development Operations');
  console.log(colorize('6.', 'cyan') + ' 📊 Project Status');
  console.log(colorize('0.', 'red') + ' ❌ Exit');

  console.log('\n' + colorize('Select an option [0-6]:', 'bright'));
}

// Display group menu
function displayGroupMenu(groupKey) {
  const group = Object.values(MENU_OPTIONS)[groupKey - 1];
  header(group.title);

  Object.entries(group.options).forEach(([key, option]) => {
    console.log(colorize(`${key}.`, 'cyan') + ` ${option.name}`);
    console.log(colorize(`   📝 ${option.description}`, 'blue'));
    console.log('');
  });

  console.log(colorize('0.', 'red') + ' ← Back to Main Menu');
  console.log('\n' + colorize('Select an option:', 'bright'));
}

// Show project status
async function showProjectStatus() {
  header("Project Status Overview");

  try {
    // Check deployed contracts
    const deployedContracts = JSON.parse(fs.readFileSync('deployed-contracts.json', 'utf8'));

    section("Deployed Contracts");
    log(`✅ CourseFactory: ${deployedContracts.courseFactory}`, 'green');
    log(`✅ CourseLicense: ${deployedContracts.courseLicense}`, 'green');
    log(`✅ ProgressTracker: ${deployedContracts.progressTracker}`, 'green');
    log(`✅ CertificateManager: ${deployedContracts.certificateManager}`, 'green');
    log(`📅 Deployed: ${new Date(deployedContracts.deployDate).toLocaleString()}`, 'blue');

    section("File Status");
    const files = [
      'EduVerseApp/src/constants/abi/contract-addresses.json',
      'frontend_website/eduverse/abis/contract-addresses.json',
      'EduVerseApp/.env.contracts'
    ];

    files.forEach(file => {
      const exists = fs.existsSync(file);
      log(`${exists ? '✅' : '❌'} ${file}`, exists ? 'green' : 'red');
    });

    section("Quick Actions");
    log('💡 Tip: Use npm shortcuts for faster development:', 'yellow');
    log('   npm run verify:comprehensive  # Complete verification', 'blue');
    log('   npm run setup:mobile         # Setup mobile app', 'blue');
    log('   npm run deploy               # Deploy everything', 'blue');

  } catch (error) {
    log(`❌ Error reading project status: ${error.message}`, 'red');
  }

  console.log('\n' + colorize('Press Enter to continue...', 'yellow'));
  await new Promise(resolve => rl.once('line', resolve));
}

// Handle group selection
async function handleGroupSelection(groupIndex) {
  const groupKeys = Object.keys(MENU_OPTIONS);
  const groupKey = groupKeys[groupIndex - 1];
  const group = MENU_OPTIONS[groupKey];

  while (true) {
    console.clear();
    displayGroupMenu(groupIndex);

    const choice = await new Promise(resolve => {
      rl.question('> ', resolve);
    });

    if (choice === '0') {
      break;
    }

    const option = group.options[choice];
    if (option) {
      console.clear();
      try {
        await executeCommand(option.command, option.name);
        console.log('\n' + colorize('Press Enter to continue...', 'yellow'));
        await new Promise(resolve => rl.once('line', resolve));
      } catch (error) {
        log(`\n❌ Operation failed: ${error.message}`, 'red');
        console.log('\n' + colorize('Press Enter to continue...', 'yellow'));
        await new Promise(resolve => rl.once('line', resolve));
      }
    } else {
      log('❌ Invalid option. Please try again.', 'red');
      setTimeout(() => {}, 1000);
    }
  }
}

// Main application loop
async function main() {
  log('🎉 Welcome to EduVerse Development CLI!', 'green');

  while (true) {
    console.clear();
    displayMainMenu();

    const choice = await new Promise(resolve => {
      rl.question('> ', resolve);
    });

    switch (choice) {
      case '0':
        log('\n👋 Goodbye! Happy coding!', 'green');
        rl.close();
        process.exit(0);
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        await handleGroupSelection(parseInt(choice));
        break;

      case '6':
        console.clear();
        await showProjectStatus();
        break;

      default:
        log('❌ Invalid option. Please try again.', 'red');
        setTimeout(() => {}, 1000);
    }
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection: ${reason}`, 'red');
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n👋 Goodbye! Happy coding!', 'green');
  rl.close();
  process.exit(0);
});

// Start the application
if (require.main === module) {
  main().catch(error => {
    log(`❌ Application error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main, executeCommand };
