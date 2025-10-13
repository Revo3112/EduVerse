#!/usr/bin/env node

/**
 * Certificate Generation Test Script
 *
 * Tests the certificate generation API and downloads the result.
 *
 * Usage:
 *   node test-certificate.js
 *
 * Output:
 *   - Calls POST /api/certificate/generate-pinata
 *   - Downloads generated certificate image
 *   - Saves to ./result-test/certificate-[timestamp].png
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_URL = 'http://localhost:3000/api/certificate/generate-pinata';
const RESULT_DIR = path.join(__dirname, 'result-test');

// Test data
const testCertificateData = {
  studentName: 'John Doe',
  courseName: 'Complete Web3 Development Bootcamp',
  courseId: '12345',
  completionDate: new Date().toISOString(),
  instructorName: 'Dr. Sarah Johnson',
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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
    logInfo(`Downloading from: ${url}`);

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

// Call certificate generation API
async function generateCertificate(data) {
  logInfo('Calling certificate generation API...');
  logInfo(`API URL: ${API_URL}`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Certificate generation failed');
    }

    logSuccess('Certificate generated successfully!');
    return result.data;

  } catch (error) {
    logError(`API call failed: ${error.message}`);
    throw error;
  }
}

// Main test function
async function runTest() {
  console.log('\n' + '='.repeat(60));
  log('🎓 Certificate Generation Test', colors.bright + colors.blue);
  console.log('='.repeat(60) + '\n');

  try {
    // Ensure result directory exists
    ensureResultDir();

    // Display test data
    logInfo('Test Data:');
    console.log(JSON.stringify(testCertificateData, null, 2));
    console.log('');

    // Generate certificate
    const startTime = Date.now();
    const certificateData = await generateCertificate(testCertificateData);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logSuccess(`Generation completed in ${duration}s`);
    console.log('');

    // Display result
    logInfo('Certificate Data:');
    console.log(`  CID: ${certificateData.cid}`);
    console.log(`  Certificate ID: ${certificateData.certificateId}`);
    console.log(`  Signed URL: ${certificateData.signedUrl.substring(0, 80)}...`);
    console.log(`  Expires At: ${new Date(certificateData.expiresAt).toLocaleString()}`);
    console.log('');

    // Download certificate image
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `certificate-${certificateData.certificateId}-${timestamp}.png`;
    const filepath = path.join(RESULT_DIR, filename);

    logInfo('Downloading certificate image...');
    await downloadFile(certificateData.signedUrl, filepath);

    // Verify file exists and get size
    const stats = fs.statSync(filepath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    logSuccess(`Certificate saved to: ${filepath}`);
    logSuccess(`File size: ${fileSizeKB} KB`);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    log('✨ Test Completed Successfully!', colors.bright + colors.green);
    console.log('='.repeat(60));
    console.log('');
    logInfo('Next Steps:');
    console.log(`  1. Open the certificate: ${filepath}`);
    console.log(`  2. Verify the content is correct`);
    console.log(`  3. Check the design and layout`);
    console.log('');

  } catch (error) {
    console.log('');
    console.log('='.repeat(60));
    log('❌ Test Failed', colors.bright + colors.red);
    console.log('='.repeat(60));
    console.log('');
    logError(`Error: ${error.message}`);

    if (error.stack) {
      console.log('');
      logInfo('Stack Trace:');
      console.log(error.stack);
    }

    console.log('');
    logInfo('Troubleshooting:');
    console.log('  1. Make sure the dev server is running: npm run dev');
    console.log('  2. Check if the API endpoint is accessible');
    console.log('  3. Verify environment variables are set (.env.local)');
    console.log('  4. Check the API logs for more details');
    console.log('');

    process.exit(1);
  }
}

// Run the test
runTest();
