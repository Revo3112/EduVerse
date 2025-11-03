// ============================================================================
// Validate Events Script
// This script validates that all required events are present in contract ABIs
// ============================================================================

const fs = require('fs');
const path = require('path');

// Contract definitions with required events
const contracts = [
  {
    name: 'CourseFactory',
    abiPath: '../abis/coursefactory.json',
    requiredEvents: [
      'CourseCreated',
      'CourseUpdated',
      'CourseDeleted',
      'SectionAdded',
      'SectionDeleted',
      'CourseRated',
      'BatchSectionsAdded',
      'SectionUpdated',
      'SectionsSwapped',
      'CourseUnpublished',
      'CourseRepublished',
      'RatingUpdated',
      'RatingDeleted'
    ]
  },
  {
    name: 'CourseLicense',
    abiPath: '../abis/courselicense.json',
    requiredEvents: [
      'LicenseMinted',
      'LicenseRenewed',
      'LicenseExpired',
      'RevenueRecorded'
    ]
  },
  {
    name: 'ProgressTracker',
    abiPath: '../abis/progresstracker.json',
    requiredEvents: [
      'SectionCompleted',
      'CourseCompleted',
      'ProgressReset',
      'SectionStarted'
    ]
  },
  {
    name: 'CertificateManager',
    abiPath: '../abis/certificatemanager.json',
    requiredEvents: [
      'CertificateMinted',
      'CourseAddedToCertificate',
      'CertificatePaymentRecorded',
      'CertificateUpdated',
      'CertificateRevoked',
      'CertificateReactivated',
      'CertificateTransferred',
      'CertificateBurned'
    ]
  }
];

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function validateEvents() {
  console.log(`${colors.bright}🔍 Starting event validation...${colors.reset}\n`);

  let hasErrors = false;

  contracts.forEach(({ name, abiPath, requiredEvents }) => {
    console.log(`${colors.blue}Checking ${name}...${colors.reset}`);

    try {
      // Read and parse ABI file
      const abiFile = path.join(__dirname, abiPath);
      const abiData = JSON.parse(fs.readFileSync(abiFile, 'utf8'));

      // Extract event names from ABI
      const events = abiData
        .filter(item => item.type === 'event')
        .map(e => e.name);

      console.log(`Found ${events.length} events in ABI`);

      // Check for missing events
      const missingEvents = requiredEvents.filter(required => !events.includes(required));

      // Check for extra events that might need handling
      const extraEvents = events.filter(found => !requiredEvents.includes(found));

      if (missingEvents.length > 0) {
        console.error(`${colors.red}❌ Missing required events:${colors.reset}`);
        missingEvents.forEach(event => {
          console.error(`   - ${event}`);
        });
        hasErrors = true;
      }

      if (extraEvents.length > 0) {
        console.log(`${colors.yellow}⚠️  Found additional events that might need handling:${colors.reset}`);
        extraEvents.forEach(event => {
          console.log(`   + ${event}`);
        });
      }

      // List all validated events
      console.log(`\n${colors.green}✓ Validated events:${colors.reset}`);
      requiredEvents.forEach(event => {
        if (events.includes(event)) {
          console.log(`   ✓ ${event}`);
        }
      });

      console.log(''); // Empty line for readability

    } catch (error) {
      console.error(`${colors.red}Error processing ${name}:${colors.reset}`, error.message);
      hasErrors = true;
    }
  });

  // Final status
  if (hasErrors) {
    console.error(`\n${colors.red}${colors.bright}❌ Validation failed! Some required events are missing.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bright}✅ All required events validated successfully!${colors.reset}`);
  }
}

// Run validation
validateEvents();
