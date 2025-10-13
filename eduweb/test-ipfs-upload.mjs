#!/usr/bin/env node

/**
 * IPFS Upload API Test Script
 * Tests the /api/course/upload-assets endpoint with real files
 * Uses native Node.js APIs (Node 18+)
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = 'http://localhost:3000/api/course/upload-assets';

console.log('🧪 Testing IPFS Upload API\n');
console.log('=' .repeat(60));

async function testUpload() {
  try {
    // Read test files
    console.log('\n📂 Reading test files...');
    const thumbnailPath = join(__dirname, 'public', 'Eduverse_logo.png');
    const videoPath = join(__dirname, 'public', 'Test.mp4');

    const thumbnailBuffer = readFileSync(thumbnailPath);
    const videoBuffer = readFileSync(videoPath);

    console.log(`✅ Thumbnail: ${thumbnailPath} (${(thumbnailBuffer.length / 1024).toFixed(2)} KB)`);
    console.log(`✅ Video: ${videoPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    // Create FormData using native API
    console.log('\n📦 Creating FormData...');
    const formData = new FormData();

    // Convert buffers to Blob then to File
    const thumbnailBlob = new Blob([thumbnailBuffer], { type: 'image/png' });
    const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });

    const thumbnailFile = new File([thumbnailBlob], 'Eduverse_logo.png', { type: 'image/png' });
    const videoFile = new File([videoBlob], 'Test.mp4', { type: 'video/mp4' });

    formData.append('thumbnail', thumbnailFile);
    formData.append('videos', videoFile);
    formData.append('courseId', 'test-course-' + Date.now());

    console.log('✅ FormData prepared');

    // Make API request
    console.log('\n🚀 Uploading to IPFS via API...');
    console.log(`   Endpoint: ${API_URL}`);
    console.log('   This may take a few moments...\n');

    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`⏱️  Upload completed in ${duration}s`);
    console.log(`   Status: ${response.status} ${response.statusText}`);

    // Parse response
    const result = await response.json();

    if (!response.ok) {
      console.error('\n❌ Upload failed!');
      console.error('Error:', result.error);
      console.error('Details:', result.details);
      process.exit(1);
    }

    // Display results
    console.log('\n✅ Upload successful!');
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));

    console.log('\n🖼️  THUMBNAIL:');
    console.log(`   CID: ${result.thumbnailCID}`);
    console.log(`   Preview: ${result.thumbnailPreviewUrl}`);
    console.log(`   Length: ${result.thumbnailCID.length} chars`);

    console.log('\n🎥 VIDEOS:');
    result.videoCIDs.forEach((cid, index) => {
      console.log(`   Video ${index + 1}:`);
      console.log(`      CID: ${cid}`);
      console.log(`      Preview: ${result.videoPreviewUrls[index]}`);
      console.log(`      Length: ${cid.length} chars`);
    });

    console.log('\n📈 SUMMARY:');
    console.log(`   Total Files: ${result.summary.totalFiles}`);
    console.log(`   Thumbnail Size: ${result.summary.thumbnailSize}`);
    console.log(`   Total Video Size: ${result.summary.totalVideoSize}`);

    // Validate CID format for smart contract
    console.log('\n' + '='.repeat(60));
    console.log('🔍 SMART CONTRACT VALIDATION');
    console.log('='.repeat(60));

    const validateCID = (cid, name) => {
      const hasPrefix = cid.startsWith('ipfs://');
      const isUnder150 = cid.length <= 150;
      const isValid = !hasPrefix && isUnder150;

      console.log(`\n${name}:`);
      console.log(`   ${hasPrefix ? '❌' : '✅'} Has ipfs:// prefix: ${hasPrefix ? 'YES (INVALID)' : 'NO (VALID)'}`);
      console.log(`   ${isUnder150 ? '✅' : '❌'} Length under 150 chars: ${cid.length}/150`);
      console.log(`   ${isValid ? '✅' : '❌'} Smart Contract Compatible: ${isValid ? 'YES' : 'NO'}`);

      return isValid;
    };

    let allValid = true;
    allValid = validateCID(result.thumbnailCID, 'Thumbnail CID') && allValid;

    result.videoCIDs.forEach((cid, index) => {
      allValid = validateCID(cid, `Video ${index + 1} CID`) && allValid;
    });

    console.log('\n' + '='.repeat(60));
    if (allValid) {
      console.log('✅ ALL CIDS ARE SMART CONTRACT COMPATIBLE!');
      console.log('✅ Ready for blockchain integration!');
    } else {
      console.log('❌ SOME CIDS ARE NOT COMPATIBLE WITH SMART CONTRACT!');
      console.log('❌ Fix required before blockchain integration!');
    }
    console.log('='.repeat(60));

    // Test IPFS access
    console.log('\n🌐 Testing IPFS Gateway Access...');
    console.log(`   Checking: ${result.thumbnailPreviewUrl}`);

    try {
      const testResponse = await fetch(result.thumbnailPreviewUrl);
      if (testResponse.ok) {
        console.log('   ✅ Thumbnail accessible via gateway');
        console.log(`   ✅ Content-Type: ${testResponse.headers.get('content-type')}`);
      } else {
        console.log(`   ⚠️  Status ${testResponse.status} - may need propagation time`);
      }
    } catch (error) {
      console.log('   ⚠️  Gateway access test failed (may need propagation time)');
    }

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Check if dev server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok || response.status === 404;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log('🔍 Checking if Next.js dev server is running...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('\n❌ Next.js dev server is not running!');
    console.error('Please start the server first:');
    console.error('   cd eduweb && npm run dev\n');
    process.exit(1);
  }

  console.log('✅ Server is running\n');

  await testUpload();
})();
