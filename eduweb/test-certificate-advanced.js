#!/usr/bin/env node

/**
 * Advanced Certificate Generation Test Script
 *
 * Tests multiple certificate generation scenarios.
 *
 * Usage:
 *   node test-certificate-advanced.js [options]
 *
 * Options:
 *   --all         Test all scenarios
 *   --basic       Test basic certificate
 *   --long        Test with long names
 *   --special     Test with special characters
 *   --batch       Generate multiple certificates
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_URL = 'http://localhost:3000/api/certificate/generate-pinata';
const RESULT_DIR = path.join(__dirname, 'result-test', 'certificates');

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

// Test scenarios
const testScenarios = {
  basic: {
    name: 'Basic Certificate',
    data: {
      studentName: 'John Doe',
      courseName: 'Complete Web3 Development Bootcamp',
      courseId: 'COURSE-001',
      instructorName: 'Dr. Sarah Johnson',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    }
  },

  long: {
    name: 'Long Names Certificate',
    data: {
      studentName: 'Alexander Christopher Montgomery Wellington III',
      courseName: 'Advanced Blockchain Architecture and Decentralized Application Development with Smart Contracts',
      courseId: 'COURSE-002',
      instructorName: 'Professor Dr. Elizabeth Victoria Thompson-Anderson PhD',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    }
  },

  special: {
    name: 'Special Characters Certificate',
    data: {
      studentName: 'José María Álvarez-Rodríguez',
      courseName: 'DeFi & NFT: Créer des Applications Web3',
      courseId: 'COURSE-003',
      instructorName: 'François-Xavier Beaumont',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    }
  },

  minimal: {
    name: 'Minimal Certificate (Required Fields Only)',
    data: {
      studentName: 'Alice',
      courseName: 'Solidity 101',
      courseId: 'COURSE-004'
    }
  },

  realistic: {
    name: 'Realistic Web3 Course',
    data: {
      studentName: 'Michael Chen',
      courseName: 'Ethereum Smart Contract Security Audit',
      courseId: 'COURSE-005',
      instructorName: 'David Martinez',
      walletAddress: '0x1234567890123456789012345678901234567890'
    }
  }
};

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

// Call certificate generation API
async function generateCertificate(data) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        completionDate: data.completionDate || new Date().toISOString()
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Certificate generation failed');
    }

    return result.data;

  } catch (error) {
    throw error;
  }
}

// Test a single scenario
async function testScenario(scenarioKey, scenario) {
  console.log('\n' + '─'.repeat(60));
  log(`📝 Testing: ${scenario.name}`, colors.bright + colors.blue);
  console.log('─'.repeat(60));

  try {
    // Display test data
    logInfo('Input Data:');
    console.log(JSON.stringify(scenario.data, null, 2));
    console.log('');

    // Generate certificate
    logInfo('Generating certificate...');
    const startTime = Date.now();
    const certificateData = await generateCertificate(scenario.data);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logSuccess(`Generated in ${duration}s`);
    console.log('');

    // Display result
    logInfo('Result:');
    console.log(`  CID: ${certificateData.cid}`);
    console.log(`  Certificate ID: ${certificateData.certificateId}`);
    console.log(`  Expires: ${new Date(certificateData.expiresAt).toLocaleString()}`);
    console.log('');

    // Download certificate image
    const filename = `${scenarioKey}-${certificateData.certificateId}.png`;
    const filepath = path.join(RESULT_DIR, filename);

    logInfo('Downloading image...');
    await downloadFile(certificateData.signedUrl, filepath);

    // Verify file
    const stats = fs.statSync(filepath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    logSuccess(`Saved: ${filename}`);
    logSuccess(`Size: ${fileSizeKB} KB`);

    return {
      success: true,
      scenarioKey,
      scenarioName: scenario.name,
      certificateId: certificateData.certificateId,
      cid: certificateData.cid,
      filepath,
      fileSizeKB,
      duration
    };

  } catch (error) {
    logError(`Failed: ${error.message}`);

    return {
      success: false,
      scenarioKey,
      scenarioName: scenario.name,
      error: error.message
    };
  }
}

// Generate summary report
function generateReport(results) {
  console.log('\n\n' + '='.repeat(60));
  log('📊 Test Summary Report', colors.bright + colors.magenta);
  console.log('='.repeat(60) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  logInfo(`Total Tests: ${results.length}`);
  logSuccess(`Successful: ${successful.length}`);
  if (failed.length > 0) {
    logError(`Failed: ${failed.length}`);
  }
  console.log('');

  if (successful.length > 0) {
    log('✅ Successful Tests:', colors.green);
    successful.forEach(result => {
      console.log(`  • ${result.scenarioName}`);
      console.log(`    File: ${path.basename(result.filepath)}`);
      console.log(`    Size: ${result.fileSizeKB} KB | Duration: ${result.duration}s`);
      console.log(`    CID: ${result.cid}`);
      console.log('');
    });
  }

  if (failed.length > 0) {
    log('❌ Failed Tests:', colors.red);
    failed.forEach(result => {
      console.log(`  • ${result.scenarioName}`);
      console.log(`    Error: ${result.error}`);
      console.log('');
    });
  }

  console.log('─'.repeat(60));
  logInfo('Generated Files Location:');
  console.log(`  ${RESULT_DIR}`);
  console.log('');

  // Create index HTML
  createIndexHTML(successful);
}

// Create index.html for viewing certificates
function createIndexHTML(results) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate Test Results</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        .subtitle {
            color: rgba(255,255,255,0.9);
            text-align: center;
            margin-bottom: 40px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin-top: 30px;
        }
        .card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        .card-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
        }
        .card-title {
            font-size: 1.2rem;
            font-weight: 600;
        }
        .card-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 5px;
        }
        .card-body {
            padding: 20px;
        }
        .certificate-img {
            width: 100%;
            height: auto;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 2px solid #e2e8f0;
        }
        .info-grid {
            display: grid;
            gap: 10px;
            font-size: 0.9rem;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background: #f7fafc;
            border-radius: 6px;
        }
        .info-label {
            font-weight: 600;
            color: #4a5568;
        }
        .info-value {
            color: #718096;
            font-family: monospace;
        }
        .download-btn {
            display: block;
            width: 100%;
            padding: 12px;
            margin-top: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: opacity 0.3s ease;
        }
        .download-btn:hover {
            opacity: 0.9;
        }
        .stats {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-card {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            color: white;
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 Certificate Test Results</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>

        <div class="stats">
            <h2>📊 Statistics</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${results.length}</div>
                    <div class="stat-label">Total Certificates</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(results.reduce((sum, r) => sum + parseFloat(r.fileSizeKB), 0) / results.length).toFixed(2)} KB</div>
                    <div class="stat-label">Avg File Size</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(results.reduce((sum, r) => sum + parseFloat(r.duration), 0) / results.length).toFixed(2)}s</div>
                    <div class="stat-label">Avg Generation Time</div>
                </div>
            </div>
        </div>

        <div class="grid">
            ${results.map(result => `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">${result.scenarioName}</div>
                        <div class="card-subtitle">${result.certificateId}</div>
                    </div>
                    <div class="card-body">
                        <img src="${path.basename(result.filepath)}" alt="${result.scenarioName}" class="certificate-img">

                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">File Size:</span>
                                <span class="info-value">${result.fileSizeKB} KB</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Generation Time:</span>
                                <span class="info-value">${result.duration}s</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">IPFS CID:</span>
                                <span class="info-value">${result.cid.substring(0, 12)}...</span>
                            </div>
                        </div>

                        <a href="${path.basename(result.filepath)}" download class="download-btn">
                            Download Certificate
                        </a>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

  const indexPath = path.join(RESULT_DIR, 'index.html');
  fs.writeFileSync(indexPath, html);
  logSuccess(`Created index.html: ${indexPath}`);
  logInfo('Open index.html in browser to view all certificates');
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  console.log('\n' + '='.repeat(60));
  log('🎓 Advanced Certificate Generation Test', colors.bright + colors.blue);
  console.log('='.repeat(60) + '\n');

  // Ensure result directory exists
  ensureResultDir();

  // Determine which scenarios to test
  let scenariosToTest = [];

  if (args.includes('--all') || args.length === 0) {
    scenariosToTest = Object.keys(testScenarios);
    logInfo('Running all test scenarios...');
  } else {
    for (const arg of args) {
      const scenarioKey = arg.replace('--', '');
      if (testScenarios[scenarioKey]) {
        scenariosToTest.push(scenarioKey);
      }
    }

    if (scenariosToTest.length === 0) {
      logWarning('No valid scenarios specified. Running all tests...');
      scenariosToTest = Object.keys(testScenarios);
    } else {
      logInfo(`Running ${scenariosToTest.length} test scenario(s)...`);
    }
  }

  console.log('');

  // Run tests
  const results = [];
  for (const scenarioKey of scenariosToTest) {
    const result = await testScenario(scenarioKey, testScenarios[scenarioKey]);
    results.push(result);
  }

  // Generate report
  generateReport(results);

  // Final status
  const allSuccessful = results.every(r => r.success);
  if (allSuccessful) {
    console.log('='.repeat(60));
    log('✨ All Tests Passed!', colors.bright + colors.green);
    console.log('='.repeat(60) + '\n');
  } else {
    console.log('='.repeat(60));
    log('⚠️  Some Tests Failed', colors.bright + colors.yellow);
    console.log('='.repeat(60) + '\n');
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
