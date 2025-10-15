#!/usr/bin/env node

/**
 * Blockchain-Compatible Certificate Generation Test
 *
 * Tests certificate generation with blockchain fields matching CertificateManager.sol
 *
 * Usage:
 *   node test-certificate-blockchain.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_URL = 'http://localhost:3000/api/certificate/generate-pinata';
const RESULT_DIR = path.join(__dirname, 'result-test', 'blockchain-certificates');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Ensure result directory exists
function ensureResultDir() {
  if (!fs.existsSync(RESULT_DIR)) {
    fs.mkdirSync(RESULT_DIR, { recursive: true });
    logSuccess(`Created result directory: ${RESULT_DIR}`);
  }
}

// Download file from URL
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith('https') ? https : require('http');

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Test certificate generation with blockchain fields
async function testBlockchainCertificate() {
  console.log('\n' + '='.repeat(60));
  log('🎓 Blockchain-Compatible Certificate Test', colors.bright + colors.blue);
  console.log('='.repeat(60) + '\n');

  try {
    // Simulate blockchain data
    const blockchainData = {
      // Required fields
      studentName: 'Revo Rahmat',
      courseName: 'Complete Web3 Development Bootcamp',
      courseId: '1',

      // Optional fields
      instructorName: 'Dr. Blockchain Expert',
      completionDate: new Date().toISOString(),

      // Blockchain fields (CertificateManager.sol compatibility)
      tokenId: 1, // First certificate NFT
      recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      completedCourses: [1, 2, 3], // Multiple courses completed
      issuedAt: Math.floor(Date.now() / 1000), // Current timestamp
      lastUpdated: Math.floor(Date.now() / 1000),
      paymentReceiptHash: '0x' + 'a'.repeat(64), // Simulated keccak256 hash
      platformName: 'EduVerse Academy',
      baseRoute: 'http://192.168.18.143:3000/certificates',
      isValid: true,
      lifetimeFlag: true,
      blockchainTxHash: '0x' + 'b'.repeat(64), // Simulated transaction hash
    };

    logInfo('Test Data (Blockchain-Compatible):');
    console.log(JSON.stringify(blockchainData, null, 2));
    console.log('');

    // Generate certificate
    logInfo('Generating certificate...');
    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blockchainData),
    });

    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok || !result.success) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    logSuccess(`Generated in ${duration}s`);
    console.log('');

    // Display result
    logInfo('Certificate Data:');
    console.log(`  CID: ${result.data.cid}`);
    console.log(`  Metadata CID: ${result.data.metadataCID}`);
    console.log(`  Certificate ID: ${result.data.certificateId}`);
    console.log(`  Token ID: ${result.data.tokenId}`);
    console.log(`  Verification URL: ${result.data.verificationUrl}`);
    console.log(`  Expires: ${new Date(result.data.expiresAt).toLocaleString()}`);
    console.log('');

    // Verify QR code URL format
    logInfo('Verifying QR Code URL Format...');
    const expectedUrl = `http://192.168.18.143:3000/certificates?tokenId=${blockchainData.tokenId}&address=${blockchainData.recipientAddress}`;

    if (result.data.verificationUrl === expectedUrl) {
      logSuccess('QR URL format is correct!');
      log(`  Expected: ${expectedUrl}`, colors.green);
    } else {
      logWarning('QR URL format mismatch');
      log(`  Expected: ${expectedUrl}`, colors.yellow);
      log(`  Received: ${result.data.verificationUrl}`, colors.yellow);
    }
    console.log('');

    // Download certificate image
    const filename = `blockchain-cert-token${blockchainData.tokenId}-${result.data.certificateId}.png`;
    const filepath = path.join(RESULT_DIR, filename);

    logInfo('Downloading certificate image...');
    await downloadFile(result.data.signedUrl, filepath);

    const stats = fs.statSync(filepath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    logSuccess(`Saved: ${filename}`);
    logSuccess(`Size: ${fileSizeKB} KB`);
    console.log('');

    // Download metadata JSON
    if (result.data.metadataSignedUrl) {
      const metadataFilename = `blockchain-cert-metadata-token${blockchainData.tokenId}.json`;
      const metadataFilepath = path.join(RESULT_DIR, metadataFilename);

      logInfo('Downloading metadata JSON...');
      await downloadFile(result.data.metadataSignedUrl, metadataFilepath);

      // Read and verify metadata structure
      const metadata = JSON.parse(fs.readFileSync(metadataFilepath, 'utf8'));

      logSuccess(`Metadata saved: ${metadataFilename}`);
      console.log('');

      logInfo('Metadata Structure Verification:');
      console.log(`  Name: ${metadata.name}`);
      console.log(`  Description: ${metadata.description}`);
      console.log(`  Image: ${metadata.image}`);
      console.log(`  Decimals: ${metadata.decimals}`);
      console.log(`  Attributes Count: ${metadata.attributes?.length || 0}`);
      console.log(`  Properties: ${Object.keys(metadata.properties || {}).join(', ')}`);
      console.log('');

      // Verify blockchain-specific attributes
      logInfo('Blockchain Attributes Verification:');
      const tokenIdAttr = metadata.attributes?.find(a => a.trait_type === 'Token ID');
      const recipientAttr = metadata.attributes?.find(a => a.trait_type === 'Recipient Address');
      const coursesAttr = metadata.attributes?.find(a => a.trait_type === 'Completed Courses');
      const issuedAtAttr = metadata.attributes?.find(a => a.trait_type === 'Issued At');

      if (tokenIdAttr && tokenIdAttr.value === blockchainData.tokenId) {
        logSuccess(`Token ID matches: ${tokenIdAttr.value}`);
      } else {
        logWarning(`Token ID mismatch or missing`);
      }

      if (recipientAttr && recipientAttr.value === blockchainData.recipientAddress) {
        logSuccess(`Recipient Address matches`);
      } else {
        logWarning(`Recipient Address mismatch or missing`);
      }

      if (coursesAttr) {
        logSuccess(`Completed Courses: ${coursesAttr.value}`);
      }

      if (issuedAtAttr && issuedAtAttr.value) {
        logSuccess(`Issued At: ${new Date(issuedAtAttr.value * 1000).toLocaleString()}`);
      }

      console.log('');
    }

    // Final summary
    console.log('='.repeat(60));
    log('✨ Certificate Generation Test Complete!', colors.bright + colors.green);
    console.log('='.repeat(60));
    console.log('');

    logInfo('Files Generated:');
    console.log(`  Certificate Image: ${filepath}`);
    if (result.data.metadataSignedUrl) {
      console.log(`  Metadata JSON: ${path.join(RESULT_DIR, `blockchain-cert-metadata-token${blockchainData.tokenId}.json`)}`);
    }
    console.log('');

    logInfo('Next Steps:');
    console.log('  1. Open the certificate image to verify design and QR code position');
    console.log('  2. Scan QR code to verify it navigates to correct URL');
    console.log('  3. Review metadata JSON to ensure blockchain compatibility');
    console.log('  4. Deploy smart contract and test actual blockchain integration');
    console.log('  5. Set up Goldsky indexer for certificate queries');
    console.log('');

    return {
      success: true,
      data: result.data,
      filepath,
      duration,
    };

  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.error(error);

    console.log('');
    logInfo('Troubleshooting:');
    console.log('  1. Ensure dev server is running: npm run dev');
    console.log('  2. Check .env.local has NEXT_PUBLIC_APP_URL set');
    console.log('  3. Verify Pinata credentials are valid');
    console.log('  4. Check console for detailed error messages');
    console.log('');

    return {
      success: false,
      error: error.message,
    };
  }
}

// Main function
async function main() {
  ensureResultDir();
  const result = await testBlockchainCertificate();

  if (!result.success) {
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('');
  logError(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
