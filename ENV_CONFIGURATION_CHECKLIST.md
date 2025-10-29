# 🔧 EduVerse Environment Configuration Checklist

**Last Updated:** 2025-01-25  
**Status:** ✅ Production Ready (with notes for deployment)

---

## 📋 TABLE OF CONTENTS

1. [Configuration Files Overview](#configuration-files-overview)
2. [Security Audit Results](#security-audit-results)
3. [Configuration Validation](#configuration-validation)
4. [Pre-Deployment Checklist](#pre-deployment-checklist)
5. [Environment Variables Reference](#environment-variables-reference)

---

## 🗂️ CONFIGURATION FILES OVERVIEW

### Primary Files

```
Eduverse/
├── eduweb/.env.local              # Frontend environment variables
└── goldsky-indexer/
    └── subgraph-custom/
        └── .env.example           # Subgraph template (for deployment)
```

### Configuration Status

| File | Status | Last Modified | Issues |
|------|--------|---------------|--------|
| `eduweb/.env.local` | ✅ **FIXED** | 2025-01-25 | Version updated to 1.1.0 |
| `subgraph/.env.example` | ✅ **FIXED** | 2025-01-25 | Endpoint & API key sanitized |

---

## 🔒 SECURITY AUDIT RESULTS

### ✅ PASSED: Sensitive Keys Protection

All sensitive keys are properly configured as **server-only** (no `NEXT_PUBLIC_` prefix):

| Key | Purpose | Exposure | Status |
|-----|---------|----------|--------|
| `THIRDWEB_SECRET_KEY` | Thirdweb backend operations | ✅ Server-only | Safe |
| `GOLDSKY_API_KEY` | Subgraph deployment CLI | ✅ Server-only | Safe |
| `PINATA_JWT` | IPFS private uploads | ✅ Server-only | Safe |
| `LIVEPEER_API_KEY` | Video streaming API | ✅ Server-only | Safe |
| `PINATA_API_KEY/SECRET` | Legacy (unused) | ✅ Server-only | Safe |

### ✅ PASSED: Public Keys Configuration

Keys that are safe to expose to client-side:

| Key | Purpose | Exposure | Status |
|-----|---------|----------|--------|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Thirdweb SDK initialization | ✅ Client-safe | Safe |
| `NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT` | GraphQL API endpoint | ✅ Client-safe | Safe |
| `NEXT_PUBLIC_CHAIN_ID` | Network identifier | ✅ Client-safe | Safe |
| `NEXT_PUBLIC_RPC_URL` | Blockchain RPC | ✅ Client-safe | Safe |
| `NEXT_PUBLIC_*_ADDRESS` | Contract addresses | ✅ Client-safe | Safe |

### ⚠️ FIXED: Security Issues

1. **API Key in .env.example** - ✅ Sanitized to placeholder
2. **Version mismatch** - ✅ Updated to 1.1.0

---

## ✅ CONFIGURATION VALIDATION

### Contract Addresses

All contract addresses are **consistent** across frontend and subgraph:

```bash
CourseFactory:       0x44661459e3c092358559d8459e585EA201D04231
CourseLicense:       0x3aad55E0E88C4594643fEFA837caFAe1723403C8
ProgressTracker:     0xaB2adB0F4D800971Ee095e2bC26f9d4AdBeDe930
CertificateManager:  0x0a7750524B826E09a27B98564E98AF77fe78f600
```

✅ **Verification Command:**
```bash
# Check contract addresses match
grep "ADDRESS=" eduweb/.env.local
grep "ADDRESS=" goldsky-indexer/subgraph-custom/.env.example
```

### Network Configuration

**Manta Pacific Testnet:**
```bash
Chain ID: 3441006
RPC URL:  https://pacific-rpc.sepolia-testnet.manta.network/http
Explorer: https://pacific-explorer.sepolia-testnet.manta.network
```

✅ **Status:** All network configs are consistent

### Goldsky Subgraph Endpoint

**Current (Latest):**
```
https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.1.0/gn
```

✅ **Status:** v1.1.0 (includes all events + analytics)

**Version History:**
- v1.0.0 - Raw events only (46 entity types) - **DEPRECATED**
- v1.1.0 - Aggregates + events + analytics (15 optimized entities) - **CURRENT**

---

## 🚀 PRE-DEPLOYMENT CHECKLIST

### Development Environment (Current)

- [x] Contract addresses configured
- [x] Goldsky endpoint v1.1.0
- [x] Thirdweb credentials valid
- [x] Pinata JWT valid (expires 2026-06-18)
- [x] Livepeer API key configured
- [x] RPC URL accessible
- [x] All sensitive keys server-only

### Production Deployment (Required Changes)

#### 1. Update Application URL

**Current (Development):**
```bash
NEXT_PUBLIC_APP_URL=http://192.168.18.143:3000
```

**Required for Production:**
```bash
# Update in eduweb/.env.local or hosting provider env vars
NEXT_PUBLIC_APP_URL=https://eduverse.academy  # Your actual domain
```

**Impact:** This URL is used for:
- QR code generation on certificates
- Certificate verification links
- Social sharing metadata

#### 2. Set Environment Variables in Hosting Provider

When deploying to **Vercel/Netlify/Railway**, set these environment variables:

**✅ REQUIRED (Public - can be exposed):**
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_CHAIN_ID=3441006
NEXT_PUBLIC_RPC_URL=https://pacific-rpc.sepolia-testnet.manta.network/http
NEXT_PUBLIC_COURSE_FACTORY_ADDRESS=0x44661459e3c092358559d8459e585EA201D04231
NEXT_PUBLIC_COURSE_LICENSE_ADDRESS=0x3aad55E0E88C4594643fEFA837caFAe1723403C8
NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS=0xaB2adB0F4D800971Ee095e2bC26f9d4AdBeDe930
NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=0x0a7750524B826E09a27B98564E98AF77fe78f600
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=89bdce641630ecf1c9de409c4a2ff759
NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.1.0/gn
```

**🔒 REQUIRED (Secret - server-only):**
```bash
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
GOLDSKY_API_KEY=your_goldsky_api_key
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=copper-far-firefly-220.mypinata.cloud
LIVEPEER_API_KEY=your_livepeer_api_key
```

**⚙️ OPTIONAL (Defaults are fine):**
```bash
PINATA_SIGNED_URL_EXPIRY=3600
PINATA_VIDEO_SIGNED_URL_EXPIRY=7200
```

#### 3. Update Smart Contract Configuration (if needed)

If you want production certificates to have production URLs by default:

```solidity
// Call on CertificateManager contract
certificateManager.updateDefaultBaseRoute("https://yourdomain.com/certificates")
```

**Example with Thirdweb SDK:**
```typescript
import { getContract } from "thirdweb";

const contract = getContract({
  client,
  chain: mantaPacificSepolia,
  address: "0x0a7750524B826E09a27B98564E98AF77fe78f600"
});

await contract.call("updateDefaultBaseRoute", [
  "https://eduverse.academy/certificates"
]);
```

---

## 📖 ENVIRONMENT VARIABLES REFERENCE

### Frontend (`eduweb/.env.local`)

#### Application Configuration

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public | ✅ Yes | - | Base URL for QR codes and verification |
| `NEXT_PUBLIC_CHAIN_ID` | Public | ✅ Yes | `3441006` | Manta Pacific Testnet chain ID |
| `NEXT_PUBLIC_RPC_URL` | Public | ✅ Yes | - | Blockchain RPC endpoint |

#### Smart Contract Addresses

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NEXT_PUBLIC_COURSE_FACTORY_ADDRESS` | Public | ✅ Yes | - | CourseFactory contract address |
| `NEXT_PUBLIC_COURSE_LICENSE_ADDRESS` | Public | ✅ Yes | - | CourseLicense contract address |
| `NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS` | Public | ✅ Yes | - | ProgressTracker contract address |
| `NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS` | Public | ✅ Yes | - | CertificateManager contract address |

#### Thirdweb SDK

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Public | ✅ Yes | - | Thirdweb client ID for SDK |
| `THIRDWEB_SECRET_KEY` | Secret | ✅ Yes | - | Thirdweb secret key (server-only) |

#### Goldsky Indexer

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT` | Public | ✅ Yes | - | GraphQL API endpoint for queries |
| `GOLDSKY_API_KEY` | Secret | ⚠️ Deploy | - | For CLI deployment (not used in frontend) |
| `GOLDSKY_PROJECT_ID` | Secret | ℹ️ Info | - | Project identifier (not used in code) |
| `GOLDSKY_SUBGRAPH_NAME` | Secret | ℹ️ Info | - | Subgraph name (not used in code) |
| `GOLDSKY_SUBGRAPH_VERSION` | Secret | ℹ️ Info | `1.1.0` | Version reference (not used in code) |

#### Pinata IPFS

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `PINATA_JWT` | Secret | ✅ Yes | - | Full access JWT token (expires 2026-06-18) |
| `PINATA_GATEWAY` | Secret | ✅ Yes | - | Custom gateway domain |
| `PINATA_SIGNED_URL_EXPIRY` | Secret | ⚙️ Optional | `3600` | Signed URL expiry in seconds (1 hour) |
| `PINATA_VIDEO_SIGNED_URL_EXPIRY` | Secret | ⚙️ Optional | `7200` | Video signed URL expiry (2 hours) |
| `PINATA_API_KEY` | Secret | ❌ Legacy | - | Old REST API key (not used) |
| `PINATA_API_SECRET` | Secret | ❌ Legacy | - | Old REST API secret (not used) |

#### Livepeer Video

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `LIVEPEER_API_KEY` | Secret | ✅ Yes | - | Livepeer Studio API key for video streaming |

### Subgraph (`goldsky-indexer/subgraph-custom/.env`)

#### Goldsky Deployment

| Variable | Required | Description |
|----------|----------|-------------|
| `GOLDSKY_API_KEY` | ✅ Yes | API key for `goldsky subgraph deploy` command |

#### Network Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MANTA_RPC_URL` | ✅ Yes | - | RPC endpoint for blockchain data |

#### Contract Addresses

| Variable | Required | Description |
|----------|----------|-------------|
| `COURSE_FACTORY_ADDRESS` | ✅ Yes | Must match frontend config |
| `COURSE_LICENSE_ADDRESS` | ✅ Yes | Must match frontend config |
| `PROGRESS_TRACKER_ADDRESS` | ✅ Yes | Must match frontend config |
| `CERTIFICATE_MANAGER_ADDRESS` | ✅ Yes | Must match frontend config |

#### Indexing Optimization

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `START_BLOCK_COURSE_FACTORY` | ⚙️ Optional | `5326332` | Start block for CourseFactory indexing |
| `START_BLOCK_COURSE_LICENSE` | ⚙️ Optional | `5326335` | Start block for CourseLicense indexing |
| `START_BLOCK_PROGRESS_TRACKER` | ⚙️ Optional | `5326340` | Start block for ProgressTracker indexing |
| `START_BLOCK_CERTIFICATE_MANAGER` | ⚙️ Optional | `5326345` | Start block for CertificateManager indexing |

#### Development/Testing

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEV_SUBGRAPH_URL` | ℹ️ Info | - | Reference to deployed subgraph endpoint |
| `LOAD_TEST_QPS` | ℹ️ Info | `10` | Load test queries per second |
| `LOAD_TEST_DURATION` | ℹ️ Info | `60` | Load test duration in seconds |
| `LOAD_TEST_CONCURRENCY` | ℹ️ Info | `5` | Load test concurrent connections |
| `RATE_LIMIT_WINDOW` | ℹ️ Info | `60000` | Rate limit window in ms |
| `RATE_LIMIT_MAX_REQUESTS` | ℹ️ Info | `100` | Max requests per window |

---

## 🔄 CONFIGURATION SYNC

### Keeping Frontend & Subgraph in Sync

Both frontend and subgraph must use the **same contract addresses**. Any changes require:

1. **Update frontend:**
   ```bash
   # Edit eduweb/.env.local
   NEXT_PUBLIC_COURSE_FACTORY_ADDRESS=0xNewAddress...
   ```

2. **Update subgraph:**
   ```bash
   # Edit goldsky-indexer/subgraph-custom/.env
   COURSE_FACTORY_ADDRESS=0xNewAddress...
   
   # Update goldsky-indexer/subgraph-custom/subgraph.yaml
   dataSources:
     - name: CourseFactory
       network: manta-pacific-sepolia
       source:
         address: "0xNewAddress..."
         startBlock: 5326332  # Update if redeployed
   ```

3. **Redeploy subgraph:**
   ```bash
   cd goldsky-indexer/subgraph-custom
   npm run deploy
   ```

4. **Update GraphQL endpoint:**
   ```bash
   # If new version deployed, update frontend:
   NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/.../1.2.0/gn
   ```

---

## ✅ VALIDATION COMMANDS

### Check Configuration Consistency

```bash
# Verify contract addresses match
echo "=== Frontend Addresses ==="
grep "ADDRESS=" eduweb/.env.local | sort

echo "\n=== Subgraph Addresses ==="
grep "ADDRESS=" goldsky-indexer/subgraph-custom/.env.example | sort

# Verify Goldsky endpoint version
echo "\n=== Goldsky Endpoint ==="
grep "GOLDSKY_GRAPHQL_ENDPOINT" eduweb/.env.local

# Check for sensitive data in .env.example files
echo "\n=== Security Check ==="
grep -E "(JWT|SECRET|API_KEY)=(?!your_|<)" **/.env.example || echo "✅ No sensitive data exposed"
```

### Test Goldsky Connection

```bash
# Test GraphQL endpoint
curl -X POST \
  https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.1.0/gn \
  -H "Content-Type: application/json" \
  -d '{"query":"{ _meta { block { number } hasIndexingErrors } }"}'
```

**Expected response:**
```json
{
  "data": {
    "_meta": {
      "block": { "number": 5358000 },
      "hasIndexingErrors": false
    }
  }
}
```

### Test Contract Addresses

```bash
# Verify contracts are deployed at specified addresses
cast code 0x44661459e3c092358559d8459e585EA201D04231 --rpc-url https://pacific-rpc.sepolia-testnet.manta.network/http
```

---

## 📝 NOTES

### Key Expiry Dates

- **Pinata JWT:** Expires 2026-06-18 (from JWT payload `exp: 1782314682`)
- **Thirdweb Keys:** No expiry (managed via dashboard)
- **Livepeer API Key:** No expiry (managed via dashboard)

### Version History

- **2025-01-25:** Initial audit & fixes
  - Updated `GOLDSKY_SUBGRAPH_VERSION` to 1.1.0
  - Updated `DEV_SUBGRAPH_URL` to v1.1.0
  - Sanitized API key in `.env.example`

### Maintenance

**Monthly:**
- [ ] Verify all API keys are still valid
- [ ] Check Goldsky endpoint is responding
- [ ] Review security best practices

**Before Production Deploy:**
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set all environment variables in hosting provider
- [ ] Update contract `defaultBaseRoute` if needed
- [ ] Test certificate QR codes with production URL

---

## 🆘 TROUBLESHOOTING

### Issue: GraphQL queries return empty data

**Possible causes:**
1. Subgraph is still syncing (check `_meta.block.number`)
2. No events emitted yet (deploy contracts and create test data)
3. Wrong endpoint URL (verify v1.1.0)

**Solution:**
```bash
# Check sync status
curl -X POST $NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{"query":"{ _meta { block { number } hasIndexingErrors } }"}'
```

### Issue: "Invalid API key" when deploying subgraph

**Possible causes:**
1. API key not set in `.env`
2. API key expired or revoked

**Solution:**
```bash
# Check API key is set
echo $GOLDSKY_API_KEY

# If empty, set it:
export GOLDSKY_API_KEY=your_actual_key_here

# Or create .env file:
echo "GOLDSKY_API_KEY=your_actual_key_here" > .env
```

### Issue: Contract addresses mismatch

**Symptom:** Frontend queries return null for deployed contracts

**Solution:**
```bash
# 1. Get actual deployed addresses
cat eduweb/abis/contract-addresses.json

# 2. Update both frontend and subgraph .env files
# 3. Redeploy subgraph with new addresses
# 4. Clear browser cache and reload frontend
```

---

## 📚 RELATED DOCUMENTATION

- [Goldsky Documentation](https://docs.goldsky.com/)
- [Thirdweb Documentation](https://portal.thirdweb.com/)
- [Pinata Documentation](https://docs.pinata.cloud/)
- [Livepeer Documentation](https://docs.livepeer.org/)
- [Manta Pacific Testnet](https://docs.manta.network/)

---

**End of Checklist** | ✅ Configuration Validated | Last Updated: 2025-01-25