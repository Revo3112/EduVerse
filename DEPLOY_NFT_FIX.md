# NFT Metadata Fix - Deployment Guide

## 🎯 Problem
NFTs minted from CertificateManager contract showed no image in MetaMask, only displaying basic contract info. The API was returning 500 errors because it used an outdated struct format.

## ✅ Solution
Updated both NFT metadata API routes to match the current `CertificateManager.sol` Certificate struct.

---

## 📋 Changes Summary

### Files Modified
1. **`eduweb/src/app/api/nft/certificate/[tokenId]/route.ts`**
   - Updated `CertificateData` interface
   - Fixed `getCertificate()` ABI signature
   - Updated field mappings and metadata generation

2. **`eduweb/src/app/api/nft/certificate/[tokenId]/image/route.tsx`**
   - Updated `CertificateData` interface
   - Fixed `getCertificate()` ABI signature
   - Updated image rendering with correct fields

### Key Field Changes
```
OLD FIELDS          →  NEW FIELDS
institutionName     →  platformName
recipient           →  recipientAddress
mintedAt            →  issuedAt
totalCourses        →  totalCoursesCompleted
isMinted (removed)  →  lifetimeFlag (new)
qrData (removed)    →  ipfsCID (new)
```

---

## 🚀 Deployment Steps

### 1. Commit Changes
```bash
cd Eduverse/eduweb
git add src/app/api/nft/certificate/
git commit -m "fix: Update NFT metadata API to match CertificateManager.sol struct

- Fix Certificate struct interface to match on-chain contract
- Update getCertificate ABI signature with correct field names
- Add lifetimeFlag and ipfsCID fields
- Remove deprecated isMinted and qrData fields
- Fixes 500 errors preventing NFT images from displaying in wallets"
```

### 2. Push to Deploy
```bash
git push origin main
```

Vercel will automatically deploy. Wait 2-3 minutes for deployment to complete.

### 3. Verify Deployment
Monitor deployment at: https://vercel.com/dashboard

Wait for status: ✅ Ready

---

## 🧪 Testing

### A. Quick API Test
```bash
# Test metadata endpoint
curl https://edu-verse-blond.vercel.app/api/nft/certificate/1

# Should return JSON with:
# - name, description, image, external_url, attributes
# - Status: 200 OK (not 500)
```

### B. Automated Test Script
```bash
cd Eduverse
./test_nft_metadata.sh
```

Expected output: `✅ ALL TESTS PASSED`

### C. Manual Wallet Test
1. **Open MetaMask**
2. Go to **NFTs tab**
3. Find certificate NFT (Token ID: 1)
4. Click NFT → **⋮** (three dots) → **"Refresh metadata"**
5. Wait 30-60 seconds
6. ✅ Image should now display

---

## 🔍 Verification Checklist

- [ ] API endpoint returns 200 (no 500 error)
- [ ] Metadata JSON includes all required fields
- [ ] Image endpoint works (`/api/nft/certificate/[tokenId]/image`)
- [ ] Test script passes all checks
- [ ] MetaMask displays certificate image
- [ ] New certificates work after deployment
- [ ] Existing certificates (token ID 1) now display correctly

---

## 📊 Technical Details

### How It Works
```
MetaMask/Wallet
    ↓ calls uri(tokenId)
CertificateManager.sol
    ↓ returns: https://edu-verse-blond.vercel.app/api/nft/certificate/1
API Route
    ↓ readContract with CORRECT struct format
    ↓ generates ERC-1155 metadata JSON
    ↓ includes image URL
Wallet displays NFT with image ✅
```

### Contract Configuration
The contract's `defaultMetadataBaseURI` is already set via deployment script:
```solidity
defaultMetadataBaseURI = "https://edu-verse-blond.vercel.app/api/nft/certificate"
```

This setting directs all wallets to fetch metadata from the API endpoint.

---

## 🐛 Troubleshooting

### If metadata still doesn't show after 5 minutes:

1. **Clear wallet cache**
   ```
   MetaMask → Settings → Advanced → Clear activity tab data
   ```

2. **Check contract URI setting**
   ```bash
   cast call 0x335BD88512Ce9Eff0009f05261ec47679427805d \
     "defaultMetadataBaseURI()(string)" \
     --rpc-url https://pacific-rpc.testnet.manta.network
   ```
   Should return: `https://edu-verse-blond.vercel.app/api/nft/certificate`

3. **Test API directly in browser**
   Visit: https://edu-verse-blond.vercel.app/api/nft/certificate/1
   Should show JSON metadata (not error page)

4. **Check Vercel logs**
   Go to Vercel dashboard → Logs
   Look for any 500 errors on `/api/nft/certificate/*` routes

### If API returns 500 after deployment:

1. **Check environment variables in Vercel**
   - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` is set
   - `NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS` is correct
   - `NEXT_PUBLIC_COURSE_FACTORY_ADDRESS` is correct
   - `NEXT_PUBLIC_APP_URL` matches deployment URL

2. **Redeploy manually**
   ```bash
   vercel --prod
   ```

---

## 📝 Additional Notes

### Backward Compatibility
✅ This fix is backward compatible. No contract changes needed.

### Affected NFTs
- **Existing NFTs (Token ID 1):** Will work after API fix
- **New NFTs:** Will work immediately after deployment

### IPFS Metadata
The contract stores `ipfsCID` for reference, but the dynamic API endpoint is the primary metadata source. This allows:
- Real-time updates without re-uploading to IPFS
- Dynamic course additions reflected immediately
- Lower gas costs (no on-chain URI updates needed)

---

## 🎉 Success Criteria

Fix is successful when:
1. ✅ API returns 200 with valid JSON
2. ✅ MetaMask shows certificate image
3. ✅ No 500 errors in Vercel logs
4. ✅ New certificate mints display correctly
5. ✅ Test script passes all checks

---

## 📞 Support

If issues persist:
1. Check `FIX_NFT_METADATA_500_ERROR.md` for detailed technical explanation
2. Review Vercel deployment logs
3. Test with `test_nft_metadata.sh` script
4. Verify contract configuration with cast/foundry

**Status:** ✅ Ready for deployment
**Estimated Time:** 5 minutes (deploy + test)
**Risk Level:** Low (API-only changes, no contract interaction)