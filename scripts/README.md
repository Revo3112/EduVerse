# 📋 EduVerse Scripts Documentation

## 🎯 Overview
Folder `scripts` berisi semua script yang diperlukan untuk deployment, verifikasi, dan maintenance platform EduVerse. Semua script telah dioptimasi untuk konsistensi dan kemudahan penggunaan.

## 🚀 Quick Start

### NPM Shortcuts ⚡ **NEW**
Menggunakan shortcut npm untuk kemudahan development sesuai dokumentasi Manta Pacific:

```bash
# 🚀 DEPLOYMENT
npm run deploy              # Deploy ke Manta Pacific Testnet
npm run deploy:local        # Deploy ke localhost
npm run deploy:separated    # Deploy dengan reuse existing contracts

# 🔍 VERIFICATION
npm run verify              # Verify contracts di blockchain
npm run verify:comprehensive # Complete verification (blockchain + ABI)
npm run verify:abi          # ABI consistency check saja

# 🛠️ MANAGEMENT
npm run manage              # Script management utility
npm run network             # Network information

# 🧪 TESTING
npm run test:interact       # Interactive testing
npm run test:courses        # Course exploration testing
npm run test:licenses       # License functionality testing
npm run test:update         # Course update testing

# 📦 UTILITIES
npm run export:abi          # Export ABIs to mobile & frontend
npm run update:env          # Update mobile environment
npm run setup:mobile        # Complete mobile setup
```

### Script Management Utility
Gunakan script management utility untuk melihat dan menjalankan semua script:

```bash
# Lihat semua script yang tersedia
node scripts/manage.js

# Jalankan script tertentu
node scripts/manage.js <script-name>

# Lihat network information
node scripts/manage.js network

# Contoh: deployment
node scripts/manage.js deploy

# Network helper langsung
node scripts/network-helper.js
```

## 📂 Kategori Script

### 🔷 DEPLOYMENT
Script untuk deploy smart contracts ke blockchain.

#### `deploy.js` ⭐ **RECOMMENDED**
**Fungsi**: Complete deployment dengan automatic ABI export dan environment update
**Penggunaan**:
```bash
npx hardhat run scripts/deploy.js --network mantaPacificTestnet
```
**Fitur**:
- Deploy semua contract (CourseFactory, CourseLicense, ProgressTracker, CertificateManager)
- Otomatis export ABI ke mobile app dan frontend
- Update environment variables di mobile app
- Save contract addresses ke `deployed-contracts.json`

#### `deploy-separated.js`
**Fungsi**: Deployment yang dapat menggunakan existing contracts
**Penggunaan**:
```bash
npx hardhat run scripts/deploy-separated.js --network mantaPacificTestnet
```
**Kelebihan**: Dapat reuse contract yang sudah di-deploy sebelumnya

### 🔷 VERIFICATION
Script untuk verifikasi contracts dan konsistensi ABI.

#### `verify-comprehensive.js` ⭐ **RECOMMENDED**
**Fungsi**: Complete verification (blockchain + ABI consistency)
**Penggunaan**:
```bash
# ABI verification saja
node scripts/verify-comprehensive.js

# Blockchain + ABI verification
npx hardhat run scripts/verify-comprehensive.js --network mantaPacificTestnet
```
**Fitur**:
- Smart network detection dan handling
- Verifikasi contracts di block explorer
- Cek konsistensi ABI antara mobile app dan frontend
- Cek konsistensi address di semua lokasi

#### `verify.js`
**Fungsi**: Verifikasi contracts di blockchain
**Penggunaan**:
```bash
npx hardhat run scripts/verify.js --network mantaPacificTestnet
```

#### `verify-abi-usage.js`
**Fungsi**: Verifikasi konsistensi ABI saja
**Penggunaan**:
```bash
node scripts/verify-abi-usage.js
```

### 🔷 MAINTENANCE
Script untuk maintenance dan export.

#### `ABI-Export.js`
**Fungsi**: Export ABIs ke mobile dan frontend applications
**Penggunaan**:
```bash
node scripts/ABI-Export.js
```

#### `update-mobile-env.js`
**Fungsi**: Update mobile app environment variables
**Penggunaan**:
```bash
node scripts/update-mobile-env.js
```

### 🔷 UTILITIES
Script untuk utilities dan network management.

#### `network-helper.js` ⭐ **NEW**
**Fungsi**: Network configuration helper dan validator
**Penggunaan**:
```bash
# Network information
node scripts/network-helper.js

# Check compatibility
node scripts/network-helper.js check

# Suggest correct command
node scripts/network-helper.js suggest verify-comprehensive.js
```

#### `manage.js` ⭐ **MAIN UTILITY**
**Fungsi**: Script management dengan network validation
**Penggunaan**:
```bash
node scripts/manage.js               # Overview
node scripts/manage.js network       # Network info
node scripts/manage.js verify-comprehensive
```

### 🔷 TESTING
Script untuk testing functionality.

#### `testing-explore-courses.js`
**Penggunaan**:
```bash
npx hardhat run scripts/testing-explore-courses.js --network mantaPacificTestnet
```

#### `testing-my-licenses.js`, `testnet-interact.js`, `update_course.js`
**Penggunaan**:
```bash
npx hardhat run scripts/<script-name> --network mantaPacificTestnet
```

## 🔄 Typical Workflow

### 1. 🚀 New Deployment
```bash
# Deploy dengan auto-setup (RECOMMENDED)
npm run deploy

# Atau manual step-by-step
npm run compile
npm run deploy:separated
npm run export:abi
npm run update:env
```

### 2. 🔍 Verification
```bash
# Complete verification (RECOMMENDED)
npm run verify:comprehensive

# Atau step-by-step
npm run verify              # Blockchain verification
npm run verify:abi          # ABI consistency check
```

### 3. 🧪 Testing & Development
```bash
# Testing interactions
npm run test:interact
npm run test:courses
npm run test:licenses

# Network information
npm run network
npm run manage
```

### 4. 📱 Mobile App Setup
```bash
# Complete mobile setup
npm run setup:mobile

# Atau manual
npm run export:abi
npm run update:env
```

## 📋 Alternative: Manual Commands

Jika ingin menggunakan manual commands:

### 1. 🚀 Manual Deployment
```bash
# Complete deployment
npx hardhat run scripts/deploy.js --network mantaPacificTestnet

# Separated deployment
npx hardhat run scripts/deploy-separated.js --network mantaPacificTestnet
```

### 2. 🔍 Manual Verification
```bash
# Complete verification
npx hardhat run scripts/verify-comprehensive.js --network mantaPacificTestnet

# Basic verification
npx hardhat run scripts/verify.js --network mantaPacificTestnet

# ABI verification
node scripts/verify-abi-usage.js
```

### 3. 🛠️ Manual Management
```bash
# Script management
node scripts/manage.js

# Network information
node scripts/network-helper.js

# Check compatibility
node scripts/network-helper.js check

# Suggest correct command
node scripts/network-helper.js suggest verify-comprehensive.js
```
npx hardhat run scripts/deploy.js --network mantaPacificTestnet

# Verifikasi
node scripts/manage.js verify-comprehensive
```

### 2. ⚠️ Network Issues
```bash
# Check network compatibility
node scripts/network-helper.js check

# Get network info
node scripts/manage.js network

# Auto-suggests correct command
node scripts/manage.js verify-comprehensive
```

### 3. ✅ Verification
```bash
# Lengkap (akan suggest correct network jika diperlukan)
node scripts/manage.js verify-comprehensive

# Direct dengan network
npx hardhat run scripts/verify-comprehensive.js --network mantaPacificTestnet
```

## 🔧 Architecture Improvements

### Network-Aware Management
- **Smart Network Detection**: Script otomatis detect network mismatch
- **Intelligent Suggestions**: Memberikan command yang benar untuk network
- **Network Validation**: Validasi compatibility sebelum eksekusi

### Clean File Structure
```
scripts/
├── deploy.js                    ⭐ MAIN - Complete deployment
├── deploy-separated.js          📂 Alternative deployment
├── verify-comprehensive.js      ⭐ MAIN - Complete verification
├── verify.js                    📂 Basic verification
├── verify-abi-usage.js         📂 ABI-only verification
├── ABI-Export.js               📂 ABI management
├── update-mobile-env.js        📂 Environment management
├── network-helper.js           ⭐ NEW - Network utilities
├── manage.js                   ⭐ MAIN - Script management
├── README.md                   📖 Documentation
└── testing-*.js               🧪 Testing scripts
```

### Removed Duplicates
- ❌ `verify-separated.js` → merged into `verify.js`
- ❌ `deploy-complete.js` → renamed to `deploy.js`
- ❌ Old `deploy.js` → removed (redundant)
- ❌ Old `verify.js` → removed (basic version)

## ⚠️ Important Notes

### NPM Shortcuts vs Manual Commands
**NPM Shortcuts** (RECOMMENDED):
- ✅ Menggunakan `npm run <command>`
- ✅ Sesuai dokumentasi Manta Pacific
- ✅ Konsisten dengan praktek development modern
- ✅ Mudah untuk CI/CD integration

**Manual Commands**:
- 📋 Tetap tersedia untuk debugging dan development
- 📋 Menggunakan `npx hardhat run` atau `node scripts/`

### Network Configuration
- **Manta Pacific Sepolia Testnet**: `mantaPacificTestnet`
- **Chain ID**: `3441006`
- **RPC**: `https://pacific-rpc.sepolia-testnet.manta.network/http`
- **Explorer**: `https://pacific-explorer.sepolia-testnet.manta.network`

### Smart Network Handling
Script management sekarang **network-aware**:
- Deteksi otomatis network compatibility
- Suggest command yang benar jika ada mismatch
- Block eksekusi jika network tidak compatible

### Error Prevention
```bash
# ❌ Ini akan diblock oleh script management
node scripts/manage.js verify-comprehensive

# ✅ Script akan suggest ini
npx hardhat run scripts/verify-comprehensive.js --network mantaPacificTestnet
```

## 🔧 Troubleshooting

### Network Issues
**Problem**: Script running on hardhat but contracts on mantaPacificTestnet
**Solution**: Script management akan otomatis suggest command yang benar

### Command Suggestions
**Use**: `node scripts/network-helper.js suggest <script-name>`
**Result**: Get exact command untuk network yang benar

---

**📝 Updated**: July 2025 - Architecture Mode
**🏗️ Improvements**: Network-aware management, duplicates removed, intelligent suggestions
**👥 Maintainer**: EduVerse Development Team
