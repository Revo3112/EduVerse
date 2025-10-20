# EduVerse × Goldsky Integration Guide
## Part 3: Subgraph Deployment Guide

> **Target Audience**: AI Agents, DevOps Engineers
> **Prerequisites**: Parts 1-2 completed, Smart contracts deployed
> **Estimated Time**: 20 minutes

> **⚠️ IMPORTANT**: EduVerse already has a **Certificate-only Goldsky subgraph** deployed. This guide covers deploying the **FULL schema** that includes all 4 contracts. You can:
> - Option A: Replace existing certificate-only subgraph
> - Option B: Deploy as separate subgraph and migrate gradually
>
> Existing subgraph uses `goldsky-schema.graphql`. This deployment uses the comprehensive schema from Part 2.

---

## 📚 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Extract Contract ABIs](#extract-contract-abis)
3. [Configure Deployment](#configure-deployment)
4. [Deploy to Goldsky](#deploy-to-goldsky)
5. [Verify Deployment](#verify-deployment)
6. [Environment Management](#environment-management)

---

## ✅ Pre-Deployment Checklist

### **Required Information:**

```bash
# 1. Smart Contract Addresses (from deployment)
COURSE_FACTORY_ADDRESS=0x...
COURSE_LICENSE_ADDRESS=0x...
PROGRESS_TRACKER_ADDRESS=0x...
CERTIFICATE_MANAGER_ADDRESS=0x...

# 2. Deployment Block Numbers (from deployment transaction)
COURSE_FACTORY_DEPLOY_BLOCK=123456
# Use same block for all if deployed in single transaction

# 3. Network Configuration
NETWORK=manta-pacific-sepolia
CHAIN_ID=3441006
RPC_URL=https://pacific-rpc.sepolia-testnet.manta.network/http

# 4. Goldsky Configuration
GOLDSKY_API_KEY=gs_xxxxxxxxxxxxx  # from Part 1
PROJECT_NAME=eduverse-lms
```

### **Verify Contracts are Deployed:**

```bash
cd /home/miku/Documents/Project/Web3/Eduverse

# Check deployed-contracts.json
cat deployed-contracts.json

# Expected output:
# {
#   "CourseFactory": "0x...",
#   "CourseLicense": "0x...",
#   "ProgressTracker": "0x...",
#   "CertificateManager": "0x..."
# }
```

---

## 📦 Extract Contract ABIs

### **Step 1: Locate Compiled Artifacts**

```bash
# ABIs are generated after compilation
ls -la artifacts/contracts/

# Output should show:
# CertificateManager.sol/CertificateManager.json
# CourseFactory.sol/CourseFactory.json
# CourseLicense.sol/CourseLicense.json
# ProgressTracker.sol/ProgressTracker.json
```

### **Step 2: Extract ABIs to Subgraph Directory**

```bash
# Create subgraph abis directory (if not exists)
mkdir -p subgraph/abis

# Extract ABI from each contract artifact
cat artifacts/contracts/CourseFactory.sol/CourseFactory.json | jq '.abi' > subgraph/abis/CourseFactory.json

cat artifacts/contracts/CourseLicense.sol/CourseLicense.json | jq '.abi' > subgraph/abis/CourseLicense.json

cat artifacts/contracts/ProgressTracker.sol/ProgressTracker.json | jq '.abi' > subgraph/abis/ProgressTracker.json

cat artifacts/contracts/CertificateManager.sol/CertificateManager.json | jq '.abi' > subgraph/abis/CertificateManager.json

# Verify ABIs extracted correctly
ls -lh subgraph/abis/
```

### **Step 3: Validate ABI Format**

```bash
# Each ABI should be an array of objects
head -n 20 subgraph/abis/CourseFactory.json

# Expected format:
# [
#   {
#     "anonymous": false,
#     "inputs": [...],
#     "name": "CourseCreated",
#     "type": "event"
#   },
#   ...
# ]
```

---

## ⚙️ Configure Deployment

### **Create Configuration File:**

```bash
# Create config directory
mkdir -p subgraph/config

# Create deployment configuration
cat > subgraph/config/eduverse-config.json << 'EOF'
{
  "version": "1",
  "name": "eduverse-lms",
  "abis": {
    "CourseFactory": {
      "path": "./abis/CourseFactory.json"
    },
    "CourseLicense": {
      "path": "./abis/CourseLicense.json"
    },
    "ProgressTracker": {
      "path": "./abis/ProgressTracker.json"
    },
    "CertificateManager": {
      "path": "./abis/CertificateManager.json"
    }
  },
  "instances": [
    {
      "abi": "CourseFactory",
      "address": "REPLACE_WITH_COURSE_FACTORY_ADDRESS",
      "startBlock": 0,
      "chain": "manta-pacific-sepolia"
    },
    {
      "abi": "CourseLicense",
      "address": "REPLACE_WITH_COURSE_LICENSE_ADDRESS",
      "startBlock": 0,
      "chain": "manta-pacific-sepolia"
    },
    {
      "abi": "ProgressTracker",
      "address": "REPLACE_WITH_PROGRESS_TRACKER_ADDRESS",
      "startBlock": 0,
      "chain": "manta-pacific-sepolia"
    },
    {
      "abi": "CertificateManager",
      "address": "REPLACE_WITH_CERTIFICATE_MANAGER_ADDRESS",
      "startBlock": 0,
      "chain": "manta-pacific-sepolia"
    }
  ]
}
EOF
```

### **Update Configuration with Real Addresses:**

```bash
# Option 1: Manual edit
nano subgraph/config/eduverse-config.json

# Option 2: Script-based replacement (recommended)
cat > scripts/update-subgraph-config.sh << 'SCRIPT'
#!/bin/bash

# Load deployed contract addresses
DEPLOYED_JSON="deployed-contracts.json"

if [ ! -f "$DEPLOYED_JSON" ]; then
  echo "❌ Error: $DEPLOYED_JSON not found!"
  exit 1
fi

# Extract addresses using jq
COURSE_FACTORY=$(jq -r '.CourseFactory' $DEPLOYED_JSON)
COURSE_LICENSE=$(jq -r '.CourseLicense' $DEPLOYED_JSON)
PROGRESS_TRACKER=$(jq -r '.ProgressTracker' $DEPLOYED_JSON)
CERTIFICATE_MANAGER=$(jq -r '.CertificateManager' $DEPLOYED_JSON)

# Update config file
CONFIG_FILE="subgraph/config/eduverse-config.json"

# Use sed to replace placeholder addresses
sed -i "s/REPLACE_WITH_COURSE_FACTORY_ADDRESS/$COURSE_FACTORY/g" $CONFIG_FILE
sed -i "s/REPLACE_WITH_COURSE_LICENSE_ADDRESS/$COURSE_LICENSE/g" $CONFIG_FILE
sed -i "s/REPLACE_WITH_PROGRESS_TRACKER_ADDRESS/$PROGRESS_TRACKER/g" $CONFIG_FILE
sed -i "s/REPLACE_WITH_CERTIFICATE_MANAGER_ADDRESS/$CERTIFICATE_MANAGER/g" $CONFIG_FILE

echo "✅ Configuration updated with deployed addresses:"
echo "  CourseFactory:      $COURSE_FACTORY"
echo "  CourseLicense:      $COURSE_LICENSE"
echo "  ProgressTracker:    $PROGRESS_TRACKER"
echo "  CertificateManager: $CERTIFICATE_MANAGER"
SCRIPT

# Make script executable
chmod +x scripts/update-subgraph-config.sh

# Run the script
./scripts/update-subgraph-config.sh
```

### **Verify Configuration:**

```bash
# Check final configuration
cat subgraph/config/eduverse-config.json

# Validate JSON format
jq '.' subgraph/config/eduverse-config.json

# Should show all addresses populated correctly
```

---

## 🚀 Deploy to Goldsky

### **Step 1: Ensure Logged In**

```bash
# Check login status
goldsky whoami

# If not logged in:
goldsky login
# Paste API key: gs_xxxxxxxxxxxxx
```

### **Step 2: Deploy Subgraph**

```bash
# Navigate to subgraph directory
cd subgraph

# Deploy using --from-abi flag (no-code deployment)
goldsky subgraph deploy eduverse-lms/1.0.0 \
  --from-abi config/eduverse-config.json

# Expected output:
# ✔ Validating configuration
# ✔ Generating subgraph code from ABIs
# ✔ Building subgraph
# ✔ Deploying to Goldsky
#
# 🎉 Subgraph deployed successfully!
#
# Name: eduverse-lms/1.0.0
# GraphQL Endpoint: https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/1.0.0/gn
#
# Indexing started. Check status at:
# https://app.goldsky.com/dashboard/subgraphs/eduverse-lms
```

### **Step 3: Monitor Indexing Progress**

```bash
# Check subgraph status
goldsky subgraph list

# Output shows:
# NAME                VERSION   STATUS     SYNCED   CHAIN
# eduverse-lms        1.0.0     INDEXING   45%      manta-pacific-sepolia

# For detailed status:
goldsky subgraph info eduverse-lms/1.0.0

# Wait for "SYNCED" status (may take 5-15 minutes depending on block count)
```

### **Alternative: Web Dashboard Monitoring**

```bash
# Open in browser:
# https://app.goldsky.com/dashboard/subgraphs/eduverse-lms

# Dashboard shows:
# - Indexing progress (real-time %)
# - Latest indexed block
# - Entity counts
# - Query performance metrics
# - Error logs (if any)
```

---

## ✅ Verify Deployment

### **Step 1: Check GraphQL Endpoint**

```bash
# Get endpoint URL
goldsky subgraph info eduverse-lms/1.0.0 | grep "Endpoint"

# Sample endpoint:
# https://api.goldsky.com/api/public/project_cl8ylkiw00krx0hvza0qw17vn/subgraphs/eduverse-lms/1.0.0/gn
```

### **Step 2: Test Basic Query**

```bash
# Using curl
curl -X POST \
  https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/1.0.0/gn \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ courses(first: 5) { id title creator } }"
  }'

# Expected response:
# {
#   "data": {
#     "courses": [
#       {
#         "id": "1",
#         "title": "Introduction to Web3",
#         "creator": "0x..."
#       }
#     ]
#   }
# }
```

### **Step 3: Open GraphiQL Playground**

```bash
# Goldsky provides built-in GraphiQL interface
# Open in browser (append '/graphql' to endpoint):
# https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/1.0.0/gn/graphql

# Features:
# - Auto-complete for schema
# - Documentation explorer
# - Query history
# - Response formatting
```

### **Step 4: Verify Entity Counts**

```graphql
# Test query in GraphiQL:
query VerifyDeployment {
  # Check if courses exist
  courses(first: 1) {
    id
    title
  }

  # Check if licenses exist
  licenses(first: 1) {
    id
    student
  }

  # Check platform stats
  platformStats(id: "platform") {
    totalCourses
    totalStudents
    totalLicensesMinted
  }
}
```

---

## 🏷️ Environment Management (Tags)

### **Why Use Tags?**

```
Tags allow swapping between subgraph versions without changing frontend code:

Development Flow:
1. Deploy new version: eduverse-lms/1.1.0
2. Test with "staging" tag
3. If stable, update "prod" tag to 1.1.0
4. Frontend always uses "prod" tag endpoint (no code changes!)
```

### **Create Production Tag:**

```bash
# Tag current version as production
goldsky subgraph tag create eduverse-lms/1.0.0 --tag prod

# Output:
# ✔ Tag 'prod' created for eduverse-lms/1.0.0
#
# Tag Endpoint: https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/prod/gn
```

### **Create Staging Tag:**

```bash
# Tag for testing
goldsky subgraph tag create eduverse-lms/1.0.0 --tag staging

# Output:
# ✔ Tag 'staging' created for eduverse-lms/1.0.0
```

### **Update Tag to New Version:**

```bash
# Deploy new version
goldsky subgraph deploy eduverse-lms/1.1.0 --from-abi config/eduverse-config.json

# Test with staging tag first
goldsky subgraph tag update eduverse-lms/staging --version 1.1.0

# If stable, promote to production
goldsky subgraph tag update eduverse-lms/prod --version 1.1.0
```

### **List All Tags:**

```bash
goldsky subgraph tag list eduverse-lms

# Output:
# TAG       VERSION   CREATED
# prod      1.1.0     2025-10-20
# staging   1.1.0     2025-10-20
```

---

## 🔄 Update/Redeploy Workflow

### **When to Redeploy:**

```
Redeploy Required:
✅ Contract address changes (new deployment)
✅ Start block optimization
✅ ABI changes (new events/functions)
✅ Schema changes (new entities)

Redeploy NOT Required:
❌ Frontend code changes
❌ Query changes
❌ Webhook configuration
```

### **Redeploy Process:**

```bash
# 1. Update version number
goldsky subgraph deploy eduverse-lms/1.1.0 --from-abi config/eduverse-config.json

# 2. Wait for sync
goldsky subgraph info eduverse-lms/1.1.0

# 3. Test new version
curl -X POST <new-endpoint> -d '{"query": "{ courses { id } }"}'

# 4. Update tags
goldsky subgraph tag update eduverse-lms/staging --version 1.1.0

# 5. If stable, update production
goldsky subgraph tag update eduverse-lms/prod --version 1.1.0
```

---

## 🛠️ Troubleshooting

### **Issue 1: "ABI not found"**

```bash
# Error: Could not find ABI at path ./abis/CourseFactory.json

# Solution: Check file paths are relative to config file
ls -la subgraph/abis/
# Ensure all 4 ABI files exist

# Verify config uses relative paths:
cat subgraph/config/eduverse-config.json | jq '.abis'
```

### **Issue 2: "Contract not found at address"**

```bash
# Error: No contract found at 0x... on manta-pacific-sepolia

# Solution 1: Verify contract address
cast code 0xYOUR_ADDRESS --rpc-url $RPC_URL
# Should return bytecode, not "0x"

# Solution 2: Check network configuration
# Ensure chain name matches Goldsky's chain registry
```

### **Issue 3: "Indexing stuck at X%"**

```bash
# Check subgraph logs
goldsky subgraph logs eduverse-lms/1.0.0

# Common causes:
# 1. RPC rate limiting → Goldsky handles automatically
# 2. Invalid event handler → Check logs for errors
# 3. Large block range → Be patient, indexing takes time

# Force re-sync from specific block:
goldsky subgraph update eduverse-lms/1.0.0 --start-block 123456
```

### **Issue 4: "Query returns empty data"**

```bash
# Possible causes:

# 1. No events emitted yet
# Solution: Trigger a transaction (create course, buy license)

# 2. Wrong contract address
# Solution: Verify in deployed-contracts.json

# 3. Indexing not complete
goldsky subgraph info eduverse-lms/1.0.0
# Wait for STATUS: SYNCED

# 4. Query syntax error
# Solution: Use GraphiQL to validate query
```

---

## 📝 Deployment Checklist

Before considering deployment complete:

- [ ] All 4 contract ABIs extracted successfully
- [ ] Configuration file created and populated with real addresses
- [ ] Subgraph deployed to Goldsky (`goldsky subgraph deploy`)
- [ ] Indexing reached 100% (STATUS: SYNCED)
- [ ] Test query returns data
- [ ] GraphiQL playground accessible
- [ ] Production tag created (`prod`)
- [ ] Staging tag created (`staging`)
- [ ] Endpoint URL saved to `.env.local`
- [ ] Deployment documented in README.md

---

## 🎯 Production Configuration

### **Save Endpoints to Environment:**

```bash
# Add to eduweb/.env.local
cat >> eduweb/.env.local << EOF

# Goldsky Subgraph Endpoints
NEXT_PUBLIC_GOLDSKY_ENDPOINT_PROD=https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/prod/gn
NEXT_PUBLIC_GOLDSKY_ENDPOINT_STAGING=https://api.goldsky.com/api/public/project_XXX/subgraphs/eduverse-lms/staging/gn

# Goldsky API Key (for private endpoints and webhooks)
GOLDSKY_API_KEY=gs_xxxxxxxxxxxxx
EOF
```

### **Create Deployment Script:**

```bash
cat > scripts/deploy-subgraph.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "🚀 EduVerse Subgraph Deployment Script"
echo "======================================"

# 1. Check prerequisites
if ! command -v goldsky &> /dev/null; then
  echo "❌ Goldsky CLI not found. Please install first."
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "❌ jq not found. Please install: sudo apt-get install jq"
  exit 1
fi

# 2. Extract ABIs
echo "📦 Extracting Contract ABIs..."
mkdir -p subgraph/abis
jq '.abi' artifacts/contracts/CourseFactory.sol/CourseFactory.json > subgraph/abis/CourseFactory.json
jq '.abi' artifacts/contracts/CourseLicense.sol/CourseLicense.json > subgraph/abis/CourseLicense.json
jq '.abi' artifacts/contracts/ProgressTracker.sol/ProgressTracker.json > subgraph/abis/ProgressTracker.json
jq '.abi' artifacts/contracts/CertificateManager.sol/CertificateManager.json > subgraph/abis/CertificateManager.json
echo "✅ ABIs extracted"

# 3. Update configuration
echo "⚙️ Updating configuration with deployed addresses..."
./scripts/update-subgraph-config.sh

# 4. Deploy subgraph
echo "🚀 Deploying subgraph to Goldsky..."
cd subgraph
goldsky subgraph deploy eduverse-lms/$VERSION --from-abi config/eduverse-config.json
cd ..

echo "✅ Deployment complete!"
echo "📊 Check status: goldsky subgraph info eduverse-lms/$VERSION"
echo "🌐 Dashboard: https://app.goldsky.com/dashboard/subgraphs/eduverse-lms"
SCRIPT

chmod +x scripts/deploy-subgraph.sh
```

---

## 📊 What's Next?

**Part 4: GraphQL Queries for Frontend** akan membahas:
- Ready-to-use queries untuk course browsing
- Student dashboard queries (progress, certificates)
- Teacher analytics queries (revenue, enrollments)
- Pagination dan filtering strategies
- Query optimization best practices

---

**Author**: EduVerse Development Team
**Last Updated**: October 20, 2025
**Version**: 1.0.0

---

**Continue to**: [Part 4: GraphQL Queries for Frontend →](./PART-4-GRAPHQL-QUERIES.md)
