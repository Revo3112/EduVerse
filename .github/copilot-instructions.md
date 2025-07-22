# EduVerse - Advanced AI Coding Instructions

## 🎯 Project Overview
EduVerse adalah **ekosistem pendidikan Web3 multi-platform** dengan arsitektur portal modular:
- **Smart Contracts** (Manta Pacific Testnet, chainId: 3441006)
- **React Native App** (Expo + Wagmi Web3 integration)
- **Next.js Frontend** (TypeScript + Tailwind CSS v4)
- **Development Portal** (`npm run portal`) - **SINGLE ENTRY POINT FOR ALL OPERATIONS**

## 🚀 Essential Workflow (ALWAYS START HERE)

### **CRITICAL RULE: Use Portal Only**
```bash
npm run portal          # Main interface - USE THIS ALWAYS
npm run dev            # Alias untuk portal
```

**Portal Navigation Pattern:**
```bash
npm run portal → [Menu Number] → [Submenu Number]

# Key workflows:
→ 1 → 1    # Deploy Complete System
→ 2 → 1    # Complete Verification
→ 3 → 2    # Interactive Contract Test
→ 4 → 1    # Complete Mobile Setup
→ 6 → 1    # Complete Project Status
→ 7 → 1    # Quick Full Deploy & Setup
```

### **Portal Menu Structure (8 Main Sections)**
1. 🚀 **Deployment Operations** (6 sub-options)
   - Deploy Complete System, Local Network, Separated (Reuse)
   - Check Prerequisites, Show Status, Clean Deployment
2. 🔍 **Verification Operations** (6 sub-options)
   - Complete Verification, Blockchain Verification, Comprehensive
   - ABI Consistency Check, Quick Check, Show Status
3. 🧪 **Testing Operations** (7 sub-options)
   - Run All Tests, Interactive Contract Test, Course Exploration
   - License System Test, Course Update Test, Prerequisites, Status
4. 🛠️ **Utilities Operations** (8 sub-options)
   - Complete Mobile Setup, Export ABI (All/Mobile/Frontend)
   - Update Mobile Environment, Network Info, Status, Clean
5. ⚙️ **Development Operations** (8 sub-options)
   - Complete Development Setup, Compile, Unit Tests, Local Node
   - Console, Clean Build, Quick Check, Show Status
6. 📊 **Project Status** (6 sub-options)
   - Complete Overview, Deployment/Verification/Testing/Utilities/Development Status
7. 🔧 **Quick Actions** (6 sub-options)
   - Full Deploy & Setup, Complete Verification, Sync Mobile
   - Run All Tests, Development Setup, Quick Status Check

## 🏗️ Architecture & File Organization

### **Portal System (Never Access Directly)**
```
scripts/
├── portal.js              # MAIN ENTRY POINT (423 lines)
├── core/system.js         # Logger, utilities, network info, project status
├── export-system.js       # Unified ABI export system (372 lines)
└── modules/               # Managers (portal-only access)
    ├── deployment/manager.js    # Deployment operations (195 lines)
    ├── verification/manager.js  # Verification operations (225 lines)
    ├── testing/manager.js       # Testing operations (285 lines)
    ├── utilities/manager.js     # Utility operations (380 lines)
    └── development/manager.js   # Development operations (269 lines)
```

### **Smart Contracts (Manta Pacific)**
Four interconnected contracts dengan dependency chain:
- `CourseFactory` - Course creation + IPFS storage (base contract)
- `CourseLicense` - ERC1155 license management (depends on CourseFactory)
- `ProgressTracker` - Student progress tracking (depends on CourseFactory + CourseLicense)
- `CertificateManager` - NFT certificate issuance (depends on all above)

**File Structure:**
```
contracts/
├── CourseFactory.sol      # Base factory contract
├── CourseLicense.sol      # ERC1155 licensing system
├── ProgressTracker.sol    # Progress tracking logic
└── CertificateManager.sol # NFT certificate minting
deployed-contracts.json    # SINGLE SOURCE OF TRUTH for addresses
artifacts/                 # Compiled contract artifacts
└── contracts/             # Auto-generated ABIs and bytecode
```### **Auto-Sync ABI System**
Portal automatically distributes ABIs dengan unified ExportSystem:
```
eduweb/abis/                        # Frontend (auto-updated)
├── CourseFactory.json              # Contract ABI files
├── CourseLicense.json
├── ProgressTracker.json
├── CertificateManager.json
└── contract-addresses.json        # Network + contract addresses

EduVerseApp/src/constants/abi/      # Mobile (auto-updated)
├── CourseFactory.json              # Contract ABI files
├── CourseLicense.json
├── ProgressTracker.json
├── CertificateManager.json
├── contract-addresses.json        # Network + contract addresses
├── index.js                       # Auto-generated exports
└── contracts.js                   # Helper utilities
```

**Auto-Generated Mobile Structure:**
```javascript
// EduVerseApp/src/constants/abi/index.js (auto-generated)
export const CONTRACT_NAMES = {
  COURSEFACTORY: 'CourseFactory',
  COURSELICENSE: 'CourseLicense',
  PROGRESSTRACKER: 'ProgressTracker',
  CERTIFICATEMANAGER: 'CertificateManager'
};

export const CONTRACT_ABIS = {
  [CONTRACT_NAMES.COURSEFACTORY]: CourseFactoryABI,
  // ... other mappings
};

// Helper functions
export { getContractAddress, getContractABI, validateContractSetup }
```

## ⚡ Development Patterns

### **Before Any Changes**
1. `npm run portal → 6 → 1` (Check complete project status)
2. Review `deployed-contracts.json` (single source of truth)
3. `npm run portal → 3 → 7` (Check testing prerequisites)

### **After Contract Changes**
1. `npm run portal → 1 → 1` (Redeploy complete system)
2. `npm run portal → 2 → 1` (Complete verification)
3. ABIs sync automatically via ExportSystem
4. `npm run portal → 3 → 2` (Interactive contract test)

### **ExportSystem Class Integration**
Portal menggunakan unified ExportSystem untuk semua operasi ABI:
```javascript
// Used internally by portal - never call directly
const { ExportSystem } = require('./export-system');
const exportSystem = new ExportSystem();

// Portal automatically calls:
await exportSystem.export({ target: "all" });          // Export to both platforms
await exportSystem.export({ target: "mobile" });       # Mobile only
await exportSystem.export({ target: "frontend" });     # Frontend only
await exportSystem.export({ envOnly: true });          # Environment vars only
```

### **Package.json Scripts (Use Portal Instead)**
```bash
# These exist but use portal for consistency:
npm run deploy          # → Use: npm run portal → 1 → 1
npm run test:interact   # → Use: npm run portal → 3 → 2
npm run export:abi      # → Use: npm run portal → 4 → 2
npm run setup:mobile    # → Use: npm run portal → 4 → 1
npm run verify:comprehensive # → Use: npm run portal → 2 → 3
```

### **Manager Class Architecture**
Setiap manager memiliki standard pattern:
```javascript
class [Module]Manager {
  // Core operations
  async [operation]() { ... }

  // Status checking
  get[Module]Status() { ... }
  displayStatus() { ... }

  // Prerequisites
  check[Module]Prerequisites() { ... }

  // Cleanup
  async clean() { ... }
}
```

### **Error Handling & Logging**
```javascript
// Import from scripts/core/system.js
const { Logger, executeCommand, getNetworkInfo, colors } = require('./core/system');

Logger.header("Operation Title");     // Blue header
Logger.step(1, 4, "Step description"); // Progress tracking
Logger.success("Success message");    // Green success
Logger.error("Error message");        // Red error
Logger.warning("Warning message");    // Yellow warning
Logger.info("Info message");          // Cyan info
Logger.section("Section title");      // Bold section divider
```

### **Iterative Prompt Development**
Portal system provides real-time feedback loops:
```javascript
// Status checking pattern
const status = manager.getStatus();
if (!status.ready) {
  Logger.warning("Prerequisites not met");
  return false;
}

// Multi-step operations with progress
Logger.step(1, 4, "Compilation");
Logger.step(2, 4, "Deployment");
Logger.step(3, 4, "Verification");
Logger.step(4, 4, "ABI Export");
```

### **Testing Strategy (Portal-Managed)**
Never run test scripts directly - use portal:
- `→ 3 → 1` Run All Tests (sequential execution)
- `→ 3 → 2` Interactive Contract Test (`testnet-interact.js`)
- `→ 3 → 3` Course Exploration Test (`testing-explore-courses.js`)
- `→ 3 → 4` License System Test (`testing-my-licenses.js`)
- `→ 3 → 5` Course Update Test (`update_course.js`)
- `→ 3 → 6` Check Testing Prerequisites (verifies network + contracts)
- `→ 3 → 7` Show Testing Status (comprehensive health check)

**Testing Prerequisites Auto-Check:**
```javascript
// Testing manager validates:
hasDeployedContracts: fileExists('deployed-contracts.json')
hasTestScripts: all 4 test files exist
networkCompatible: connected to mantaPacificTestnet
prerequisitesMet: all above conditions true
```

## 🔧 Platform-Specific Patterns

### **Smart Contract Patterns**
- **Factory Pattern**: `CourseFactory.createCourse()`
- **ERC1155 Licensing**: Course-specific token IDs
- **IPFS Integration**: Multi-gateway fallback (5s timeout)
- **Fixed Pricing**: `MAX_PRICE_ETH = 0.002 ether`
- **Platform Fees**: 2% configurable
- **Chain ID**: 3441006 (Manta Pacific Testnet)

### **React Native (Expo)**
- **Wagmi + Viem**: `useBalance`, `useChainId` hooks
- **AppKit**: Wallet connections
- **Custom Dev Build**: Required for Web3 features
- **Setup**: `npm run portal → 4 → 1`
- **Environment**: Auto-managed `.env` + `.env.contracts`
- **ABI Structure**: Auto-generated `index.js` with `CONTRACT_NAMES`, `CONTRACT_ABIS`
- **Helper Functions**: `getContractAddress()`, `getContractABI()`, `validateContractSetup()`

### **Next.js Frontend**
- **App Router** (Next.js 15) + TypeScript
- **Tailwind CSS v4** with CSS variables
- **Livepeer**: Video streaming (API key required)
- **Start**: `cd eduweb && npm run dev` (after portal setup)
- **Environment**: Auto-managed `.env.local`

## ⚠️ Critical Rules & Common Issues

### **What NOT to Do**
- ❌ Never call manager modules directly
- ❌ Never run test scripts manually
- ❌ Never modify ABI files manually
- ❌ Never bypass portal system
- ❌ Never run `npx hardhat` commands directly
- ❌ Never edit `contract-addresses.json` files manually

### **Issue Resolution**
- **ABI Mismatch**: Portal auto-syncs → check `→ 6 → 1`
- **Environment Issues**: Portal updates `.env.local` automatically
- **Network Errors**: Portal validates Manta Pacific connectivity
- **Portal Errors**: Check `scripts/core/system.js` logging
- **Contract Verification**: Use `→ 2 → 1` for comprehensive verification
- **Mobile Setup**: Use `→ 4 → 1` for complete mobile configuration

### **Environment Requirements**
```bash
# Root .env (required)
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=any_value

# EduVerseApp/.env (auto-managed)
EXPO_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
EXPO_PUBLIC_COURSE_FACTORY_ADDRESS=0x...
EXPO_PUBLIC_COURSE_LICENSE_ADDRESS=0x...
EXPO_PUBLIC_PROGRESS_TRACKER_ADDRESS=0x...
EXPO_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=0x...
EXPO_PUBLIC_CHAIN_ID=3441006
EXPO_PUBLIC_NETWORK_NAME=mantaPacificTestnet

# eduweb/.env.local (auto-managed)
NEXT_PUBLIC_LIVEPEER_API_KEY=your_key
NEXT_PUBLIC_CHAIN_ID=3441006
NEXT_PUBLIC_COURSE_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_COURSE_LICENSE_ADDRESS=0x...
NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS=0x...
NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=0x...
```

## 🌐 Network Configuration
- **RPC**: `https://pacific-rpc.sepolia-testnet.manta.network/http`
- **Chain ID**: 3441006
- **Explorer**: `https://pacific-explorer.sepolia-testnet.manta.network`
- **Gas Optimization**: `optimizer.runs: 200`

## 🚀 Advanced Development Workflows

### **Daily Development Routine**
```bash
# 1. Quick health check
npm run portal → 6 → 1

# 2. If contracts changed
npm run portal → 1 → 1 → 2 → 1 → 4 → 1

# 3. Test changes
npm run portal → 3 → 2

# 4. Before committing
npm run portal → 7 → 6
```

### **Status Monitoring System**
Portal provides real-time health monitoring:
```javascript
// Quick status indicators in main menu:
📦 Deployed: ✅/❌     # Has deployed-contracts.json
🔍 Verified: ✅/❌     # Network compatibility check
📱 Mobile Ready: ✅/❌  # ABI files + environment setup
🌐 Frontend Ready: ✅/❌ # ABI files distributed
```

### **Debugging Portal Issues**
```bash
# Portal logs all operations via Logger system
# Check scripts/core/system.js for Logger methods
# Common debug patterns:

# 1. Check file existence
fileExists('deployed-contracts.json')

# 2. Network info validation
getNetworkInfo() // Returns network status

# 3. Manager status checks
deployment.getDeploymentStatus()
verification.getVerificationStatus()
testing.getTestingStatus()
utilities.getUtilitiesStatus()
development.getDevelopmentStatus()
```

### **Advanced Portal Features**
- **Error Recovery**: Portal handles errors gracefully with cleanup
- **Status Persistence**: Manager states persist across sessions
- **Network Validation**: Auto-detects Manta Pacific connection
- **ABI Consistency**: Validates mobile/frontend ABI synchronization
- **Dependency Checking**: Verifies all prerequisites before operations

## 📝 Best Practices for AI Agents

1. **Always Start with Status**: Run `→ 6 → 1` before any operation
2. **Follow Dependency Chain**: Deploy → Verify → Test → Export
3. **Use Portal Exclusively**: Never bypass the unified interface
4. **Monitor Prerequisites**: Check manager.getStatus() before operations
5. **Validate After Changes**: Run comprehensive tests after modifications
6. **Document Operations**: Portal logs provide audit trail
7. **Handle Errors Gracefully**: Use Logger system for consistent output
8. **Respect File Management**: Never edit auto-generated files manually

## 🏗️ Architecture Insights

### **Core System Components**
```
EduVerse Ecosystem:
├── Portal System (scripts/portal.js) - Central command interface
├── Manager Classes (5 modules) - Specialized operation handlers
├── Smart Contracts (4 contracts) - Blockchain functionality
├── ExportSystem - Unified ABI distribution
├── React Native App - Mobile platform
└── Next.js Frontend - Web platform
```

### **Manager Class Patterns**
All managers follow consistent patterns:
- **Status Methods**: `getStatus()`, `validatePrerequisites()`
- **Async Operations**: Promise-based with error handling
- **Logging Integration**: Consistent Logger usage
- **Dependency Checking**: Prerequisites validation before execution
- **State Management**: Persistent status across portal sessions

### **Data Flow Architecture**
```
Smart Contracts (Hardhat)
    ↓ (Deployment)
deployed-contracts.json
    ↓ (Export System)
├── EduVerseApp/src/constants/abi/ (React Native)
└── eduweb/abis/ (Next.js)
    ↓ (Auto-generated helpers)
Contract helper functions
```

### **Critical Integration Points**
- **ABI Synchronization**: ExportSystem ensures consistent ABIs across platforms
- **Environment Management**: Portal auto-manages all `.env` files
- **Network Compatibility**: Manta Pacific Testnet validation throughout
- **Contract Verification**: Multi-step verification with status tracking
- **Testing Orchestration**: Sequential test execution with prerequisites

### **Development Lifecycle**
```
1. Portal Health Check (→ 6 → 1)
2. Contract Development (edit .sol files)
3. Deployment Pipeline (→ 1 → 1 → 2 → 1)
4. Verification Process (→ 2 → 1)
5. ABI Distribution (→ 4 → 1)
6. Testing Validation (→ 3 → 1)
7. Status Confirmation (→ 6 → 1)
```

## 🔍 Troubleshooting Guide

### **Common Portal Issues**
| Issue | Symptoms | Solution |
|-------|----------|----------|
| Portal Won't Start | Menu doesn't appear | Check Node.js version, run `npm install` |
| Manager Errors | Operations fail silently | Check `scripts/core/system.js` logs |
| Network Issues | "Not connected" errors | Verify Manta Pacific RPC in config |
| ABI Mismatches | Contract call failures | Run `→ 4 → 1` to resync ABIs |
| Test Failures | Tests don't run | Check `→ 3 → 6` prerequisites |

### **File System Health**
Portal monitors these critical files:
- `deployed-contracts.json` - Contract addresses
- `contracts/*.sol` - Smart contract source
- `EduVerseApp/src/constants/abi/index.js` - Mobile ABIs
- `eduweb/abis/*.json` - Frontend ABIs
- `.env` files - Environment configuration

### **Performance Considerations**
- Portal operations are sequential to prevent conflicts
- Manager status is cached to reduce redundant checks
- ExportSystem uses file watching for efficient updates
- Testing runs with network validation to prevent failures
- Logger system buffers output for better UX

## 🚀 Advanced AI Agent Strategies

### **Efficient Workflow Patterns**
```javascript
// Pattern: Always validate before acting
const status = await manager.getStatus();
if (!status.ready) {
  await manager.validatePrerequisites();
}

// Pattern: Use portal navigation shortcuts
// Instead of multiple commands, use menu paths
// → 1 → 1 → 2 → 1 (Deploy + Verify + Export + Test)
```

### **Code Quality Assurance**
- **Contract Changes**: Always deploy → verify → test sequence
- **Mobile Development**: Use `→ 4 → 1` for complete mobile setup
- **Frontend Development**: Ensure ABIs are current before React development
- **Cross-Platform**: ExportSystem maintains consistency automatically

### **Debug-First Approach**
1. **Start with Status**: `→ 6 → 1` reveals system health
2. **Check Prerequisites**: Each manager validates its requirements
3. **Follow Dependencies**: Respect the deployment → verification → testing chain
4. **Monitor Logs**: Portal Logger provides detailed operation tracking
5. **Validate Results**: Always confirm successful completion

This comprehensive guide ensures AI agents understand both the technical architecture and operational patterns that make EduVerse development efficient and reliable.
