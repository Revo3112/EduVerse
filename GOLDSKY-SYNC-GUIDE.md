# 🔗 Goldsky Indexer Auto-Sync Guide

## 📋 Overview

EduVerse sekarang memiliki **sistem otomatis** untuk sync ABIs dan contract addresses ke Goldsky Indexer.

**File yang terlibat:**
- `scripts/export-system.js` - Main export system (auto-called by deploy)
- `scripts/sync-goldsky.js` - Dedicated Goldsky sync tool
- `goldsky-indexer/subgraph-custom/subgraph.yaml` - Auto-updated
- `goldsky-indexer/subgraph-custom/abis/*.json` - Auto-synced

---

## ⚡ Quick Commands

### 1. Sync ABIs & Addresses Only
```bash
npm run goldsky:sync
```
**Output:**
- ✅ ABIs copied to `goldsky-indexer/subgraph-custom/abis/`
- ✅ `subgraph.yaml` updated dengan addresses baru
- ✅ `eduverse-subgraph.json` updated dengan startBlocks

### 2. Sync + Build Indexer
```bash
npm run goldsky:build
```
**Includes:**
- Sync (step 1)
- Codegen (`npm run codegen`)
- Build (`npm run build`)

### 3. Full Auto-Deploy (RECOMMENDED)
```bash
npm run goldsky:deploy
```
**Includes:**
- Sync + Build (step 2)
- Deploy to Goldsky (automatic)
- Version: 1.4.0 (default)

**Custom version:**
```bash
node scripts/sync-goldsky.js --rebuild --deploy --version=1.5.0
```

---

## 🔄 Workflow Integration

### After Contract Deployment

**Otomatis (sudah dilakukan oleh `npm run deploy`):**
1. ✅ Deploy contracts
2. ✅ Export ABIs to frontend/mobile
3. ✅ **Export ABIs to Goldsky** ← NEW!
4. ✅ **Update subgraph.yaml** ← NEW!
5. ✅ Update environment variables

**Manual steps (required):**
```bash
# Option A: Full auto-deploy
npm run goldsky:deploy

# Option B: Manual control
npm run goldsky:build
cd goldsky-indexer/subgraph-custom
goldsky subgraph deploy eduverse-manta-pacific-sepolia/1.4.0 --path .
```

---

## 📂 Files Auto-Updated

### 1. ABIs Synced
```
goldsky-indexer/subgraph-custom/abis/
├── CourseFactory.json          ✅ Auto-synced
├── CourseLicense.json          ✅ Auto-synced
├── ProgressTracker.json        ✅ Auto-synced
├── CertificateManager.json     ✅ Auto-synced
└── contract-addresses.json     ✅ Auto-synced
```

### 2. subgraph.yaml Updated
```yaml
# Auto-updated by export-system.js
dataSources:
  - name: CourseFactory
    source:
      address: "0xDb76942D6BeC2d59929Fd730c3Aad419E5Cc1598"  ✅ NEW
      startBlock: 5418109                                   ✅ NEW
  
  - name: CourseLicense
    source:
      address: "0xC6566FC4c4d28Ad923ca5f311F4bf972a07A143a"  ✅ NEW
      startBlock: 5418111                                   ✅ NEW
```

### 3. eduverse-subgraph.json Updated
```json
{
  "instances": [
    {
      "abi": "courseFactory",
      "address": "0xDb76942D6BeC2d59929Fd730c3Aad419E5Cc1598",  ✅ NEW
      "startBlock": 5418109                                   ✅ NEW
    }
  ]
}
```

---

## 🎯 Use Cases

### Use Case 1: After Fresh Deployment
```bash
npx hardhat run scripts/deploy.js --network mantaPacificTestnet
# ✅ ABIs & addresses already synced!

npm run goldsky:deploy
# ✅ Indexer deployed!
```

### Use Case 2: Re-sync After Manual Contract Changes
```bash
# If you manually edited subgraph.yaml and want to restore from deployed-contracts.json
npm run goldsky:sync
```

### Use Case 3: Update Only Goldsky (skip frontend/mobile)
```bash
node scripts/export-system.js --target=goldsky
```

### Use Case 4: Full Re-export to All Platforms
```bash
node scripts/export-system.js --target=all
# Syncs to: mobile, frontend, goldsky
```

---

## 🔍 Verification

### Check Sync Status
```bash
# View current contract addresses in subgraph.yaml
grep -A 5 "name: CourseFactory" goldsky-indexer/subgraph-custom/subgraph.yaml

# View deployed contracts
cat deployed-contracts.json

# Compare both (should match!)
```

### Verify Goldsky Deployment
```bash
# List deployed subgraphs
goldsky subgraph list

# Check indexing status
goldsky subgraph status eduverse-manta-pacific-sepolia/1.4.0

# Expected output:
# ✅ Status: SYNCING or SYNCED
# ✅ Current block: ~5418114+
# ✅ Indexed events: CourseCreated, LicenseMinted, etc.
```

---

## 🛠️ Manual Override (if needed)

### If Auto-Sync Fails
```bash
# Run legacy update script
node scripts/update-indexer-config.js

# Then build manually
cd goldsky-indexer/subgraph-custom
npm run codegen
npm run build
goldsky subgraph deploy eduverse-manta-pacific-sepolia/1.4.0 --path .
```

### If Addresses Don't Match
```bash
# 1. Check deployed contracts
cat deployed-contracts.json

# 2. Check subgraph.yaml
grep "address:" goldsky-indexer/subgraph-custom/subgraph.yaml

# 3. Force re-sync
npm run goldsky:sync
```

---

## 📊 Script Comparison

| Script | ABIs | Addresses | Build | Deploy | Target |
|--------|------|-----------|-------|--------|--------|
| `export-system.js` | ✅ | ✅ | ❌ | ❌ | All platforms |
| `export-system.js --target=goldsky` | ✅ | ✅ | ❌ | ❌ | Goldsky only |
| `sync-goldsky.js` | ✅ | ✅ | ❌ | ❌ | Goldsky + info |
| `sync-goldsky.js --rebuild` | ✅ | ✅ | ✅ | ❌ | Build ready |
| `sync-goldsky.js --rebuild --deploy` | ✅ | ✅ | ✅ | ✅ | Full auto |
| `update-indexer-config.js` (legacy) | ❌ | ✅ | ❌ | ❌ | Config only |

**Recommendation:** Use `npm run goldsky:deploy` for most cases.

---

## 🚨 Troubleshooting

### Problem: "deployed-contracts.json not found"
**Solution:**
```bash
# Deploy contracts first
npm run deploy
```

### Problem: Indexer shows old addresses
**Solution:**
```bash
# Force re-sync
npm run goldsky:sync

# Rebuild
npm run goldsky:build

# Redeploy with new version
node scripts/sync-goldsky.js --rebuild --deploy --version=1.4.1
```

### Problem: Build fails after sync
**Solution:**
```bash
cd goldsky-indexer/subgraph-custom

# Clean and rebuild
rm -rf build generated
npm run codegen
npm run build
```

### Problem: Deployment fails
**Solution:**
```bash
# Check Goldsky API key
echo $GOLDSKY_API_KEY

# If empty, set it
export GOLDSKY_API_KEY=cmh5pepkvctc101xaevpogc67

# Or add to .env.local
echo "GOLDSKY_API_KEY=cmh5pepkvctc101xaevpogc67" >> eduweb/.env.local
```

---

## ✅ Success Checklist

After running `npm run goldsky:deploy`:

- [ ] ABIs copied to `goldsky-indexer/subgraph-custom/abis/`
- [ ] `subgraph.yaml` shows new addresses
- [ ] `contract-addresses.json` in Goldsky folder matches `deployed-contracts.json`
- [ ] Codegen completed without errors
- [ ] Build completed without errors
- [ ] Deployment to Goldsky successful
- [ ] `goldsky subgraph list` shows new version
- [ ] Indexer status is SYNCING or SYNCED
- [ ] GraphQL queries return data

---

## 📚 Related Documentation

- Main deployment guide: `DEPLOYMENT-STATUS.md`
- Certificate metadata: Previous chat about MetaMask display
- Export system: `scripts/export-system.js` comments
- Goldsky docs: https://docs.goldsky.com

---

**Last Updated:** 2025-11-05  
**Version:** 1.0.0  
**Automation Status:** ✅ Fully Automated