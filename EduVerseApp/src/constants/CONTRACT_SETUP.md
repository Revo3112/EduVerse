# EduVerse Smart Contract Setup Guide

## 📋 Contract Overview

EduVerse Mobile App menggunakan 7 smart contracts yang di-deploy di **Manta Pacific Testnet**:

### Core Education Contracts

- **CourseFactory** (`0xFcdb5dc19936E8571bFDB3fa29e8938a8A6B2c3b`)

  - Membuat dan mengelola course
  - Mengatur pricing dan metadata course

- **CourseLicense** (`0x91B2B87C4618291ead469d22c82cB8ddF7111623`)

  - NFT-based course licenses (ERC-1155)
  - Subscription management

- **ProgressTracker** (`0x678450B280281BbA07A268D3604f5EEaD68d34A2`)

  - Tracking progress pembelajaran siswa
  - Completion validation

- **CertificateManager** (`0x29CE369C4C103C6396F6Ec804E59F1292A04E589`)
  - Menerbitkan sertifikat completion (ERC-1155)
  - Certificate verification

### Platform Management

- **PlatformRegistry** (`0xb03Fa27f0e9E48d355Aaa9Be8E194815E7AeE6C4`)
  - Platform-wide settings dan registry

### Oracle Integration

- **MockV3Aggregator** (`0x66B9C917CE2B68C76F5849075cF7768cBAB55746`)
  - Price feed untuk ETH/USD conversion

## 🚀 Quick Start

### 1. Import Contracts

```javascript
import {
  CONTRACT_NAMES,
  CONTRACT_ABIS,
  getContractAddress,
  getContractABI,
  validateContractSetup,
} from "@/constants/abi";

// Atau import specific contracts
import {
  initializeContracts,
  getEducationContracts,
} from "@/constants/contracts";
```

### 2. Initialize dengan Thirdweb Client

```javascript
import { getContract } from "thirdweb";
import { mantaPacificTestnet } from "@/constants/blockchain";

const courseFactory = getContract({
  client: thirdwebClient,
  chain: mantaPacificTestnet,
  address: getContractAddress(CONTRACT_NAMES.COURSE_FACTORY),
  abi: getContractABI(CONTRACT_NAMES.COURSE_FACTORY),
});
```

### 3. Bulk Initialize Semua Contracts

```javascript
import { initializeContracts } from "@/constants/contracts";

const contracts = initializeContracts(thirdwebClient);
// contracts.courseFactory, contracts.courseLicense, etc.
```

## 🔧 Environment Variables

Pastikan `.env` file memiliki:

```env
# Thirdweb Configuration
EXPO_PUBLIC_THIRDWEB_CLIENT_ID=95f0edae49127ccece18944a63b29320

# Contract Addresses - Manta Pacific Testnet
EXPO_PUBLIC_COURSE_FACTORY_ADDRESS=0xFcdb5dc19936E8571bFDB3fa29e8938a8A6B2c3b
EXPO_PUBLIC_COURSE_LICENSE_ADDRESS=0x91B2B87C4618291ead469d22c82cB8ddF7111623
EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS=0x678450B280281BbA07A268D3604f5EEaD68d34A2
EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=0x29CE369C4C103C6396F6Ec804E59F1292A04E589
EXPO_PUBLIC_PLATFORM_REGISTRY_ADDRESS=0xb03Fa27f0e9E48d355Aaa9Be8E194815E7AeE6C4
EXPO_PUBLIC_MOCK_V3_AGGREGATOR_ADDRESS=0x66B9C917CE2B68C76F5849075cF7768cBAB55746

# Network Configuration
EXPO_PUBLIC_CHAIN_ID=3441006
EXPO_PUBLIC_NETWORK_NAME=mantaPacificTestnet
```

## 🔍 Verification

### Manual Verification

```javascript
import {
  runContractVerification,
  healthCheck,
} from "@/constants/contractVerification";

// Detailed verification
runContractVerification();

// Quick health check
const health = healthCheck();
console.log("Contract Health:", health.status);
```

### Contract Explorer Links

- [CourseFactory](https://pacific-explorer.sepolia-testnet.manta.network/address/0xFcdb5dc19936E8571bFDB3fa29e8938a8A6B2c3b)
- [CourseLicense](https://pacific-explorer.sepolia-testnet.manta.network/address/0x91B2B87C4618291ead469d22c82cB8ddF7111623)
- [ProgressTracker](https://pacific-explorer.sepolia-testnet.manta.network/address/0x678450B280281BbA07A268D3604f5EEaD68d34A2)
- [CertificateManager](https://pacific-explorer.sepolia-testnet.manta.network/address/0x29CE369C4C103C6396F6Ec804E59F1292A04E589)
- [PlatformRegistry](https://pacific-explorer.sepolia-testnet.manta.network/address/0xb03Fa27f0e9E48d355Aaa9Be8E194815E7AeE6C4)
- [MockV3Aggregator](https://pacific-explorer.sepolia-testnet.manta.network/address/0x66B9C917CE2B68C76F5849075cF7768cBAB55746)

## 📁 File Structure

```
src/constants/
├── abi/
│   ├── index.js              # Main ABI exports
│   ├── CourseFactory.json    # Contract ABIs
│   ├── CourseLicense.json
│   ├── ProgressTracker.json
│   ├── CertificateManager.json
│   ├── PlatformRegistry.json
│   ├── MockV3Aggregator.json
│   └── contract-addresses.json
├── blockchain.js             # Chain configuration
├── contracts.js              # Contract helpers
└── contractVerification.js   # Verification tools
```

## 🛠 Maintenance

### Re-export ABIs setelah contract update:

```bash
# Di root project
node scripts/ABI-Export.js
```

### Update environment variables setelah deployment baru:

1. Update `.env` dengan contract addresses baru
2. Run verification untuk memastikan semua benar
3. Test contract interactions

## 🚨 Troubleshooting

### Common Issues:

1. **Contract not found**: Pastikan address di `.env` benar
2. **ABI mismatch**: Re-run `ABI-Export.js` script
3. **Network error**: Pastikan RPC URL Manta Pacific Testnet benar
4. **Client ID error**: Pastikan `EXPO_PUBLIC_THIRDWEB_CLIENT_ID` sudah di set

### Verification Commands:

```javascript
// Check if all contracts are available
import { validateContractSetup } from "@/constants/abi";
const validation = validateContractSetup();
console.log("Valid:", validation.isValid);

// Get contract summary
import { getContractSummary } from "@/constants/contracts";
console.log(getContractSummary());
```
