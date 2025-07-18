#!/usr/bin/env node
/**
 * EduVerse Quick Actions - Simplified CLI for common tasks
 * Updated to use enhanced modular system
 */

const { Logger, executeCommand, colorize } = require('./core/system');
const fs = require("fs");

// Quick action definitions
const QUICK_ACTIONS = {
  'full-deploy': {
    name: '🚀 Full Deploy & Verify',
    description: 'Deploy contracts + verify + export ABIs',
    commands: [
      { cmd: 'npm run compile', desc: 'Compiling contracts' },
      { cmd: 'npm run deploy', desc: 'Deploying to Manta Pacific' },
      { cmd: 'npm run verify:comprehensive', desc: 'Verifying contracts' },
      { cmd: 'npm run setup:mobile', desc: 'Setting up mobile app' }
    ]
  },
  'quick-verify': {
    name: '🔍 Quick Verification',
    description: 'Complete verification check',
    commands: [
      { cmd: 'npm run verify:comprehensive', desc: 'Complete verification' }
    ]
  },
  'sync-abis': {
    name: '📱 Sync ABIs',
    description: 'Export and sync all ABI files',
    commands: [
      { cmd: 'npm run export:abi', desc: 'Exporting ABI files' },
      { cmd: 'npm run update:env', desc: 'Updating environment' }
    ]
  },
  'dev-setup': {
    name: '⚙️ Development Setup',
    description: 'Setup everything for development',
    commands: [
      { cmd: 'npm run compile', desc: 'Compiling contracts' },
      { cmd: 'npm run verify:abi', desc: 'Checking ABI consistency' },
      { cmd: 'npm run setup:mobile', desc: 'Setting up mobile app' }
    ]
  },
  'status-check': {
    name: '📊 Status Check',
    description: 'Check project status',
    commands: [
      { cmd: 'npm run verify:abi', desc: 'Checking ABI consistency' },
      { cmd: 'npm run network', desc: 'Checking network info' }
    ]
  }
};

async function runQuickAction(actionKey) {
  const action = QUICK_ACTIONS[actionKey];
  if (!action) {
    Logger.error(`Unknown action: ${actionKey}`);
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log(colorize(`🚀 ${action.name}`, 'cyan'));
  console.log(colorize(`📝 ${action.description}`, 'blue'));
  console.log('='.repeat(60));

  for (let i = 0; i < action.commands.length; i++) {
    const { cmd, desc } = action.commands[i];

    console.log(`\n${colorize(`Step ${i + 1}/${action.commands.length}:`, 'yellow')} ${desc}`);

    try {
      await executeCommand(cmd, desc);
    } catch (error) {
      Logger.error(`Failed at step ${i + 1}: ${error.message}`);
      Logger.error('Stopping execution due to error.');
      return;
    }
  }

  Logger.success('All steps completed successfully! 🎉');
}

// Show usage help
function showHelp() {
  Logger.header('EduVerse Quick Actions');

  console.log('\n' + colorize('Usage:', 'yellow'));
  console.log('  npm run quick <action>');
  console.log('  node scripts/quick.js <action>');

  console.log('\n' + colorize('Available Actions:', 'yellow'));
  Object.entries(QUICK_ACTIONS).forEach(([key, action]) => {
    console.log(`  ${colorize(key.padEnd(15), 'green')} ${action.name}`);
    console.log(`  ${' '.repeat(15)} ${colorize(action.description, 'blue')}`);
  });

  console.log('\n' + colorize('Examples:', 'yellow'));
  console.log('  npm run quick full-deploy    # Deploy everything');
  console.log('  npm run quick quick-verify   # Just verify');
  console.log('  npm run quick sync-abis      # Sync ABI files');
  console.log('  npm run quick status-check   # Check status');

  console.log('\n' + colorize('For professional portal, use:', 'yellow'));
  console.log('  npm run portal              # Main portal interface');
}

// Main function
async function main() {
  const action = process.argv[2];

  if (!action || action === 'help' || action === '--help' || action === '-h') {
    showHelp();
    return;
  }

  if (!QUICK_ACTIONS[action]) {
    Logger.error(`Unknown action: ${action}`);
    showHelp();
    process.exit(1);
  }

  await runQuickAction(action);
}

// Error handling
process.on('uncaughtException', (error) => {
  Logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Logger.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    Logger.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runQuickAction, QUICK_ACTIONS };
