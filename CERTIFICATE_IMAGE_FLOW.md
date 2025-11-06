# Certificate Image Flow - Complete Architecture

## Problem Yang Diperbaiki

NFT certificate tidak menampilkan gambar di MetaMask karena:
1. ❌ API route menggunakan struct lama yang tidak cocok dengan contract
2. ❌ Image route membuat gambar generic, bukan menggunakan template canvas yang sudah ada
3. ❌ Tidak menggunakan ipfsCID yang sudah di-upload saat minting

## Solusi Yang Diterapkan

### 1. Fix API Metadata Route
**File:** `eduweb/src/app/api/nft/certificate/[tokenId]/route.ts`

**Perubahan:**
- Update `CertificateData` interface → match contract struct
- Fix field names: `institutionName` → `platformName`, `recipient` → `recipientAddress`
- Tambah fields baru: `lifetimeFlag`, `ipfsCID`

### 2. Fix Image Route (PENTING!)
**File:** `eduweb/src/app/api/nft/certificate/[tokenId]/image/route.tsx`

**SEBELUM (SALAH):**
```tsx
// Membuat image generic dengan next/og ImageResponse
return new ImageResponse(<div>...</div>)
// ❌ Image tidak sesuai template
// ❌ QR code tidak ada
// ❌ Font dan layout berbeda
```

**SESUDAH (BENAR):**
```tsx
// Ambil ipfsCID dari contract
const certificateData = await readContract({...})
const imageUrl = `${pinataGateway}/ipfs/${certificateData.ipfsCID}`
const imageBuffer = await fetch(imageUrl)
return new NextResponse(imageBuffer)
// ✅ Gunakan gambar asli dari IPFS
// ✅ Template canvas 6250x4419
// ✅ QR code sudah include
// ✅ Font dan posisi sesuai design
```

---

## Certificate Generation Flow (Lengkap)

### Step 1: User Completes Course
```
Frontend (GetCertificateModal.tsx)
  ↓ User clicks "Get Certificate"
  ↓ Checks eligibility
  ↓ Calculates price
```

### Step 2: Generate Certificate Image
```
POST /api/certificate/generate-pinata
  ↓ Calls: generateAndUploadCertificate()
  ↓
certificate.service.ts
  ↓ createCanvas(6250, 4419)
  ↓ Load template from IPFS
  ↓ drawRecipientName() dengan shadow
  ↓ Draw description text
  ↓ Generate QR code (position x:4200, y:2800, size:1000)
  ↓ Optimize dengan sharp
  ↓
Upload to Pinata
  ↓ Image uploaded → returns CID
  ↓ Metadata uploaded → returns metadata CID
  ↓
Response: { cid, metadataCID, signedUrl }
```

**Template Details:**
- Resolution: 6250 x 4419 pixels
- Template URL: `bafybeiaibxpgjjcjr3dgfyhhg365rt47xl2nwwrnesr6zshpompucxgn3q`
- Name Position: x=3125, y=1800, fontSize=285px
- Description Position: x=3125, y=2210, fontSize=89px
- QR Position: x=4200, y=2800, size=1000x1000
- Font: Arial with shadow (rgba(0,0,0,0.15))

### Step 3: Mint to Blockchain
```
Frontend
  ↓ Call: prepareContractCall(mintOrUpdateCertificate)
  ↓ Params: courseId, name, ipfsCID, paymentHash, baseRoute
  ↓
CertificateManager.sol
  ↓ Check if first certificate
  ↓ If first: _mintFirstCertificate()
  ↓   - Mint ERC-1155 token
  ↓   - Set tokenId
  ↓   - Store Certificate struct with ipfsCID
  ↓   - completedCourses.push(courseId)
  ↓ If exists: _addCourseToExistingCertificate()
  ↓   - Update ipfsCID (new image with all courses)
  ↓   - completedCourses.push(courseId)
  ↓
Event emitted: CertificateMinted or CourseAddedToCertificate
```

**Certificate Struct (on-chain):**
```solidity
struct Certificate {
    uint256 tokenId;
    string platformName;           // "EduVerse Academy"
    string recipientName;          // "Revo Rahmat"
    address recipientAddress;      // 0xc584F07...
    bool lifetimeFlag;             // true
    bool isValid;                  // true
    string ipfsCID;                // bafybeifo6qvvg5djzalo5...
    string baseRoute;              // https://edu-verse-blond.vercel.app/certificates
    uint256 issuedAt;              // 1730899200
    uint256 lastUpdated;           // 1730899200
    uint256 totalCoursesCompleted; // 1
    bytes32 paymentReceiptHash;    // 0x123...
}
```

### Step 4: NFT Metadata Retrieval
```
MetaMask/Wallet
  ↓ Calls: contract.uri(tokenId)
  ↓
CertificateManager.sol → uri(tokenId)
  ↓ Returns: defaultMetadataBaseURI + "/" + tokenId
  ↓ = "https://edu-verse-blond.vercel.app/api/nft/certificate/1"
  ↓
GET /api/nft/certificate/1
  ↓ readContract: getCertificate(tokenId)
  ↓ Returns Certificate struct
  ↓ Generate metadata JSON:
  {
    "name": "EduVerse Academy Certificate - Revo Rahmat",
    "description": "...",
    "image": "https://edu-verse-blond.vercel.app/api/nft/certificate/1/image",
    "attributes": [...]
  }
  ↓
MetaMask fetches image URL
  ↓
GET /api/nft/certificate/1/image
  ↓ readContract: getCertificate(tokenId)
  ↓ Extract: ipfsCID = "bafybeifo6qvvg5djzalo5..."
  ↓ Fetch: gateway.pinata.cloud/ipfs/{ipfsCID}
  ↓ Return PNG buffer
  ↓
MetaMask displays certificate image ✅
```

---

## Configuration Points

### 1. Contract Configuration
```solidity
// Set during deployment (scripts/deploy.js)
defaultMetadataBaseURI = "https://edu-verse-blond.vercel.app/api/nft/certificate"
```

### 2. Environment Variables
```env
# eduweb/.env.local
NEXT_PUBLIC_APP_URL=https://edu-verse-blond.vercel.app
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=0x335BD88512Ce9Eff0009f05261ec47679427805d
```

### 3. Certificate Template
- Stored on IPFS: `bafybeiaibxpgjjcjr3dgfyhhg365rt47xl2nwwrnesr6zshpompucxgn3q`
- Accessed via: `https://copper-far-firefly-220.mypinata.cloud/ipfs/...`

---

## QR Code Integration

**Generation (certificate.service.ts):**
```typescript
const tokenId = data.tokenId || 0
const address = data.recipientAddress || '0x0'
const verifyUrl = `${QR_BASE_URL}/certificates?tokenId=${tokenId}&address=${address}`

await QRCode.toDataURL(verifyUrl, {
  width: 1000,
  errorCorrectionLevel: 'H',
  color: { dark: '#2D1B4E', light: '#FFFFFF' }
})
```

**Position:**
- X: 4200 (right side of certificate)
- Y: 2800 (bottom section)
- Size: 1000x1000 pixels
- Style: Purple (#2D1B4E) on white

**Verification Flow:**
```
Scan QR → /certificates?tokenId=1&address=0xc584F07...
  ↓
Frontend Goldsky Query
  ↓ GET_CERTIFICATE_BY_TOKEN_ID
  ↓ Returns full learning history
  ↓ Shows all completed courses
```

---

## Why This Approach Works

### ✅ Advantages
1. **Single Source of Truth:** ipfsCID stored on-chain
2. **Immutable Images:** IPFS content-addressed storage
3. **Dynamic Metadata:** API can add context without re-uploading
4. **Cache Friendly:** Images cached by IPFS gateway
5. **Template Consistency:** All certificates use same design
6. **QR Always Included:** Generated during image creation

### ✅ Updates Without Re-upload
When adding courses:
```
1. Generate NEW certificate image (with all courses)
2. Upload to IPFS → new CID
3. Update ipfsCID in contract
4. Old CID still accessible (immutable)
5. Wallet auto-fetches new image via metadata refresh
```

---

## Testing Checklist

- [ ] Certificate generates dengan template benar
- [ ] QR code muncul di posisi x:4200, y:2800
- [ ] Nama student render dengan shadow
- [ ] Image size: 6250x4419 pixels
- [ ] Upload ke Pinata berhasil → dapat CID
- [ ] Minting ke contract berhasil
- [ ] ipfsCID tersimpan di Certificate struct
- [ ] `/api/nft/certificate/1` returns 200 OK
- [ ] `/api/nft/certificate/1/image` returns PNG dari IPFS
- [ ] MetaMask menampilkan gambar certificate
- [ ] QR code scan mengarah ke `/certificates?tokenId=1&address=...`

---

## Error Prevention

### ❌ JANGAN:
1. Generate image on-the-fly di `/image` route
2. Gunakan next/og ImageResponse untuk certificate
3. Hardcode URL tanpa environment variables
4. Lupakan update ipfsCID saat add course

### ✅ LAKUKAN:
1. Generate sekali dengan canvas template
2. Upload ke IPFS → simpan CID
3. Store CID di contract
4. Serve dari IPFS via image route
5. Update CID setiap add course (new image)

---

**Status:** ✅ FIXED
**Last Updated:** 2025-01-06
**Contract:** 0x335BD88512Ce9Eff0009f05261ec47679427805d
**Token ID 1:** Ready for testing