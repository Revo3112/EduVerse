# Goldsky Subgraph Endpoint Setup Guide

## 🚨 Critical Issue: 404 Error on Browse Courses Page

The 404 error occurs because the **NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT** environment variable is either:
1. Not set in `.env.local`
2. Set to an incorrect/old endpoint
3. Not loaded by the Next.js dev server

---

## ✅ Solution: Configure Correct Endpoint

### Step 1: Get Your Active Goldsky Endpoint

```bash
cd /home/miku/Documents/Project/Web3/Eduverse/goldsky-indexer/subgraph-custom
goldsky subgraph list
```

**Expected Output:**
```
Subgraphs
* eduverse-manta-pacific-sepolia/1.4.0
    GraphQL API: https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.4.0/gn
    Status: healthy
    Synced: 100%
```

**Copy the GraphQL API URL** from the output.

---

### Step 2: Update `.env.local`

Open or create `Eduverse/eduweb/.env.local` and add:

```env
# Goldsky GraphQL Endpoint (CRITICAL)
NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.4.0/gn
```

**⚠️ IMPORTANT:** Replace the URL with your actual endpoint from Step 1.

---

### Step 3: Restart Next.js Dev Server

The environment variable is read at module load time. You **MUST** restart:

```bash
# Stop current dev server (Ctrl+C)
cd /home/miku/Documents/Project/Web3/Eduverse/eduweb

# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

---

### Step 4: Verify Configuration

#### Test 1: Check Environment Variable (Server-Side)

Visit: http://localhost:3000/api/test-goldsky

**Expected Response:**
```json
{
  "success": true,
  "environment": {
    "hasEndpoint": true,
    "endpoint": "https://api.goldsky.com/api/public/..."
  },
  "tests": {
    "metaQuery": { "success": true, "blockNumber": 5384811 }
  }
}
```

#### Test 2: Check Environment Variable (Client-Side)

Visit: http://localhost:3000/test-env

**Expected Display:**
- ✅ Server Endpoint: `https://api.goldsky.com/api/public/...`
- ✅ Client Endpoint: `https://api.goldsky.com/api/public/...`
- ✅ Endpoint Test: Success

#### Test 3: Check Browse Courses Page

Visit: http://localhost:3000/courses

**Expected:**
- No 404 errors in console
- Empty state message: "No courses found" (because no courses exist yet)
- Statistics: "Showing 0 of 0 courses"

---

## 🔧 Troubleshooting

### Issue 1: Still Getting 404 After Restart

**Cause:** Browser cached old API responses

**Solution:**
1. Open Chrome DevTools (F12)
2. Right-click Reload button
3. Select "Empty Cache and Hard Reload"
4. Or use Incognito mode

---

### Issue 2: "Endpoint not configured" Error

**Cause:** `.env.local` not read or variable name typo

**Check:**
```bash
cd /home/miku/Documents/Project/Web3/Eduverse/eduweb
cat .env.local | grep GOLDSKY
```

**Must contain:**
```
NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://...
```

**Common Typos:**
- ❌ `NEXT_PUBLIC_GOLDSKY_ENDPOINT` (missing GRAPHQL)
- ❌ `GOLDSKY_GRAPHQL_ENDPOINT` (missing NEXT_PUBLIC prefix)
- ✅ `NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT` (correct)

---

### Issue 3: Empty Courses Array

**Cause:** No courses created yet in smart contract

**Verify:**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ courses(first: 5) { id title } }"}' \
  https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.4.0/gn
```

**Expected:** `{"data":{"courses":[]}}`

**Solution:** Create a test course via:
1. Creator Dashboard: http://localhost:3000/dashboard
2. Smart contract interaction
3. Or wait for courses to be added

---

### Issue 4: Subgraph Not Syncing

**Check Subgraph Status:**
```bash
cd /home/miku/Documents/Project/Web3/Eduverse/goldsky-indexer/subgraph-custom
goldsky subgraph list
```

**If Status is NOT "healthy":**
```bash
# Check logs
goldsky subgraph log eduverse-manta-pacific-sepolia/1.4.0 --tail 50

# Redeploy if needed
npm run codegen
npm run build
goldsky subgraph deploy eduverse-manta-pacific-sepolia/1.4.0 --path .
```

---

## 📋 Complete `.env.local` Template

```env
# ==============================================================================
# THIRDWEB SDK
# ==============================================================================
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
THIRDWEB_SECRET_KEY=your_thirdweb_secret_key

# ==============================================================================
# SMART CONTRACTS (Manta Pacific Sepolia Testnet)
# ==============================================================================
NEXT_PUBLIC_COURSE_FACTORY_ADDRESS=0x0DB09a3c87d2F9a7508f7F8495bC69f5F3cCe2bd
NEXT_PUBLIC_COURSE_LICENSE_ADDRESS=0x3Bc646Cd8813D024483b7b0f18de6C47E219EDb9
NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS=0x7947cf6a0b1CA5827804206Fb3De7877574d0b65
NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=0x7D30da5F3188bB6D8db940A80a97237Db0C56FA6

# ==============================================================================
# GOLDSKY INDEXER (CRITICAL - MUST BE SET)
# ==============================================================================
NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.4.0/gn

# ==============================================================================
# PINATA IPFS (for thumbnails)
# ==============================================================================
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
PINATA_JWT=your_pinata_jwt_token

# ==============================================================================
# LIVEPEER (for video content)
# ==============================================================================
LIVEPEER_API_KEY=your_livepeer_api_key

# ==============================================================================
# COINGECKO (for ETH to IDR conversion)
# ==============================================================================
NEXT_PUBLIC_COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

---

## 🎯 Quick Fix Checklist

- [ ] Run `goldsky subgraph list` and copy GraphQL API URL
- [ ] Add/update `NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT` in `.env.local`
- [ ] Delete `.next` folder: `rm -rf .next`
- [ ] Restart dev server: `npm run dev`
- [ ] Clear browser cache (Hard Reload or Incognito)
- [ ] Test `/api/test-goldsky` endpoint
- [ ] Test `/test-env` page
- [ ] Verify `/courses` page (no 404 errors)

---

## 📞 Support

If issue persists after following all steps:

1. **Check subgraph logs:**
   ```bash
   goldsky subgraph log eduverse-manta-pacific-sepolia/1.4.0 --tail 50
   ```

2. **Verify contract addresses match deployment:**
   ```bash
   cat .env.local | grep ADDRESS
   ```

3. **Test endpoint directly:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"query":"{ _meta { block { number } } }"}' \
     $NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT
   ```

---

## ✅ Success Indicators

After setup, you should see:

1. **Console (Terminal):**
   ```
   [Goldsky Courses] Using endpoint: https://api.goldsky.com/...
   ```

2. **Browser Console (no errors):**
   - No "404" errors
   - No "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not configured" warnings

3. **Browse Courses Page:**
   - Loads without errors
   - Shows "0 of 0 courses" (until courses are created)
   - Filter and search UI works

4. **Creator Dashboard:**
   - Loads creator statistics
   - Shows creator's courses (if any)

---

**Last Updated:** 2025-01-31  
**Subgraph Version:** 1.4.0  
**Network:** Manta Pacific Sepolia Testnet