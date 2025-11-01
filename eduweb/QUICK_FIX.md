# 🚨 QUICK FIX: Goldsky 404 Error

**Problem:** Browse Courses page shows 404 error in console  
**Cause:** Missing or incorrect Goldsky GraphQL endpoint  
**Time to fix:** 2 minutes

---

## 🎯 3-Step Quick Fix

### Step 1: Get Your Endpoint (30 seconds)

```bash
cd /home/miku/Documents/Project/Web3/Eduverse/goldsky-indexer/subgraph-custom
goldsky subgraph list
```

**Copy the "GraphQL API" URL** from the output. Should look like:
```
https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.4.0/gn
```

---

### Step 2: Update Environment File (30 seconds)

Open or create `/home/miku/Documents/Project/Web3/Eduverse/eduweb/.env.local`

Add this line (replace with YOUR endpoint from Step 1):

```env
NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.4.0/gn
```

**⚠️ CRITICAL:** Variable name must be EXACTLY `NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT`

---

### Step 3: Restart Dev Server (1 minute)

```bash
cd /home/miku/Documents/Project/Web3/Eduverse/eduweb

# Stop current dev server (Ctrl+C)

# Clear Next.js cache
rm -rf .next

# Start fresh
npm run dev
```

**Then in your browser:**
1. Press `Ctrl+Shift+R` (hard reload)
2. Or use Incognito mode

---

## ✅ Verify Fix

Visit: http://localhost:3000/goldsky-diagnostic

**You should see:**
- ✅ All green checkmarks
- ✅ "All systems operational"
- ✅ Client and server endpoints match

---

## 🤖 Automated Fix (Alternative)

Run this single command:

```bash
cd /home/miku/Documents/Project/Web3/Eduverse/eduweb
./scripts/fix-goldsky-404.sh
```

Then restart dev server and hard reload browser.

---

## 🆘 Still Not Working?

### Check 1: Verify .env.local exists and has correct value

```bash
cd /home/miku/Documents/Project/Web3/Eduverse/eduweb
cat .env.local | grep GOLDSKY
```

**Must show:**
```
NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/...
```

### Check 2: Verify endpoint is reachable

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ _meta { block { number } } }"}' \
  https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.4.0/gn
```

**Should return:** `{"data":{"_meta":{"block":{"number":5384811}}}}`

### Check 3: Verify dev server is using new config

Visit: http://localhost:3000/api/test-goldsky

**Should return:** `{"success": true, ...}`

---

## 📖 Need More Help?

Read the complete guides:
- `GOLDSKY_SETUP.md` - Full setup documentation
- `GOLDSKY_404_FIX_SUMMARY.md` - Detailed technical explanation

---

**Last Updated:** 2025-01-31  
**Issue Status:** ✅ FIXED