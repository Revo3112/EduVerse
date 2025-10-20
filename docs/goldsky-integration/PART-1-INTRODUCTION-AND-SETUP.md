# EduVerse × Goldsky Integration Guide
## Part 1: Introduction & Setup

> **Target Audience**: AI Agents, Developers, DevOps
> **Prerequisites**: Basic blockchain knowledge, Node.js installed
> **Estimated Time**: 15 minutes

---

## 📚 Table of Contents

1. [What is Goldsky?](#what-is-goldsky)
2. [Why Use Goldsky for EduVerse?](#why-use-goldsky-for-eduverse)
3. [Architecture Overview](#architecture-overview)
4. [Account Setup](#account-setup)
5. [CLI Installation](#cli-installation)
6. [Project Structure](#project-structure)

---

## 🎯 What is Goldsky?

**Goldsky** adalah platform indexing blockchain yang menyediakan solusi subgraph yang **100% backward-compatible** dengan The Graph, dengan peningkatan performa dan fitur tambahan:

### **Core Features:**
- ⚡ **6x Faster Indexing** - Rewritten RPC layer dengan autoscaling
- 🔔 **Native Webhooks** - Real-time notifications untuk setiap entity change
- 🌐 **Custom EVM Chains** - Support untuk Manta Pacific dan rollup lainnya
- 📊 **99.9%+ Uptime** - Production-ready reliability
- 🚀 **No-Code Deployment** - Deploy subgraph hanya dengan ABI dan contract address

### **Key Technologies:**
```
Goldsky Stack:
├── Indexing Layer (WASM processing - sama dengan The Graph)
├── RPC Layer (Optimized multi-provider dengan global cache)
├── Storage Layer (I/O optimized database <1ms commit time)
└── Query Layer (Autoscaling GraphQL endpoints)
```

---

## 💡 Why Use Goldsky for EduVerse?

> **⚠️ IMPORTANT NOTE**: EduVerse already has a **Certificate-only Goldsky implementation** (`eduweb/src/services/goldsky.service.ts` + `goldsky-schema.graphql`). This documentation covers the **FULL integration** that expands to include Course, License, and Progress tracking. See [Existing vs Full Implementation](#existing-vs-full-implementation) below.

### **1. Real-Time Student Analytics** 🎓
```typescript
// ❌ Tanpa Goldsky: Polling manual setiap 5 detik
setInterval(() => {
  const progress = await web3.getProgress(student);
}, 5000);

// ✅ Dengan Goldsky: Instant webhook notification
webhook.on('SectionCompleted', (data) => {
  updateDashboard(data.student, data.courseId);
});
```

### **2. Teacher Revenue Dashboard** 💰
```graphql
# Real-time revenue tracking tanpa kompleksitas
query TeacherRevenue($creator: Bytes!) {
  revenueRecordeds(where: {creator: $creator}) {
    amount
    timestamp
    revenueType
  }
}
```

### **3. Certificate Verification** 🏆
```typescript
// QR code scan → Instant blockchain verification
const cert = await goldsky.query({
  certificate(id: $tokenId) {
    recipientName
    completedCourses
    isValid
  }
});
```

### **4. Course Discovery** 🔍
```graphql
# Filter dan sort tanpa gas fees
query BrowseCourses {
  courses(
    where: {isActive: true, category: WEB3_DEVELOPMENT}
    orderBy: ratingAverage
    orderDirection: desc
    first: 10
  ) {
    title
    creator
    ratingAverage
    totalEnrollments
  }
}
```

---

## 🔄 Existing vs Full Implementation

### **What Already Exists:**

EduVerse currently has a **Certificate-only Goldsky integration**:

```typescript
// eduweb/src/services/goldsky.service.ts (EXISTING)
export async function getCertificateByTokenId(tokenId: number) {
  // Queries certificate from Goldsky using fetch()
}

export async function getUserCertificate(address: string) {
  // Gets user's certificate by wallet address
}
```

**Existing Schema** (`goldsky-schema.graphql`):
```graphql
type Certificate @entity {
  id: ID!
  tokenId: BigInt!
  recipientAddress: Bytes!
  recipientName: String!
  ipfsCID: String!
  isValid: Boolean!
  courses: [CertificateCourse!]!
}
```

**Use Cases Covered:**
- ✅ QR code certificate verification
- ✅ User certificate lookup
- ✅ Certificate history timeline

### **What This Documentation Adds:**

This comprehensive guide expands Goldsky integration to cover **ALL 4 smart contracts**:

1. **CourseFactory** - Course management, sections, ratings
2. **CourseLicense** - License purchases, renewals, revenue
3. **ProgressTracker** - Learning progress, completions
4. **CertificateManager** - (Expanded from existing)

**New Capabilities:**
- 🆕 Course discovery and search
- 🆕 Student dashboard with real-time progress
- 🆕 Teacher analytics and revenue tracking
- 🆕 License status and renewal tracking
- 🆕 Real-time webhooks for all events

**Migration Path:**
- Existing certificate queries continue to work
- Add new queries for Course/License/Progress alongside
- Optional: Migrate to Apollo Client for better caching
- Keep or replace fetch-based implementation

---

## 🏗️ Architecture Overview

### **EduVerse Smart Contracts → Goldsky → Frontend Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MANTA PACIFIC BLOCKCHAIN                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ CourseFactory  │  │ CourseLicense  │  │ProgressTracker│    │
│  │  (1,638 lines) │  │   (451 lines)  │  │  (309 lines)   │    │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘    │
│           │                    │                    │            │
│           │         Events Emitted:                 │            │
│           │    • CourseCreated, SectionAdded        │            │
│           │    • LicenseMinted, LicenseRenewed     │            │
│           │    • SectionCompleted, CourseCompleted  │            │
│           └────────────────────┴────────────────────┘            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                   ┌───────────▼───────────┐
                   │   GOLDSKY INDEXER      │
                   │  ┌─────────────────┐  │
                   │  │ Subgraph Engine │  │
                   │  │  (WASM Runtime) │  │
                   │  └────────┬────────┘  │
                   │           │           │
                   │  ┌────────▼────────┐  │
                   │  │ GraphQL Schema  │  │
                   │  │  - Course       │  │
                   │  │  - License      │  │
                   │  │  - Progress     │  │
                   │  │  - Certificate  │  │
                   │  └────────┬────────┘  │
                   │           │           │
                   │  ┌────────▼────────┐  │
                   │  │ PostgreSQL DB   │  │
                   │  └─────────────────┘  │
                   └───────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼──────┐      ┌────────▼────────┐   ┌────────▼────────┐
│  GraphQL API │      │    Webhooks     │   │   Dashboard     │
│  (Public)    │      │ (Real-time)     │   │  (Goldsky UI)   │
└───────┬──────┘      └────────┬────────┘   └─────────────────┘
        │                      │
┌───────▼──────────────────────▼──────┐
│      EDUVERSE NEXT.JS FRONTEND       │
│  ┌─────────────────────────────┐    │
│  │  Apollo Client              │    │
│  │  ├── useQuery (GraphQL)     │    │
│  │  ├── useSubscription        │    │
│  │  └── Cache Management       │    │
│  └─────────────────────────────┘    │
│                                      │
│  Components:                         │
│  • Course Browser (GraphQL)         │
│  • Student Dashboard (Webhooks)     │
│  • Teacher Analytics (GraphQL)      │
│  • Certificate Viewer (GraphQL)     │
└──────────────────────────────────────┘
```

### **Data Flow Example - License Purchase:**

```
1. Student clicks "Buy License" → Frontend calls CourseLicense.mintLicense()
                                    ↓
2. Transaction mined on Manta Pacific → Emits LicenseMinted event
                                    ↓
3. Goldsky Indexer detects event → Processes with subgraph handler
                                    ↓
4. Handler saves to PostgreSQL → License entity created
                                    ↓
5. Webhook fires to Backend → POST /api/webhooks/license-minted
                                    ↓
6. Frontend receives notification → Update UI: "License Active! Start Learning"
```

---

## 🚀 Account Setup

### **Step 1: Create Goldsky Account**

1. **Visit**: https://app.goldsky.com
2. **Sign Up** dengan GitHub/Google/Email
3. **Create Project**:
   - Project Name: `eduverse-lms`
   - Description: `EduVerse Learning Management System on Manta Pacific`

### **Step 2: Generate API Key**

```bash
# Navigate to Project Settings
https://app.goldsky.com/dashboard/settings

# Click "Create API Key"
# Name: eduverse-cli-key
# Permissions: Full Access (untuk deployment)

# Copy the generated key (format: gs_xxxxxxxxxxxxx)
```

⚠️ **IMPORTANT**: Simpan API key di environment variable, JANGAN commit ke Git!

```bash
# .env.local
GOLDSKY_API_KEY=gs_xxxxxxxxxxxxx
```

---

## 🛠️ CLI Installation

### **For macOS/Linux:**

```bash
# Install via curl (recommended)
curl https://goldsky.com | sh

# Verify installation
goldsky --version
# Output: goldsky/1.x.x
```

### **For Windows:**

```powershell
# Prerequisites: Node.js 16+ installed
node --version  # Should be v16 or higher

# Install via npm
npm install -g @goldskycom/cli

# Verify installation
goldsky --version
```

### **Login to Goldsky:**

```bash
# Login dengan API key
goldsky login

# Paste your API key when prompted
# Output: ✓ Successfully logged in to project: eduverse-lms
```

### **Verify Login:**

```bash
# List available commands
goldsky

# Output:
# Commands:
#   goldsky subgraph <command>
#   goldsky pipeline <command>
#   goldsky login
#   goldsky logout
```

---

## 📁 Project Structure

### **Recommended Directory Structure:**

```
EduVerse/
├── contracts/                    # ✅ Already exists
│   ├── CourseFactory.sol
│   ├── CourseLicense.sol
│   ├── ProgressTracker.sol
│   └── CertificateManager.sol
│
├── subgraph/                     # 🆕 Create this directory
│   ├── config/
│   │   ├── eduverse-config.json       # No-code subgraph config
│   │   └── manta-pacific.json         # Network configuration
│   │
│   ├── abis/                          # Contract ABIs
│   │   ├── CourseFactory.json
│   │   ├── CourseLicense.json
│   │   ├── ProgressTracker.json
│   │   └── CertificateManager.json
│   │
│   ├── schema.graphql                 # GraphQL schema (optional for no-code)
│   ├── subgraph.yaml                  # Subgraph manifest (optional for no-code)
│   └── README.md                      # Deployment instructions
│
├── eduweb/                       # ✅ Already exists (Next.js frontend)
│   ├── src/
│   │   ├── services/
│   │   │   ├── goldsky/               # 🆕 NEW - Full Goldsky integration
│   │   │   │   ├── client.ts          # Apollo Client setup
│   │   │   │   ├── queries.ts         # GraphQL queries
│   │   │   │   ├── hooks.ts           # Custom React hooks
│   │   │   │   └── webhooks.ts        # Webhook handlers
│   │   │   ├── goldsky.service.ts     # ✅ EXISTING - Certificate queries
│   │   │   └── ...
│   │   └── ...
│   ├── goldsky-schema.graphql         # ✅ EXISTING - Certificate-only schema
│   ├── .env.local                     # Environment variables
│   └── ...
│
├── scripts/                      # ✅ Already exists
│   ├── deploy.js
│   └── deploy-subgraph.sh            # 🆕 Subgraph deployment script
│
└── docs/                         # 🆕 This documentation
    └── goldsky-integration/
        ├── PART-1-INTRODUCTION-AND-SETUP.md          # ✅ Current file
        ├── PART-2-SUBGRAPH-SCHEMA-DESIGN.md          # → Next
        ├── PART-3-DEPLOYMENT-GUIDE.md
        ├── PART-4-GRAPHQL-QUERIES.md
        ├── PART-5-WEBHOOK-INTEGRATION.md
        └── PART-6-FRONTEND-INTEGRATION.md
```

### **Create Directory Structure:**

```bash
cd /home/miku/Documents/Project/Web3/Eduverse

# Create subgraph directories
mkdir -p subgraph/{config,abis}
mkdir -p eduweb/src/services/goldsky
mkdir -p docs/goldsky-integration

# Create placeholder files
touch subgraph/config/eduverse-config.json
touch subgraph/README.md
touch eduweb/src/services/goldsky/client.ts
```

---

## ✅ Setup Verification Checklist

Before proceeding to Part 2, ensure:

- [ ] Goldsky account created and verified
- [ ] API key generated and saved to `.env.local`
- [ ] Goldsky CLI installed (`goldsky --version` works)
- [ ] Successfully logged in (`goldsky login`)
- [ ] Directory structure created
- [ ] Smart contracts compiled (ABIs available in `artifacts/`)

### **Quick Test:**

```bash
# Test CLI connection
goldsky subgraph list

# Expected output:
# ✓ Connected to project: eduverse-lms
# No subgraphs deployed yet.
```

---

## 📊 What's Next?

**Part 2: EduVerse Subgraph Schema Design** akan membahas:
- Mapping semua 20+ events dari 4 smart contracts
- Designing GraphQL entities (Course, License, Progress, Certificate)
- Entity relationships dan indexing strategies
- Event handlers untuk real-time data processing

---

## 🆘 Troubleshooting

### **Issue: CLI Installation Failed**
```bash
# Solution 1: Clear npm cache
npm cache clean --force
npm install -g @goldskycom/cli

# Solution 2: Use npx (no installation)
npx @goldskycom/cli login
```

### **Issue: Login Failed**
```bash
# Check API key format (should start with gs_)
echo $GOLDSKY_API_KEY

# Logout and login again
goldsky logout
goldsky login
```

### **Issue: Permission Denied (macOS/Linux)**
```bash
# Run with sudo
sudo curl https://goldsky.com | sh

# Or use npm method instead
npm install -g @goldskycom/cli
```

---

## 📚 Additional Resources

- **Goldsky Official Docs**: https://docs.goldsky.com
- **Goldsky Dashboard**: https://app.goldsky.com
- **Community Discord**: https://discord.gg/goldsky
- **Support Email**: support@goldsky.com
- **Manta Pacific Docs**: https://docs.manta.network

---

**Author**: EduVerse Development Team
**Last Updated**: October 20, 2025
**Version**: 1.0.0
**License**: MIT

---

> 💡 **Pro Tip**: Goldsky menyediakan free tier dengan generous limits. Untuk production deployment dengan traffic tinggi, consider upgrading ke Scale plan untuk unlimited rate limits dan dedicated support.

---

**Continue to**: [Part 2: EduVerse Subgraph Schema Design →](./PART-2-SUBGRAPH-SCHEMA-DESIGN.md)
