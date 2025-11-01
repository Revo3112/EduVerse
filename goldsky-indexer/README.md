# EduVerse Goldsky Indexer - Clean Structure

> **Optimized for No-Code Goldsky Deployment**

This folder contains ONLY the essential files needed for deploying the EduVerse subgraph to Goldsky using the no-code approach.

---

## 📁 Structure

```
goldsky-indexer/
├── configs/
│   ├── certificatemanager.json          # CertificateManager ABI
│   ├── coursefactory.json               # CourseFactory ABI
│   ├── courselicense.json               # CourseLicense ABI
│   ├── progresstracker.json             # ProgressTracker ABI
│   ├── eduverse-subgraph-config.json    # Main config file
│   └── eduverse-subgraph-config-OPTIMIZED.json  # Optimized version
├── deploy.sh                            # Deployment script
└── validate.sh                          # Validation script
```

---

## 🎯 What Was Cleaned

**Removed (Not Needed for No-Code Deployment):**
- ❌ `abis/` folder - Duplicate ABIs (kept only in configs/)
- ❌ `queries/` folder - Goldsky auto-generates queries
- ❌ `schemas/` folder - Goldsky auto-generates schema from ABIs
- ❌ `build/` folder - Build artifacts not needed
- ❌ Old documentation files (.md) - Replaced with comprehensive docs

**Why These Were Removed:**
According to [Goldsky documentation](https://docs.goldsky.com/subgraphs/guides/create-a-no-code-subgraph), when deploying with `--from-abi`, Goldsky will:
1. ✅ Auto-fetch ABIs (or use provided ones)
2. ✅ Auto-generate GraphQL schema
3. ✅ Auto-generate mapping handlers
4. ✅ Deploy in 5-10 minutes

You DON'T need custom queries or schemas - everything is generated automatically!

---

## 🚀 Quick Deploy

### Option 1: Using Config File (Recommended)

```bash
# Login to Goldsky
goldsky login

# Deploy from config
cd goldsky-indexer
goldsky subgraph deploy eduverse/v1.0.0 \
  --from-abi ./configs/eduverse-subgraph-config.json

# Or use the deployment script
./deploy.sh
```

### Option 2: Using CLI Wizard

```bash
goldsky subgraph init eduverse/v1.0.0 \
  --contract 0x0DB09a3c87d2F9a7508f7F8495bC69f5F3cCe2bd \
  --network manta-pacific-sepolia \
  --start-block 5383608 \
  --contract-name CourseFactory \
  --deploy
```

---

## 📝 Config File Structure

The config file (`configs/eduverse-subgraph-config.json`) contains:

1. **Version**: Config format version (currently "1")
2. **Name**: Project name
3. **ABIs**: References to ABI files (relative paths)
4. **Instances**: Contract instances with:
   - Contract address
   - Network (manta-pacific-sepolia)
   - Start block
   - Enrichments (optional eth_calls for additional data)

**Example:**
```json
{
  "version": "1",
  "name": "eduverse-lms-production",
  "abis": {
    "courseFactory": {
      "path": "./coursefactory.json"
    }
  },
  "instances": [
    {
      "abi": "courseFactory",
      "address": "0x0DB09a3c87d2F9a7508f7F8495bC69f5F3cCe2bd",
      "startBlock": 5383608,
      "chain": "manta-pacific-sepolia"
    }
  ]
}
```

---

## 🔍 What Happens During Deployment

1. **Goldsky reads** the config file
2. **Loads ABIs** from the specified paths (in `configs/`)
3. **Auto-generates** GraphQL schema based on contract events
4. **Auto-generates** TypeScript mapping handlers
5. **Deploys** subgraph to Goldsky infrastructure
6. **Indexes** blockchain events starting from specified blocks
7. **Provides** GraphQL endpoint for querying

**Result:** Ready-to-use GraphQL API in 10-15 minutes!

---

## 📊 Network Details

- **Network**: Manta Pacific Sepolia Testnet
- **Chain ID**: 3441006
- **Explorer**: https://pacific-explorer.sepolia-testnet.manta.network/

### Contract Addresses & Start Blocks

| Contract | Address | Start Block |
|----------|---------|-------------|
| CourseFactory | 0x0DB09a3c87d2F9a7508f7F8495bC69f5F3cCe2bd | 5383608 |
| CourseLicense | 0x3Bc646Cd8813D024483b7b0f18de6C47E219EDb9 | 5383613 |
| ProgressTracker | 0x7947cf6a0b1CA5827804206Fb3De7877574d0b65 | 5383619 |
| CertificateManager | 0x7D30da5F3188bB6D8db940A80a97237Db0C56FA6 | 5383624 |

---

## 🎓 Complete Documentation

For comprehensive implementation guide including backend API development:

📖 **See**: `../docs/goldsky-backend-ai-guide/`

This documentation includes:
- ✅ Complete business logic documentation
- ✅ Backend implementation guide (30-45 hours)
- ✅ API endpoints specification
- ✅ Testing & deployment strategies
- ✅ 4,400+ lines of detailed instructions

**Start here**: `../docs/GOLDSKY-BACKEND-DEPLOYMENT-GUIDE.md`

---

## ✅ Validation

After deployment, verify:

```bash
# Check deployment status
goldsky subgraph list

# Test GraphQL endpoint
curl -X POST https://api.goldsky.com/api/public/{projectId}/subgraphs/eduverse/v1.0.0/gn \
  -H "Content-Type: application/json" \
  -d '{"query": "{ courses(first: 1) { id title } }"}'
```

---

## 🔗 Useful Links

- [Goldsky Dashboard](https://app.goldsky.com)
- [Goldsky Docs - No-Code Subgraphs](https://docs.goldsky.com/subgraphs/guides/create-a-no-code-subgraph)
- [Goldsky Deploy Wizard](https://docs.goldsky.com/subgraphs/guides/subgraph-deploy-wizard)
- [Manta Pacific Explorer](https://pacific-explorer.sepolia-testnet.manta.network/)

---

## 🎯 Summary

This folder now contains **ONLY** what's needed for Goldsky deployment:
- ✅ Config files (JSON)
- ✅ ABI files (in configs/)
- ✅ Deployment scripts

Everything else is auto-generated by Goldsky! 🚀

For backend API implementation, see the comprehensive documentation in `../docs/`.