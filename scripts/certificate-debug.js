#!/usr/bin/env node

/**
 * Certificate Generation Debugging Script
 *
 * Purpose: Test certificate generation with custom names and verify positioning
 * Usage: node scripts/certificate-debug.js "Your Name Here"
 * Output: Generates PNG file in ./debug-output/ folder
 *
 * This script helps you:
 * - Test name positioning on actual template size (6250x4419)
 * - Verify QR code placement
 * - Preview final result before production
 * - Debug font sizes and text alignment
 * - Test different name lengths
 */

const path = require('path');

// Set up module paths to use eduweb's node_modules
const eduwebPath = path.join(__dirname, '..', 'eduweb');
const modulePaths = [
  path.join(eduwebPath, 'node_modules'),
  path.join(__dirname, '..', 'node_modules'),
];

// Add to module paths
module.paths.unshift(...modulePaths);

// Now require the modules
const { createCanvas, loadImage } = require('canvas');
const QRCode = require('qrcode');
const fs = require('fs');

// ============================================================================
// CONFIGURATION - ORIGINAL TEMPLATE SIZE (6250x4419)
// ============================================================================

const CONFIG = {
  // Template Configuration
  TEMPLATE_URL: 'https://copper-far-firefly-220.mypinata.cloud/ipfs/bafybeiaibxpgjjcjr3dgfyhhg365rt47xl2nwwrnesr6zshpompucxgn3q',

  // Canvas Dimensions (ORIGINAL SIZE - DO NOT SCALE DOWN)
  CANVAS_WIDTH: 6250,
  CANVAS_HEIGHT: 4419,

  // Text Positioning (Scaled from 1754x1240 to 6250x4419)
  // Scale factor: 6250/1754 = 3.562... for width, 4419/1240 = 3.563... for height
  NAME_POSITION: {
    x: 6250 / 2,           // Center horizontal: 3125
    y: 1800,               // 1710 + 20px (moved down per requirement)
    fontSize: 285,         // 80 * 3.5625 (scaled font)
    fontFamily: 'Serif',
    fontWeight: 'bold',
    color: '#2D1B4E',      // Deep purple
    align: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowBlur: 20,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
  },

  DESCRIPTION_POSITION: {
    x: 6250 / 2,           // Center horizontal: 3125
    y: 2210,               // CANVAS_HEIGHT / 2 (aligned to canvas center)
    fontSize: 85,          // 24 * 3.5625 (scaled font)
    fontFamily: 'Arial',
    color: '#4A4A4A',      // Dark gray
    align: 'center',
    maxWidth: 4275,        // 1200 * 3.5625 (scaled width)
    lineHeight: 128,       // 36 * 3.5625 (scaled line height)
  },

  QR_POSITION: {
    x: 4200,               // Positioned at 4200px from left
    y: 2700,               // Positioned at 2700px from top
    size: 1000,            // QR size 1000x1000px
  },

  // QR Code Configuration
  QR_BASE_URL: 'https://verify.eduverse.com/certificate',

  // Output Configuration
  OUTPUT_DIR: path.join(__dirname, '..', 'debug-output'),
  OUTPUT_FORMAT: 'png',
  COMPRESSION_LEVEL: 6,  // 0-9, higher = smaller file but slower
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Draw recipient name with automatic font scaling for long names
 */
function drawRecipientName(ctx, name, config) {
  let fontSize = config.fontSize;
  let textWidth = 0;
  const maxWidth = config.maxNameWidth || (CONFIG.CANVAS_WIDTH * 0.85); // 85% of canvas width

  // Measure text and scale down if needed
  do {
    ctx.font = `${config.fontWeight} ${fontSize}px ${config.fontFamily}`;
    textWidth = ctx.measureText(name).width;

    if (textWidth > maxWidth) {
      fontSize = fontSize * 0.95; // Reduce by 5%
    }
  } while (textWidth > maxWidth && fontSize > 100); // Minimum font size: 100px

  // Apply final font
  ctx.font = `${config.fontWeight} ${fontSize}px ${config.fontFamily}`;
  ctx.fillStyle = config.color;
  ctx.textAlign = config.align;
  ctx.textBaseline = 'middle';

  // Add shadow for depth
  ctx.shadowColor = config.shadowColor;
  ctx.shadowBlur = config.shadowBlur;
  ctx.shadowOffsetX = config.shadowOffsetX;
  ctx.shadowOffsetY = config.shadowOffsetY;

  ctx.fillText(name, config.x, config.y);

  return {
    fontSize: Math.round(fontSize),
    textWidth: Math.round(textWidth),
    scaled: fontSize < config.fontSize,
  };
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  const lines = [];

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      lines.push({ text: line, y: currentY });
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  lines.push({ text: line, y: currentY });

  return lines;
}

/**
 * Generate QR code as data URL
 */
async function generateQRCode(tokenId) {
  const url = `${CONFIG.QR_BASE_URL}?token=${tokenId}`;

  const qrDataUrl = await QRCode.toDataURL(url, {
    width: CONFIG.QR_POSITION.size,
    margin: 1,
    color: {
      dark: '#2D1B4E',     // Deep purple
      light: '#FFFFFF',     // White background
    },
    errorCorrectionLevel: 'H', // High error correction (30%)
  });

  return qrDataUrl;
}

/**
 * Draw positioning guides (optional, for debugging)
 */
function drawGuides(ctx, showGuides = true) {
  if (!showGuides) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.lineWidth = 2;

  // Center vertical line
  ctx.beginPath();
  ctx.moveTo(CONFIG.CANVAS_WIDTH / 2, 0);
  ctx.lineTo(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT);
  ctx.stroke();

  // Center horizontal line
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.CANVAS_HEIGHT / 2);
  ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT / 2);
  ctx.stroke();

  // Name position marker
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(CONFIG.NAME_POSITION.x, CONFIG.NAME_POSITION.y, 50, 0, Math.PI * 2);
  ctx.stroke();

  // QR position marker
  ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
  ctx.strokeRect(
    CONFIG.QR_POSITION.x,
    CONFIG.QR_POSITION.y,
    CONFIG.QR_POSITION.size,
    CONFIG.QR_POSITION.size
  );

  ctx.restore();
}

/**
 * Main certificate generation function
 */
async function generateCertificate(recipientName, options = {}) {
  const {
    tokenId = '9999',
    showGuides = false,
    outputFilename = null,
  } = options;

  console.log('\n🎨 Starting Certificate Generation...\n');
  console.log('Configuration:');
  console.log(`  Canvas Size: ${CONFIG.CANVAS_WIDTH}x${CONFIG.CANVAS_HEIGHT}px`);
  console.log(`  Recipient: ${recipientName}`);
  console.log(`  Token ID: ${tokenId}`);
  console.log(`  Show Guides: ${showGuides ? 'Yes' : 'No'}\n`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${CONFIG.OUTPUT_DIR}\n`);
  }

  // Step 1: Load template image
  console.log('📥 Loading template from IPFS...');
  const templateImage = await loadImage(CONFIG.TEMPLATE_URL);
  console.log(`✅ Template loaded: ${templateImage.width}x${templateImage.height}px\n`);

  // Step 2: Create canvas
  console.log('🖼️  Creating canvas...');
  const canvas = createCanvas(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');
  console.log('✅ Canvas created\n');

  // Step 3: Draw template as base
  console.log('🎨 Drawing template...');
  ctx.drawImage(templateImage, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  console.log('✅ Template drawn\n');

  // Optional: Draw positioning guides
  if (showGuides) {
    console.log('📐 Drawing positioning guides...');
    drawGuides(ctx, true);
    console.log('✅ Guides drawn\n');
  }

    // Step 4: Draw recipient name (large elegant font)
  console.log('✍️  Drawing recipient name...');
  const nameResult = drawRecipientName(ctx, recipientName, CONFIG.NAME_POSITION);

  console.log(`✅ Name drawn at (${CONFIG.NAME_POSITION.x}, ${CONFIG.NAME_POSITION.y})`);
  console.log(`   Font size: ${nameResult.fontSize}px${nameResult.scaled ? ' (auto-scaled)' : ''}`);
  console.log(`   Width: ${nameResult.textWidth}px\n`);

  // Step 5: Draw description text with name
  console.log('📝 Drawing description text...');
  ctx.shadowColor = 'transparent'; // Reset shadow
  ctx.font = `${CONFIG.DESCRIPTION_POSITION.fontSize}px ${CONFIG.DESCRIPTION_POSITION.fontFamily}`;
  ctx.fillStyle = CONFIG.DESCRIPTION_POSITION.color;
  ctx.textAlign = CONFIG.DESCRIPTION_POSITION.align;
  ctx.textBaseline = 'top'; // Align top edge to y coordinate (canvas center)

  const descriptionText = `This evolving Certificate of Completion is awarded to ${recipientName} for learning completed on Eduverse, a blockchain-powered education platform. This credential grows as you complete more courses, creating a comprehensive record of your lifelong learning journey.`;

  const wrappedLines = wrapText(
    ctx,
    descriptionText,
    CONFIG.DESCRIPTION_POSITION.x,
    CONFIG.DESCRIPTION_POSITION.y,
    CONFIG.DESCRIPTION_POSITION.maxWidth,
    CONFIG.DESCRIPTION_POSITION.lineHeight
  );

  wrappedLines.forEach(line => {
    ctx.fillText(line.text, CONFIG.DESCRIPTION_POSITION.x, line.y);
  });

  console.log(`✅ Description drawn (${wrappedLines.length} lines)\n`);

  // Step 6: Generate and draw QR code
  console.log('🔲 Generating QR code...');
  const qrDataUrl = await generateQRCode(tokenId);
  const qrImage = await loadImage(qrDataUrl);
  console.log(`✅ QR code generated for: ${CONFIG.QR_BASE_URL}?token=${tokenId}\n`);

  console.log('🔲 Drawing QR code...');
  ctx.drawImage(
    qrImage,
    CONFIG.QR_POSITION.x,
    CONFIG.QR_POSITION.y,
    CONFIG.QR_POSITION.size,
    CONFIG.QR_POSITION.size
  );
  console.log(`✅ QR code drawn at (${CONFIG.QR_POSITION.x}, ${CONFIG.QR_POSITION.y})\n`);

  // Step 7: Export to PNG
  console.log('💾 Exporting to PNG...');
  const buffer = canvas.toBuffer('image/png', { compressionLevel: CONFIG.COMPRESSION_LEVEL });

  const filename = outputFilename || `certificate-${recipientName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
  const outputPath = path.join(CONFIG.OUTPUT_DIR, filename);

  fs.writeFileSync(outputPath, buffer);

  const fileSizeKB = (buffer.length / 1024).toFixed(2);
  const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);

  console.log('✅ Certificate generated successfully!\n');
  console.log('📊 Output Information:');
  console.log(`   File: ${outputPath}`);
  console.log(`   Size: ${fileSizeKB} KB (${fileSizeMB} MB)`);
  console.log(`   Dimensions: ${CONFIG.CANVAS_WIDTH}x${CONFIG.CANVAS_HEIGHT}px\n`);

  return {
    success: true,
    outputPath,
    fileSize: buffer.length,
    dimensions: {
      width: CONFIG.CANVAS_WIDTH,
      height: CONFIG.CANVAS_HEIGHT,
    },
  };
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     EDUVERSE CERTIFICATE GENERATION - DEBUG SCRIPT          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Get recipient name from command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node scripts/certificate-debug.js [options] "Recipient Name"\n');
    console.log('Options:');
    console.log('  --guides           Show positioning guides (red lines)');
    console.log('  --token <id>       Custom token ID (default: 9999)');
    console.log('  --output <file>    Custom output filename');
    console.log('  --help, -h         Show this help message\n');
    console.log('Examples:');
    console.log('  node scripts/certificate-debug.js "John Doe"');
    console.log('  node scripts/certificate-debug.js --guides "Jane Smith"');
    console.log('  node scripts/certificate-debug.js --token 1234 "Alice Johnson"');
    console.log('  node scripts/certificate-debug.js --output my-cert.png "Bob Wilson"\n');
    process.exit(0);
  }

  // Parse options
  let recipientName = '';
  let showGuides = false;
  let tokenId = '9999';
  let outputFilename = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--guides') {
      showGuides = true;
    } else if (arg === '--token') {
      tokenId = args[++i];
    } else if (arg === '--output') {
      outputFilename = args[++i];
    } else if (!arg.startsWith('--')) {
      recipientName = arg;
    }
  }

  if (!recipientName) {
    console.error('❌ Error: Recipient name is required\n');
    console.log('Run with --help for usage information\n');
    process.exit(1);
  }

  // Validate name length
  if (recipientName.length > 100) {
    console.error('❌ Error: Name must be 100 characters or less\n');
    process.exit(1);
  }

  try {
    const result = await generateCertificate(recipientName, {
      showGuides,
      tokenId,
      outputFilename,
    });

    console.log('🎉 SUCCESS! Your certificate is ready.\n');
    console.log('Next steps:');
    console.log('  1. Open the file to verify positioning');
    console.log('  2. Test with different name lengths');
    console.log('  3. Use --guides flag to see positioning markers');
    console.log('  4. Adjust CONFIG values in this script if needed\n');

  } catch (error) {
    console.error('\n❌ Error generating certificate:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for use as module
module.exports = {
  generateCertificate,
  CONFIG,
};
