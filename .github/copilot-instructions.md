# EduVerse - AI Coding Instructions

## Project Architecture

EduVerse is a **multi-platform Web3 education ecosystem** with a modular development portal architecture:

### Core Components
- **Smart Contracts** (`/contracts/`) - Solidity contracts on Manta Pacific Testnet (chainId: 3441006)
- **React Native App** (`/EduVerseApp/`) - Mobile application with Expo + Wagmi Web3 integration
- **Next.js Frontend** (`/eduweb/`) - Primary web interface with TypeScript + Tailwind CSS v4
- **Development Portal** (`/scripts/portal.js`) - **ALWAYS use this** - unified development environment

### Smart Contract System
Four interconnected contracts deployed on Manta Pacific Testnet:
- `CourseFactory` - Course creation with IPFS content storage
- `CourseLicense` - ERC1155 license management for course access
- `ProgressTracker` - Student progress tracking system
- `CertificateManager` - NFT certificate issuance for completion

Contract addresses in `deployed-contracts.json` auto-sync to all platforms via portal system.

## Essential Development Workflow

### **CRITICAL: Always Use Portal System**
```bash
npm run portal          # Main development interface - USE THIS
npm run dev            # Alias for portal
```

The portal provides a **professional modular interface** with real-time status:
- 🚀 Deployment Operations (compile, deploy, setup)
- 🔍 Verification Operations (contract verification)
- 🧪 Testing Operations (interactive testing scripts)
- 🛠️ Utility Operations (ABI export, environment sync)
- ⚙️ Development Operations (compile, test, debug)
- 📊 Project Status (health monitoring)

### **Key Portal Workflows**
```bash
# Complete deployment workflow
npm run portal → 1 → 1    # Deploy Complete System

# ABI synchronization (essential after contract changes)
npm run portal → 4 → 2    # Export ABI Files (All Targets)

# Quick health check
npm run portal → 6 → 1    # Complete Project Overview
```

## Network Configuration

### Manta Pacific Testnet Setup
- **RPC**: `https://pacific-rpc.sepolia-testnet.manta.network/http`
- **Chain ID**: 3441006
- **Explorer**: `https://pacific-explorer.sepolia-testnet.manta.network`
- **Gas Optimization**: Contracts use `optimizer.runs: 200`

### Required Environment
```bash
# Root .env
PRIVATE_KEY=your_private_key    # For deployment
ETHERSCAN_API_KEY=any          # Any value works for verification

# eduweb/.env.local (auto-managed by portal)
NEXT_PUBLIC_LIVEPEER_API_KEY=your_key  # Manual: Required for video
```

## Critical File Organization

### Portal Architecture
```
scripts/
├── portal.js              # MAIN ENTRY POINT - Always use this
├── core/system.js         # Shared utilities, enhanced logging
├── modules/               # Modular managers (never call directly)
│   ├── deployment/manager.js
│   ├── verification/manager.js
│   ├── testing/manager.js
│   ├── utilities/manager.js
│   └── development/manager.js
```

### Auto-Sync ABI System
```
eduweb/abis/               # Frontend ABIs (auto-updated)
├── CourseFactory.json
├── CourseLicense.json
├── ProgressTracker.json
├── CertificateManager.json
└── contract-addresses.json

EduVerseApp/src/constants/abi/  # Mobile ABIs (auto-updated)
```

## Code Patterns & Conventions

### Smart Contract Patterns
- **Factory Pattern**: `CourseFactory.createCourse()` creates course instances
- **ERC1155 Licensing**: Multi-token standard with course-specific token IDs
- **IPFS Integration**: Content stored as CID references (Pinata + multiple gateways)
- **Fixed Pricing**: `MAX_PRICE_ETH = 0.002 ether` (~$5 USD)
- **Platform Fees**: 2% (200 basis points) configurable by owner

### React Native Mobile App
- **Expo managed workflow** with custom development build
- **Wagmi + Viem** for Web3 integration (`useBalance`, `useChainId`)
- **AppKit** for wallet connections
- **Component Structure**: Functional components with hooks pattern
- **IPFS Video Loading**: Multiple gateway fallback system with 5s timeouts

### Next.js Frontend (`/eduweb/`)
- **App Router** (Next.js 15) with TypeScript
- **Tailwind CSS v4** with CSS variables theming
- **Livepeer integration** for video streaming (requires API key)
- **Environment auto-sync** via portal system

## Development Best Practices

### Before Making Changes
1. **Check status**: `npm run portal → 6` (Project Status)
2. **Understand current state**: Review `deployed-contracts.json`
3. **Test existing functionality**: `npm run portal → 3` (Testing Operations)

### After Contract Changes
1. **Redeploy**: `npm run portal → 1 → 1` (Deploy Complete System)
2. **Verify**: `npm run portal → 2 → 1` (Complete Verification)
3. **Sync ABIs**: Automatic during deployment, or manual via `npm run portal → 4 → 2`
4. **Test**: `npm run portal → 3 → 2` (Interactive Contract Test)

### Common Issues & Solutions
- **ABI Mismatch**: Portal automatically syncs - check `portal → 6 → 1` for status
- **Environment Issues**: Portal auto-updates `.env.local` - check sync status
- **Network Errors**: Portal validates Manta Pacific connectivity
- **Portal Errors**: Enhanced logging in `scripts/core/system.js` with color-coded output

### Testing Strategy
Use portal's interactive testing (don't run scripts manually):
- **Course Creation**: `portal → 3 → 3` (Course Exploration Test)
- **License System**: `portal → 3 → 4` (License System Test)
- **Contract Interaction**: `portal → 3 → 2` (Interactive Contract Test)

### Mobile Development
- **Setup**: `npm run portal → 4 → 1` (Complete Mobile Setup)
- **Web3 Integration**: Uses Wagmi hooks for contract interactions
- **IPFS Video**: Multi-gateway system with fallback (Pinata, Cloudflare, W3S)
- **Development Build**: Required for Web3 features in Expo

### Web Development
- **Start**: `cd eduweb && npm run dev` (after portal setup)
- **API Routes**: `/api/livepeer/assets` for video management
- **Client Components**: Mark with `'use client'` for Web3 interactions
- **Environment**: Auto-managed by portal system
