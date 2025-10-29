// ============================================================================
// Verify Indexing Script v1.1.0
// This script verifies that all blockchain events are correctly indexed
// ============================================================================

const { ethers } = require('ethers');
const { request, gql } = require('graphql-request');

// Network Configuration
const MANTA_RPC = 'https://pacific-rpc.sepolia-testnet.manta.network/http';
const SUBGRAPH_URL = process.env.SUBGRAPH_URL || 'https://api.goldsky.com/api/public/project_clhk4u90sqqrw39tcd6ux639f/subgraphs/eduverse/1.0.0/gn';

// Contract Addresses (Manta Pacific Sepolia)
const CONTRACTS = {
  CourseFactory: {
    address: '0x44661459e3c092358559d8459e585EA201D04231',
    startBlock: 5326332,
    events: ['CourseCreated', 'SectionAdded']
  },
  CourseLicense: {
    address: '0x3aad55E0E88C4594643fEFA837caFAe1723403C8',
    startBlock: 5326335,
    events: ['LicenseMinted', 'LicenseRenewed']
  },
  ProgressTracker: {
    address: '0xaB2adB0F4D800971Ee095e2bC26f9d4AdBeDe930',
    startBlock: 5326340,
    events: ['SectionCompleted', 'CourseCompleted']
  },
  CertificateManager: {
    address: '0x0a7750524B826E09a27B98564E98AF77fe78f600',
    startBlock: 5326345,
    events: ['CertificateMinted', 'CourseAddedToCertificate']
  }
};

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// GraphQL Queries
const queries = {
  Course: gql`
    query GetCourses($first: Int!) {
      courses(first: $first) {
        id
        creationTxHash
      }
    }
  `,
  Enrollment: gql`
    query GetEnrollments($first: Int!) {
      enrollments(first: $first) {
        id
        mintTxHash
      }
    }
  `,
  Certificate: gql`
    query GetCertificates($first: Int!) {
      certificates(first: $first) {
        id
        mintTxHash
      }
    }
  `,
  _Meta: gql`
    query GetMeta {
      _meta {
        block {
          number
          hash
        }
        hasIndexingErrors
        deployment
      }
    }
  `
};

async function verifyIndexing() {
  console.log(`${colors.bright}🔍 Starting indexing verification...${colors.reset}\n`);

  // Setup provider
  const provider = new ethers.JsonRpcProvider(MANTA_RPC);
  console.log(`Connected to Manta Pacific Sepolia at block ${await provider.getBlockNumber()}\n`);

  // Check subgraph health
  const meta = await request(SUBGRAPH_URL, queries._Meta);
  console.log(`Subgraph Status:`);
  console.log(`- Current Block: ${meta._meta.block.number}`);
  console.log(`- Deployment ID: ${meta._meta.deployment}`);
  console.log(`- Indexing Errors: ${meta._meta.hasIndexingErrors ? colors.red + 'YES' + colors.reset : colors.green + 'NO' + colors.reset}\n`);

  // Verify each contract's events
  let hasErrors = false;

  for (const [contractName, config] of Object.entries(CONTRACTS)) {
    console.log(`${colors.blue}Verifying ${contractName}...${colors.reset}`);

    try {
      // Load contract ABI
      const abiPath = `${__dirname}/../abis/${contractName.toLowerCase()}.json`;
      const abi = require(abiPath);
      const contract = new ethers.Contract(config.address, abi, provider);

      // Get blockchain events
      for (const eventName of config.events) {
        const filter = contract.filters[eventName]();
        const events = await contract.queryFilter(filter, config.startBlock);
        console.log(`\nEvent: ${eventName}`);
        console.log(`- Chain events: ${events.length}`);

        // Get subgraph entities
        let entityType;
        let entityCount;

        switch (eventName) {
          case 'CourseCreated':
            const courses = await request(SUBGRAPH_URL, queries.Course, { first: 1000 });
            entityCount = courses.courses.length;
            entityType = 'Course';
            break;
          case 'LicenseMinted':
            const enrollments = await request(SUBGRAPH_URL, queries.Enrollment, { first: 1000 });
            entityCount = enrollments.enrollments.length;
            entityType = 'Enrollment';
            break;
          case 'CertificateMinted':
            const certificates = await request(SUBGRAPH_URL, queries.Certificate, { first: 1000 });
            entityCount = certificates.certificates.length;
            entityType = 'Certificate';
            break;
          default:
            console.log(`${colors.yellow}⚠️  Skipping entity check for ${eventName}${colors.reset}`);
            continue;
        }

        console.log(`- Subgraph ${entityType} entities: ${entityCount}`);

        // Verify counts match
        if (entityCount !== events.length) {
          console.error(`${colors.red}❌ Mismatch: ${events.length - entityCount} missing entities${colors.reset}`);
          hasErrors = true;
        } else {
          console.log(`${colors.green}✓ Counts match${colors.reset}`);
        }
      }

      console.log(''); // Empty line for readability

    } catch (error) {
      console.error(`${colors.red}Error verifying ${contractName}:${colors.reset}`, error.message);
      hasErrors = true;
    }
  }

  // Final status
  if (hasErrors) {
    console.error(`\n${colors.red}${colors.bright}❌ Verification failed! Some events are not properly indexed.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bright}✅ All events are properly indexed!${colors.reset}`);
  }
}

// Run verification
verifyIndexing().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
