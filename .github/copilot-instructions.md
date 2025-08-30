# EduVerse - Advanced AI Coding Instructions

## 🎯 Project Overview
EduVerse adalah **ekosistem pendidikan Web3 multi-platform** dengan arsitektur portal modular:
- **Smart Contracts** (Manta Pacific Testnet, chainId: 3441006)
- **React Native App** (Expo + Wagmi Web3 integration)
- **Next.js Frontend** (TypeScript + Tailwind CSS v4)
- **Development Portal** (`npm run portal`) - **SINGLE ENTRY POINT FOR ALL OPERATIONS**

## � Development Environment & AI Requirements

### **CRITICAL ENVIRONMENT SPECIFICATIONS**
- **Operating System**: Windows 11
- **IDE**: Visual Studio Code with GitHub Copilot
- **Terminal**: PowerShell (Windows PowerShell v5.1) - **MANDATORY**
- **Node.js**: Latest LTS version
- **Git**: Git for Windows with PowerShell integration

### **MANDATORY AI AGENT REQUIREMENTS**

#### **🧠 MEMORY FIRST APPROACH**
- **ALWAYS** check MCP memory storage with relevant topic about the prompt before any action.
- **MANDATORY** search existing knowledge with `mcp_memory_search_nodes` before creating new entities
- **REQUIRED** store all important findings, solutions, and patterns using MCP memory tools
- **ESSENTIAL** create relationships between related concepts for knowledge graph integrity

#### **💡 PowerShell Command Requirements**
- **ALL** terminal commands must be PowerShell-compatible
- **NEVER** use bash/Linux syntax - always Windows PowerShell
- Use `;` for command chaining: `cd eduweb; npm run dev`
- Use `Get-ChildItem` instead of `ls`, `Remove-Item` instead of `rm`
- Use Windows path separators: `\` not `/`
- Example: `Get-Process node; Stop-Process -Name node -Force`

#### **🔍 VS Code Integration**
- Leverage GitHub Copilot for code suggestions
- Use VS Code extensions for EduVerse development
- Configure workspace settings for optimal AI assistance
- Enable MCP servers in VS Code for enhanced functionality

### **DEVELOPMENT STANDARDS INTEGRATION**

#### **📱 Next.js + Tailwind CSS Standards**
- **Architecture**: App Router with server and client components
- **TypeScript**: Strict mode with proper type definitions and Zod validation
- **Styling**: Tailwind CSS v4 with consistent color palette and dark mode support
- **Performance**: SSR optimization, bundle splitting, image optimization with next/image
- **Security**: Input validation, authentication checks, CSRF protection

#### **⚡ Performance Optimization Requirements**
- **Measure First**: Always profile and measure before optimizing
- **Frontend**: Minimize DOM manipulations, use CSS animations, implement lazy loading
- **Backend**: Use asynchronous I/O, implement proper caching, optimize database queries
- **Code Review**: Check for O(n^2) algorithms, memory leaks, unnecessary computations
- **Monitoring**: Set up performance budgets and automated testing

## �🚀 Essential Workflow (ALWAYS START HERE)

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
  [CONTRACT_NAMES.COURSELICENSE]: CourseLicenseABI,
  [CONTRACT_NAMES.PROGRESSTRACKER]: ProgressTrackerABI,
  [CONTRACT_NAMES.CERTIFICATEMANAGER]: CertificateManagerABI
};

// Helper functions (in contracts.js)
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

### **Quick Actions System (IMPORTANT CORRECTION)**
❌ **INCORRECT (from README.md)**: `npm run quick <action>` commands do NOT exist in package.json
✅ **CORRECT**: Quick Actions accessed via portal navigation:
```bash
npm run portal → 7 → [Quick Actions Menu]

# Available Quick Actions (Portal Menu 7):
→ 7 → 1    # 🚀 Full Deploy & Setup (complete workflow)
→ 7 → 2    # 🔍 Complete Verification (comprehensive check)
→ 7 → 3    # 📱 Sync Mobile App (ABI + environment)
→ 7 → 4    # 🧪 Run All Tests (sequential execution)
→ 7 → 5    # ⚙️ Development Setup (compile + setup)
→ 7 → 6    # 📊 Quick Status Check (health monitoring)
```

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

## 🏆 Advanced Development Standards (2025)

### **Next.js + Tailwind CSS Best Practices**

#### **Architecture Standards**
- **App Router**: Server and client components with proper data fetching
- **TypeScript**: Strict mode with clear type definitions and Zod validation
- **Component Hierarchy**: Plan component structure before implementation
- **Error Boundaries**: Implement proper error handling at component level
- **Loading States**: Use React Suspense for optimal user experience

#### **Styling & Design System**
- **Tailwind CSS v4**: CSS variables with consistent color palette
- **Dark Mode**: Built-in support with semantic color tokens
- **Responsive Design**: Mobile-first approach with container queries
- **Typography**: Semantic font sizing and proper line heights
- **Accessibility**: WCAG 2.2 compliance for educational platform

#### **State Management**
- **Server Components**: Default choice for server-side state
- **Client State**: React hooks for client-side state management
- **Optimistic Updates**: Implement where appropriate for better UX
- **Cache Strategy**: Proper invalidation and revalidation patterns

#### **Security Implementation**
- **Input Validation**: Sanitization on both client and server
- **Authentication**: Proper checks with secure session handling
- **CSRF Protection**: Implement anti-CSRF measures
- **Rate Limiting**: API route protection against abuse
- **XSS Prevention**: Proper output encoding and CSP headers

### **Performance Optimization Standards**

#### **General Principles**
- **Measure First**: Always profile before optimizing using proper tools
- **Common Case Focus**: Optimize frequently executed code paths
- **Resource Efficiency**: Minimize CPU, memory, network, and disk usage
- **Performance Budgets**: Set and enforce limits for bundle size and load times
- **Automated Testing**: Include performance tests in CI/CD pipeline

#### **Frontend Performance**
- **Rendering Optimization**:
  - Minimize DOM manipulations with batch updates
  - Use CSS animations over JavaScript for smooth effects
  - Implement `React.memo`, `useMemo`, and `useCallback` strategically
  - Avoid inline styles that trigger layout thrashing
- **Asset Optimization**:
  - Image compression with modern formats (WebP, AVIF)
  - Bundle splitting and tree-shaking with proper build tools
  - Lazy loading for images and components
  - Font subsetting and `font-display: swap`
- **Network Optimization**:
  - HTTP/2 multiplexing and server push where beneficial
  - CDN usage for global asset delivery
  - Service Workers for caching strategies
  - Preload critical resources with proper prioritization

#### **Backend Performance**
- **Algorithm Efficiency**: Choose appropriate data structures and avoid O(n²) complexity
- **Concurrency**: Use async/await patterns and proper thread/worker pools
- **Caching Strategy**: Multi-layer caching with proper invalidation
- **Database Optimization**: Indexed queries, connection pooling, pagination
- **API Design**: Efficient payloads with pagination and filtering

#### **Mobile Performance (React Native)**
- **Bundle Size**: Lazy loading and code splitting for faster startup
- **Memory Management**: Proper cleanup and efficient image handling
- **Network Efficiency**: Request batching and offline capabilities
- **Platform Optimization**: iOS/Android specific optimizations

#### **Code Review Performance Checklist**
- [ ] Algorithm complexity analysis (avoid O(n²) patterns)
- [ ] Memory leak prevention (event listeners, references)
- [ ] Database query optimization and indexing
- [ ] Bundle size impact assessment
- [ ] Network request minimization
- [ ] Caching implementation verification
- [ ] Error handling performance impact
- [ ] Mobile responsiveness validation

### **Web3 Performance Considerations**
- **Gas Optimization**: Efficient smart contract interactions
- **RPC Calls**: Batch blockchain queries where possible
- **Wallet Integration**: Optimize connection and transaction flows
- **IPFS Operations**: Multi-gateway fallback with timeouts
- **State Synchronization**: Efficient blockchain data caching

## 🔧 Platform-Specific Patterns

### **Smart Contract Patterns**
- **Factory Pattern**: `CourseFactory.createCourse()`
- **ERC1155 Licensing**: Course-specific token IDs
- **IPFS Integration**: Multi-gateway fallback (5s timeout)
- **Fixed Pricing**: `MAX_PRICE_ETH = 0.002 ether`
- **Platform Fees**: 2% configurable
- **Chain ID**: 3441006 (Manta Pacific Testnet)

### **React Native (Expo) - Enhanced Architecture**
- **Expo 51**: React Native 0.74.5 with custom dev build
- **Web3 Stack**: Wagmi + Viem + @reown/appkit-wagmi-react-native
- **Context Architecture**: `Web3Context.js` with 30+ blockchain functions
- **Key Features**:
  - Comprehensive transaction handling with retry logic
  - Caching system for courses, licenses, and progress
  - Multi-gateway IPFS integration with fallbacks
  - Professional error handling with user-friendly messages
  - Real-time blockchain data synchronization
- **Setup**: `npm run portal → 4 → 1` for complete mobile configuration
- **ABI Structure**: Auto-generated `index.js` with `CONTRACT_NAMES`, `CONTRACT_ABIS`
- **Helper Functions**: `getContractAddress()`, `getContractABI()`, `validateContractSetup()`
- **Environment**: Auto-managed `.env` with all contract addresses + chain configuration

**Web3Context Core Functions:**
```javascript
// Course Management
createCourse, getAllCourses, getCourse, getCourseSections, addCourseSection
// Licensing System
mintLicense, hasValidLicense, getLicense, getUserLicenses
// Progress Tracking
completeSection, getUserProgress, isCourseCompleted
// Certificate System
issueCertificate, getCertificateForCourse, getUserCertificates
// Creator Tools
getCreatorCourses, getCourseSectionsCount, getTotalCourses
```

### **Next.js Frontend - Web3 Integration Ready**
- **Next.js 15**: App Router + React 19 + TypeScript
- **Tailwind CSS v4**: CSS variables with PostCSS optimization
- **Turbopack**: Development with `--turbopack` flag for faster builds
- **Current State**: Basic setup ready for Web3 integration
- **Start**: `cd eduweb && npm run dev` (after portal setup)
- **Environment**: Auto-managed `.env.local` with contract addresses
- **ABI Location**: `eduweb/abis/` with individual JSON files + `contract-addresses.json`
- **Integration Points**: Ready for Wagmi/Viem Web3 components
- **Styling**: Geist font family + responsive Tailwind patterns

**Ready for Web3 Development:**
```javascript
// Available resources for frontend Web3 integration:
- Contract ABIs: eduweb/abis/*.json (auto-synced)
- Addresses: eduweb/abis/contract-addresses.json
- Environment: NEXT_PUBLIC_*_ADDRESS variables (auto-managed)
- Network: NEXT_PUBLIC_CHAIN_ID=3441006 (Manta Pacific)
```

## ⚠️ **Critical Rules & Common Issues**

### **What NOT to Do**
- ❌ Never call manager modules directly
- ❌ Never run test scripts manually
- ❌ Never modify ABI files manually
- ❌ Never bypass portal system
- ❌ Never run `npx hardhat` commands directly
- ❌ Never edit `contract-addresses.json` files manually

### **Portal-Only Access Rule**
Never use npm commands directly - always use portal equivalents:
```bash
npm run deploy          # → Use: npm run portal → 1 → 1
npm run test:interact   # → Use: npm run portal → 3 → 2
npm run export:abi      # → Use: npm run portal → 4 → 2
npm run setup:mobile    # → Use: npm run portal → 4 → 1
npm run verify:comprehensive # → Use: npm run portal → 2 → 3
```

### **File Management Rules**
Never edit these files manually - they are auto-managed:
- `deployed-contracts.json` - Contract addresses
- `EduVerseApp/src/constants/abi/*.json` - Mobile ABIs
- `eduweb/abis/*.json` - Frontend ABIs
- `contract-addresses.json` files - Address mappings
- `.env` files - Environment variables (auto-updated by portal)

### **Environment Management Rules**
Portal auto-manages all environment files:
- **EduVerseApp/.env** - Auto-updated with contract addresses
- **eduweb/.env.local** - Auto-updated with NEXT_PUBLIC_* variables
- **Root .env** - User-managed (PRIVATE_KEY, API keys)
- ❌ Never run `npx hardhat` commands directly
- ❌ Never edit `contract-addresses.json` files manually

### **Testing Rules**
Use portal for all testing operations:
```bash
npm run portal → 3 → 1    # Run All Tests (sequential execution)
npm run portal → 3 → 2    # Interactive Contract Test (testnet-interact.js)
npm run portal → 3 → 6    # Check Testing Prerequisites
npm run portal → 3 → 7    # Show Testing Status (comprehensive health check)
```

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
```powershell
# 1. Check MCP memory first (MANDATORY)
# Always run: mcp_memory_read_graph and mcp_memory_search_nodes

# 2. Quick health check
npm run portal; # Navigate to 6 → 1

# 3. If contracts changed (PowerShell command chaining)
npm run portal; # Navigate to 1 → 1 → 2 → 1 → 4 → 1

# 4. Test changes
npm run portal; # Navigate to 3 → 2

# 5. Before committing
npm run portal; # Navigate to 7 → 6

# PowerShell-specific commands for file operations:
Get-ChildItem deployed-contracts.json    # Check contract file
Get-Content .env | Select-String "CHAIN" # Verify environment
```

### **Contract Change Workflow**
```bash
# Edit .sol files → Deploy → Verify → ABIs sync automatically → Test
npm run portal → 1 → 1    # Deploy Complete System
npm run portal → 2 → 1    # Complete Verification
# ABIs automatically sync to mobile and frontend
npm run portal → 3 → 2    # Interactive contract test
```

### **Prerequisites Check Pattern**
```bash
# Always check manager.getStatus() before operations
# Validate deployed-contracts.json exists
# Confirm network connectivity to Manta Pacific
npm run portal → 6 → 1    # Check complete status first
```

### **Status Monitoring System (Enhanced)**
Portal provides comprehensive real-time health monitoring:
```javascript
// Real-time status indicators in portal main menu:
📦 Deployed: ✅/❌       # Has deployed-contracts.json with valid addresses
🔍 Verified: ✅/❌       # Network compatibility + contract verification
📱 Mobile Ready: ✅/❌    # ABI files + environment setup + auto-generated helpers
🌐 Frontend Ready: ✅/❌  # ABI files distributed + contract addresses synced

// Detailed status via Portal → 6 → 1 (Complete Overview):
- Deployment Status: Contract addresses, network validation
- Verification Status: Blockchain verification, ABI consistency
- Testing Status: Prerequisites met, script availability
- Utilities Status: Mobile/Frontend ABI sync, environment files
- Development Status: Compilation ready, clean build state
```

**Status Check Workflow:**
```bash
npm run portal → 6 → 1    # Complete Project Overview (recommended daily)
npm run portal → 6 → [2-6] # Individual module status checks
npm run portal → 7 → 6    # Quick Status Check (fast health monitoring)
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

## � Security & Safety Guidelines

### **Smart Contract Security**
- **Audit Contract Changes**: Always use `→ 2 → 1` for comprehensive verification after modifications
- **IPFS Security**: Validate IPFS content hashes and implement gateway timeouts (5s)
- **Access Control**: Verify owner-only functions and role-based permissions
- **Reentrancy Protection**: Check for reentrancy guards in payable functions
- **Input Validation**: Ensure proper validation of course data and user inputs

### **Web3 Integration Safety**
- **Private Key Management**: Never log or expose private keys in any environment
- **Network Validation**: Always validate Manta Pacific connection before operations
- **Contract Address Verification**: Use `deployed-contracts.json` as single source of truth
- **Transaction Safety**: Implement proper error handling for failed transactions
- **Wallet Security**: Validate wallet connections and handle disconnections gracefully

### **Environment Security**
- **Auto-Generated Files**: Never manually edit ABI files or contract addresses
- **Environment Variables**: Let portal manage all `.env` files automatically
- **API Keys**: Secure Expo and third-party API keys in proper environment variables
- **Network Configuration**: Use only official Manta Pacific RPC endpoints

### **AI Prompt Safety**
- **Context Boundaries**: Keep EduVerse-specific context separate from external data
- **Code Injection Prevention**: Validate all generated code against project patterns
- **Permission Verification**: Ensure suggestions respect portal-only access patterns
- **Bias Prevention**: Consider all user types (students, instructors, developers)

## �🔍 Troubleshooting Guide

### **Common Portal Issues**
| Issue | Symptoms | Solution |
|-------|----------|----------|
| Portal Won't Start | Menu doesn't appear | Check Node.js version, run `npm install` |
| Manager Errors | Operations fail silently | Check `scripts/core/system.js` logs |
| Network Issues | "Not connected" errors | Verify Manta Pacific RPC in config |
| ABI Mismatches | Contract call failures | Run `→ 4 → 1` to resync ABIs |
| Test Failures | Tests don't run | Check `→ 3 → 6` prerequisites |

### **PowerShell-Specific Commands**
```powershell
# File operations (Windows PowerShell)
Get-ChildItem *.json                    # List JSON files
Get-Content deployed-contracts.json     # View contract addresses
Remove-Item .env.backup -Force          # Delete backup files
Test-Path "deployed-contracts.json"     # Check file existence

# Process management
Get-Process node                         # Check running Node processes
Stop-Process -Name node -Force          # Kill Node processes
Start-Process -FilePath "npm" -ArgumentList "run", "portal" # Start portal

# Network troubleshooting
Test-NetConnection -ComputerName "pacific-rpc.sepolia-testnet.manta.network" -Port 443
Invoke-WebRequest -Uri "https://pacific-rpc.sepolia-testnet.manta.network/http" -Method POST
```

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

### **AI Safety & Prompt Engineering Best Practices**
When working with EduVerse codebase, apply these AI safety principles:

**Clarity & Context:**
- Always state tasks explicitly with sufficient context about EduVerse's Web3 architecture
- Specify target platform (Smart Contracts, React Native, Next.js) when requesting code
- Include portal navigation context when suggesting workflows
- Reference specific files/directories with absolute paths

**Role-Based Prompting:**
```javascript
// Example: Web3 Smart Contract Review
"As a blockchain security expert, review this EduVerse smart contract for vulnerabilities.
Focus on ERC1155 licensing logic, IPFS integration security, and Manta Pacific compatibility."

// Example: React Native Development
"As a React Native developer familiar with Wagmi/Viem, optimize this EduVerse mobile component
for Web3 wallet integration. Consider Expo 51 constraints and ABI auto-sync patterns."
```

**Chain-of-Thought for Complex Tasks:**
- Break down multi-step operations (Deploy → Verify → Test → Export)
- Show reasoning when troubleshooting portal issues
- Explain dependency chains between contracts
- Document portal navigation decisions

**Bias Mitigation:**
- Avoid assumptions about user's technical level
- Consider both developer and end-user perspectives
- Test suggestions across all platforms (mobile, web, contracts)
- Validate against actual EduVerse file structure

### **Performance Optimization Principles**

**Frontend Performance (Next.js):**
- **Bundle Optimization**: Use Next.js 15 + Turbopack efficiently
- **Tailwind CSS v4**: Leverage CSS variables for theming
- **Web3 Components**: Optimize wallet connection renders with React.memo
- **ABI Loading**: Lazy load contract ABIs when needed
- **Image Assets**: Compress Eduverse logos and course images

**Mobile Performance (React Native/Expo):**
- **Wagmi Hooks**: Use selective imports to reduce bundle size
- **ABI Caching**: Cache contract ABIs in AsyncStorage
- **Navigation**: Optimize React Navigation with lazy screens
- **Web3 Calls**: Batch blockchain queries where possible
- **Memory Management**: Clean up wallet connection listeners

**Smart Contract Performance:**
- **Gas Optimization**: Follow Solidity best practices for Manta Pacific
- **Batch Operations**: Group related transactions in single calls
- **Storage Efficiency**: Use packed structs and minimize storage writes
- **IPFS Integration**: Implement failover across multiple gateways

**Portal System Performance:**
- **Status Caching**: Manager status is cached to reduce redundant checks
- **Sequential Operations**: Portal prevents conflicts with sequential execution
- **File Watching**: ExportSystem uses efficient file watching for ABI updates
- **Network Validation**: Early validation prevents failed operations

### **Code Review Checklist for EduVerse**
- [ ] Does code follow portal-first approach?
- [ ] Are ABI files never manually edited?
- [ ] Is network compatibility (Manta Pacific) validated?
- [ ] Are environment variables auto-managed by portal?
- [ ] Is proper error handling using Logger system implemented?
- [ ] Are contract dependency chains respected?
- [ ] Is cross-platform compatibility maintained?
- [ ] Are performance implications of Web3 operations considered?
- [ ] Is security reviewed for smart contract changes?
- [ ] Are mobile-specific constraints (Expo, React Native) addressed?

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

## 📝 EduVerse-Specific Prompt Engineering

### **Effective Task Specification for EduVerse**
When requesting AI assistance, structure prompts to include EduVerse context:

**Template for Contract Development:**
```
As a Solidity developer working on EduVerse's educational platform:
- Target: [Contract Name] on Manta Pacific Testnet (chainId: 3441006)
- Dependencies: [List dependent contracts from the 4-contract ecosystem]
- Requirements: [Specific functionality needed]
- Constraints: [Gas optimization, IPFS integration, ERC1155 compliance]
- Testing: [Specify portal testing workflow needed]
```

**Template for Mobile Development:**
```
As a React Native developer for EduVerse mobile app:
- Platform: Expo 51 + React Native 0.74.5
- Web3 Stack: Wagmi/Viem + @reown/appkit-wagmi-react-native
- Context: [Screen/component being developed]
- Requirements: [Functionality with wallet integration]
- Constraints: [Performance, ABI auto-sync, cross-platform compatibility]
```

**Template for Frontend Development:**
```
As a Next.js developer for EduVerse web platform:
- Framework: Next.js 15 + React 19 + TypeScript
- Styling: Tailwind CSS v4 with CSS variables
- Context: [Page/component being developed]
- Requirements: [Functionality with Web3 integration]
- Constraints: [Performance, SEO, accessibility]
```

### **Portal-Aware Workflow Requests**
Always specify portal workflows in requests:

**Good Example:**
```
"I need to update the CourseFactory contract to add a new pricing tier.
After making changes, walk me through the complete workflow:
1. Portal navigation for deployment
2. Verification steps
3. ABI sync process
4. Testing requirements
Include specific portal menu paths (→ X → Y) for each step."
```

**Poor Example:**
```
"Help me deploy a smart contract."
```

### **Cross-Platform Consistency Prompts**
When working across platforms, always mention synchronization:

```
"I'm adding a new smart contract function. Ensure the solution includes:
1. Solidity implementation with proper events
2. ABI export implications for mobile/frontend
3. React Native hook integration patterns
4. Next.js component usage examples
5. Portal workflow to sync everything"
```

### **Performance-Aware Development Prompts**
Include performance considerations in requests:

```
"Optimize this EduVerse component for:
- Mobile: Expo bundle size and AsyncStorage caching
- Web: Next.js SSR and Tailwind CSS efficiency
- Blockchain: Gas optimization for Manta Pacific
- UX: Loading states and error handling"
```

### **Common EduVerse Prompt Patterns**

**Status-First Pattern:**
```
"Before implementing [feature], help me check:
1. Current project status via portal
2. Prerequisites for [specific manager]
3. Dependencies between contracts
4. Platform-specific considerations"
```

**Chain-of-Thought Pattern:**
```
"Walk me through solving [problem] step by step:
1. Identify which EduVerse components are affected
2. Determine portal workflow needed
3. Consider cross-platform implications
4. Plan testing and validation steps
5. Execute with proper error handling"
```

**Role-Specific Pattern:**
```
"As an [expert type] familiar with EduVerse's architecture:
- Review [specific code/design]
- Consider [platform constraints]
- Suggest improvements following [project patterns]
- Provide [portal workflow] to implement changes"
```

This comprehensive guide ensures AI agents understand both the technical architecture and operational patterns that make EduVerse development efficient and reliable.
