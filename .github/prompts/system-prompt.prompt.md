---
mode: agent
description: 'System Prompt That Must Follow Through'
---
# EDUVERSE AI DEVELOPMENT ENFORCER PROMPT

## 🚨 MANDATORY EXECUTION PROTOCOL (NON-NEGOTIABLE)

### CRITICAL RULE #1: SEQUENTIAL THINKING REQUIREMENT
- **MANDATORY**: Use `mcp_sequentialthi_sequentialthinking` for EVERY SINGLE TASK, no exceptions
- **MINIMUM**: 5-10 thought steps for simple tasks, 15+ for complex tasks
- **PATTERN**: Think → Validate → Re-think → Execute → Verify
- **FAILURE CONSEQUENCE**: Incomplete analysis leading to suboptimal solutions

### CRITICAL RULE #2: MEMORY STORAGE REQUIREMENT
- **MANDATORY**: Store ALL important findings using MCP memory tools
- **REQUIRED ACTIONS**:
  - `mcp_memory_create_entities` for new concepts/components
  - `mcp_memory_add_observations` for updates and insights
  - `mcp_memory_search_nodes` to check existing knowledge
  - `mcp_memory_read_graph` to understand full context
- **STORAGE SCOPE**: Technical decisions, architectural patterns, bug fixes, optimization insights
- **FAILURE CONSEQUENCE**: Knowledge loss and repeated mistakes

### CRITICAL RULE #3: COMPLETE CONTEXT COMPREHENSION
- **MANDATORY**: Read ENTIRE `copilot-instructions.md` before ANY action
- **REQUIRED UNDERSTANDING**:
  - EduVerse portal system (8 main sections, 47 sub-options)
  - Smart contracts dependency chain (CourseFactory → CourseLicense → ProgressTracker → CertificateManager)
  - Multi-platform architecture (Smart Contracts, React Native, Next.js)
  - Portal-first approach (NEVER bypass `npm run portal`)
- **VALIDATION**: Reference specific sections from copilot-instructions in responses
- **FAILURE CONSEQUENCE**: Breaking established workflows and architecture

## 📋 2025 BEST PRACTICES ENFORCEMENT

### WEB3 & BLOCKCHAIN STANDARDS (2025)
- **Solidity**: Latest 0.8.x with security patterns (ReentrancyGuard, AccessControl)
- **Hardhat**: Latest config with `viaIR: true` for complex contracts
- **Wagmi v2**: Latest hooks pattern with proper error handling
- **Viem**: Latest client configuration for Manta Pacific Testnet
- **Gas Optimization**: Always consider gas costs and optimize for efficiency
- **Security First**: Every contract change requires security review consideration

### REACT NATIVE & MOBILE STANDARDS (2025)
- **Expo 51**: Latest features with React Native 0.74.5
- **Web3 Integration**: @reown/appkit-wagmi-react-native latest patterns
- **Performance**: AsyncStorage caching, lazy loading, memory management
- **Cross-Platform**: Ensure iOS/Android compatibility
- **ABI Integration**: Never manually edit auto-generated ABI files

### FRONTEND & WEB STANDARDS (2025)
- **Next.js 15**: App Router, React 19, TypeScript strict mode
- **Tailwind CSS v4**: CSS variables, PostCSS optimization
- **Performance**: SSR optimization, bundle splitting, image optimization
- **Web3 Integration**: Latest Wagmi/Viem patterns for browser
- **Accessibility**: WCAG 2.2 compliance for educational platform

## 🔍 MANDATORY VALIDATION & IMPACT ANALYSIS

### STEP-BY-STEP SELF-VALIDATION CHECKLIST
For EVERY solution, you MUST validate:

**✅ PORTAL COMPLIANCE CHECK**
- [ ] Does solution use portal navigation (`npm run portal → X → Y`)?
- [ ] Are managers called directly (FORBIDDEN) or through portal?
- [ ] Is `deployed-contracts.json` treated as single source of truth?
- [ ] Are ABI files left untouched (auto-generated)?

**✅ CROSS-PLATFORM IMPACT ANALYSIS**
- [ ] Smart Contracts: Does change affect other contracts in dependency chain?
- [ ] Mobile App: Will ABI changes break React Native components?
- [ ] Frontend: Are Next.js components compatible with contract changes?
- [ ] Environment: Are all `.env` files managed by portal (not manually)?

**✅ ARCHITECTURE COMPATIBILITY**
- [ ] Does solution follow EduVerse modular portal architecture?
- [ ] Is Manta Pacific Testnet (chainId: 3441006) properly configured?
- [ ] Are contract dependencies respected (CourseFactory → CourseLicense → ProgressTracker → CertificateManager)?
- [ ] Is ExportSystem used for ABI distribution (never manual)?

**✅ PERFORMANCE & SECURITY VALIDATION**
- [ ] Gas optimization considered for smart contract changes?
- [ ] Mobile performance impact assessed (bundle size, loading time)?
- [ ] Frontend bundle optimization maintained?
- [ ] Security vulnerabilities checked (reentrancy, access control)?

## 🎯 EXECUTION WORKFLOW PATTERN

### MANDATORY SEQUENCE FOR EVERY TASK:

1. **THINK FIRST** (using `mcp_sequentialthi_sequentialthinking`)
   - Analyze task complexity and requirements
   - Break down into sequential steps
   - Consider all platform implications
   - Plan validation checkpoints

2. **READ CONTEXT** (using available tools)
   - Read relevant sections from copilot-instructions.md
   - Check existing memory for related information
   - Understand current project state via portal status

3. **STORE INSIGHTS** (using MCP memory tools)
   - Create entities for new concepts discovered
   - Add observations to existing entities
   - Build relationships between related concepts

4. **VALIDATE APPROACH** (using sequential thinking)
   - Verify against EduVerse architecture patterns
   - Check 2025 best practices compliance
   - Confirm portal-first approach adherence

5. **EXECUTE SOLUTION** (using appropriate tools)
   - Implement following established patterns
   - Use portal system for all operations
   - Maintain cross-platform compatibility

6. **VERIFY RESULTS** (using validation checklist)
   - Run through mandatory validation checklist
   - Store successful patterns in memory
   - Document any deviations or improvements

## ⚠️ FAILURE MODES TO AVOID

### IMMEDIATE DISQUALIFICATION TRIGGERS:
- Using hardhat commands directly instead of portal
- Manually editing ABI files or contract addresses
- Bypassing sequential thinking for complex tasks
- Not storing important insights in memory
- Ignoring cross-platform impact analysis
- Breaking established EduVerse patterns

### WARNING INDICATORS:
- Suggesting solutions without reading copilot-instructions
- Not considering gas optimization for contracts
- Ignoring mobile performance implications
- Recommending outdated patterns (pre-2025)
- Missing security considerations

## 🚀 SUCCESS CRITERIA

Your response is considered PERFECT when:
- ✅ Sequential thinking shows 10+ validation steps
- ✅ All important findings stored in MCP memory
- ✅ Complete context from copilot-instructions referenced
- ✅ 2025 best practices for all technologies applied
- ✅ Cross-platform impact thoroughly analyzed
- ✅ Portal-first approach maintained throughout
- ✅ Security and performance optimizations included
- ✅ Self-validation checklist completed
- ✅ Solution maintains EduVerse architecture integrity

**REMEMBER**: Excellence in EduVerse development comes from thorough thinking, comprehensive context understanding, and rigorous validation across all platforms. Never rush - think deeply, validate thoroughly, and execute
