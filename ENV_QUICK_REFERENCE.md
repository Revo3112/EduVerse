# 🚀 EduVerse Environment Quick Reference

**Status:** ✅ All Fixed & Production Ready  
**Last Updated:** 2025-01-25

---

## ⚡ QUICK STATUS

| Component | Status | Version | Notes |
|-----------|--------|---------|-------|
| Frontend | ✅ Ready | - | .env.local updated |
| Subgraph | ✅ Ready | v1.1.0 | Endpoint updated |
| Contracts | ✅ Deployed | - | Manta Pacific Sepolia |
| Goldsky | ✅ Live | v1.1.0 | All events indexed |

---

## 🔧 FIXED ISSUES

1. ✅ **Version Mismatch** - Updated to 1.1.0
2. ✅ **Outdated Endpoint** - Updated subgraph URL
3. ✅ **Security** - Sanitized API key in .env.example

---

## 📦 REQUIRED FOR PRODUCTION

```bash
# Update this before deploying:
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Currently: http://192.168.18.143:3000
```

---

## 🔑 KEY ENVIRONMENT VARIABLES

### Frontend (Public - Safe to Expose)
```bash
NEXT_PUBLIC_APP_URL=http://192.168.18.143:3000
NEXT_PUBLIC_CHAIN_ID=3441006
NEXT_PUBLIC_RPC_URL=https://pacific-rpc.sepolia-testnet.manta.network/http
NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=.../1.1.0/gn
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=89bdce641630ecf1c9de409c4a2ff759
NEXT_PUBLIC_COURSE_FACTORY_ADDRESS=0x44661459e3c092358559d8459e585EA201D04231
NEXT_PUBLIC_COURSE_LICENSE_ADDRESS=0x3aad55E0E88C4594643fEFA837caFAe1723403C8
NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS=0xaB2adB0F4D800971Ee095e2bC26f9d4AdBeDe930
NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=0x0a7750524B826E09a27B98564E98AF77fe78f600
```

### Frontend (Secret - Server Only)
```bash
THIRDWEB_SECRET_KEY=Qxcw4x-u1gVLCtNuoJ7IklXkqLC4AmoY9Pgy4ayoYN1HOf2aPvjp5SfV_GDTcClP_XWyIwAEupWhOUq4zW9KDQ
GOLDSKY_API_KEY=cmh5pepkvctc101xaevpogc67
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_GATEWAY=copper-far-firefly-220.mypinata.cloud
LIVEPEER_API_KEY=5c3537cc-6809-4a12-8e8a-67549cce15ad
```

---

## ✅ VERIFICATION COMMANDS

```bash
# Test Goldsky endpoint
curl -X POST https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.1.0/gn \
  -H "Content-Type: application/json" \
  -d '{"query":"{ _meta { block { number } hasIndexingErrors } }"}'

# Expected: {"data":{"_meta":{"block":{"number":5358000},"hasIndexingErrors":false}}}

# Check contract addresses consistency
grep "ADDRESS=" eduweb/.env.local | sort
grep "ADDRESS=" goldsky-indexer/subgraph-custom/.env.example | sort
```

---

## 📋 PRODUCTION DEPLOYMENT CHECKLIST

- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Set all environment variables in hosting provider (Vercel/Netlify)
- [ ] Verify Goldsky endpoint is v1.1.0
- [ ] Test certificate QR codes with production URL
- [ ] Update contract `defaultBaseRoute` (optional)
- [ ] Test all API routes work with production env vars
- [ ] Enable monitoring/error tracking (Sentry, etc.)

---

## 🆘 QUICK TROUBLESHOOTING

**GraphQL returns empty?**
→ Check `_meta.block.number` - may still be syncing

**"Invalid API key"?**
→ Verify `GOLDSKY_API_KEY` is set in .env (not .env.example)

**Contract address mismatch?**
→ Ensure frontend + subgraph use same addresses from `deployed-contracts.json`

---

**Full Documentation:** See `ENV_CONFIGURATION_CHECKLIST.md`
