# EDUVERSE ADMIN EVENTS TRACKING AUDIT REPORT

**Date:** 2025-01-XX
**Auditor:** Sequential Thinking Analysis
**Scope:** Admin page functionality vs Smart Contract events vs Goldsky Indexer

---

## EXECUTIVE SUMMARY

This audit verifies that all admin functions in the admin page (`eduweb/src/app/admin/page.tsx`) properly emit trackable events that are indexed by Goldsky for frontend consumption.

**Status:** ⚠️ INCOMPLETE - 6 Critical Issues Found

---

## 1. ADMIN READER FUNCTIONS

All reader functions used in `loadContractData()`:

| Contract | Function | Return Type | Status |
|----------|----------|-------------|--------|
| CertificateManager | `defaultCertificateFee()` | uint256 | ✅ Working |
| CertificateManager | `defaultCourseAdditionFee()` | uint256 | ✅ Working |
| CertificateManager | `defaultPlatformName()` | string | ✅ Working |
| CertificateManager | `defaultBaseRoute()` | string | ✅ Working |
| CertificateManager | `platformWallet()` | address | ✅ Working |
| CourseLicense | `platformFeePercentage()` | uint256 | ✅ Working |

**Reader Functions Status:** ✅ ALL WORKING (6/6)

---

## 2. ADMIN WRITER FUNCTIONS - CERTIFICATE MANAGER

### 2.1 setDefaultCertificateFee

**Function:** `setDefaultCertificateFee(uint256 newFee)`

**Contract Implementation:**
- ✅ Event Declared: `DefaultCertificateFeeUpdated(uint256 newFee)`
- ✅ Event Emitted: Line 763
- ❌ Goldsky Handler: NOT TRACKED IN SUBGRAPH.YAML
- ❌ Mapping Implementation: MISSING

**Status:** ⚠️ EVENT EXISTS BUT NOT INDEXED

---

### 2.2 setDefaultCourseAdditionFee

**Function:** `setDefaultCourseAdditionFee(uint256 newFee)`

**Contract Implementation:**
- ✅ Event Declared: `CourseAdditionFeeUpdated(uint256 newFee)`
- ✅ Event Emitted: Line 774
- ✅ Goldsky Handler: TRACKED IN SUBGRAPH.YAML
- ✅ Mapping Implementation: `handleCourseAdditionFeeUpdated()` exists

**Status:** ✅ FULLY TRACKED

---

### 2.3 setPlatformWallet

**Function:** `setPlatformWallet(address newWallet)`

**Contract Implementation:**
- ✅ Event Declared: `PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet)`
- ✅ Event Emitted: Line 786
- ❌ Goldsky Handler: NOT TRACKED IN SUBGRAPH.YAML
- ❌ Mapping Implementation: MISSING

**Status:** ⚠️ EVENT EXISTS BUT NOT INDEXED

---

### 2.4 setDefaultPlatformName

**Function:** `setDefaultPlatformName(string newPlatformName)`

**Contract Implementation:**
- ✅ Event Declared: `PlatformNameUpdated(string newPlatformName)`
- ✅ Event Emitted: Line 802
- ✅ Goldsky Handler: TRACKED IN SUBGRAPH.YAML
- ✅ Mapping Implementation: `handlePlatformNameUpdated()` exists

**Status:** ✅ FULLY TRACKED

---

### 2.5 updateDefaultBaseRoute

**Function:** `updateDefaultBaseRoute(string newBaseRoute)`

**Contract Implementation:**
- ✅ Event Declared: `DefaultBaseRouteUpdated(string newBaseRoute)`
- ✅ Event Emitted: Line 895
- ✅ Goldsky Handler: TRACKED IN SUBGRAPH.YAML
- ✅ Mapping Implementation: `handleDefaultBaseRouteUpdated()` exists

**Status:** ✅ FULLY TRACKED

---

### 2.6 setTokenURI

**Function:** `setTokenURI(uint256 tokenId, string tokenURI)`

**Contract Implementation:**
- ❌ Event Declared: NO EVENT EXISTS
- ❌ Event Emitted: NO
- ❌ Goldsky Handler: N/A
- ❌ Mapping Implementation: N/A

**Status:** ❌ CRITICAL - NO EVENT IN CONTRACT

**Impact:** Admin cannot track custom token URI changes

---

### 2.7 revokeCertificate

**Function:** `revokeCertificate(uint256 tokenId, string reason)`

**Contract Implementation:**
- ✅ Event Declared: `CertificateRevoked(uint256 indexed tokenId, string reason)`
- ✅ Event Emitted: Line 935
- ✅ Goldsky Handler: TRACKED IN SUBGRAPH.YAML
- ✅ Mapping Implementation: `handleCertificateRevoked()` exists

**Status:** ✅ FULLY TRACKED

---

### 2.8 pause()

**Function:** `pause()`

**Contract Implementation:**
- ✅ Event Declared: `Paused(address account)` (OpenZeppelin)
- ✅ Event Emitted: Via `_pause()` internal call
- ❌ Goldsky Handler: NOT TRACKED IN SUBGRAPH.YAML
- ❌ Mapping Implementation: MISSING

**Status:** ⚠️ EVENT EXISTS BUT NOT INDEXED

**Note:** OpenZeppelin Pausable emits standard events

---

### 2.9 unpause()

**Function:** `unpause()`

**Contract Implementation:**
- ✅ Event Declared: `Unpaused(address account)` (OpenZeppelin)
- ✅ Event Emitted: Via `_unpause()` internal call
- ❌ Goldsky Handler: NOT TRACKED IN SUBGRAPH.YAML
- ❌ Mapping Implementation: MISSING

**Status:** ⚠️ EVENT EXISTS BUT NOT INDEXED

**Note:** OpenZeppelin Pausable emits standard events

---

## 3. ADMIN WRITER FUNCTIONS - COURSE LICENSE

### 3.1 setURI

**Function:** `setURI(string newuri)`

**Contract Implementation:**
- ✅ Event Declared: `BaseURIUpdated(string newBaseURI)`
- ✅ Event Emitted: Line 415
- ❌ Goldsky Handler: NOT TRACKED IN SUBGRAPH.YAML
- ❌ Mapping Implementation: MISSING

**Status:** ⚠️ EVENT EXISTS BUT NOT INDEXED

---

### 3.2 setPlatformFeePercentage

**Function:** `setPlatformFeePercentage(uint256 _feePercentage)`

**Contract Implementation:**
- ✅ Event Declared: `PlatformFeePercentageUpdated(uint256 oldPercentage, uint256 newPercentage)`
- ✅ Event Emitted: Line 467
- ❌ Goldsky Handler: NOT TRACKED IN SUBGRAPH.YAML
- ❌ Mapping Implementation: MISSING

**Status:** ⚠️ EVENT EXISTS BUT NOT INDEXED

---

### 3.3 setPlatformWallet (CourseLicense)

**Function:** `setPlatformWallet(address _platformWallet)`

**Contract Implementation:**
- ✅ Event Declared: `PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet)`
- ✅ Event Emitted: Line 479
- ❌ Goldsky Handler: NOT TRACKED IN SUBGRAPH.YAML
- ❌ Mapping Implementation: MISSING

**Status:** ⚠️ EVENT EXISTS BUT NOT INDEXED

**Note:** This is a DUPLICATE event name with CertificateManager but different contract

---

## 4. ADMIN WRITER FUNCTIONS - COURSE FACTORY

### 4.1 blacklistUser

**Function:** `blacklistUser(address user)`

**Contract Implementation:**
- ✅ Event Declared: `UserBlacklisted(address indexed user, address indexed admin)`
- ✅ Event Emitted: Line 1151
- ✅ Goldsky Handler: TRACKED IN SUBGRAPH.YAML
- ✅ Mapping Implementation: `handleUserBlacklisted()` exists

**Status:** ✅ FULLY TRACKED

---

### 4.2 unblacklistUser

**Function:** `unblacklistUser(address user)`

**Contract Implementation:**
- ✅ Event Declared: `UserUnblacklisted(address indexed user, address indexed admin)`
- ✅ Event Emitted: Line 1165
- ✅ Goldsky Handler: TRACKED IN SUBGRAPH.YAML
- ✅ Mapping Implementation: `handleUserUnblacklisted()` exists

**Status:** ✅ FULLY TRACKED

---

## 5. CRITICAL ISSUES SUMMARY

### Issue #1: Missing Event in Smart Contract
**Contract:** CertificateManager
**Function:** `setTokenURI(uint256, string)`
**Problem:** No event emitted when admin sets custom token URI
**Solution Required:** Add `TokenURIUpdated(uint256 indexed tokenId, string newURI)` event

---

### Issue #2: Missing Goldsky Handler - DefaultCertificateFeeUpdated
**Contract:** CertificateManager
**Event:** `DefaultCertificateFeeUpdated(uint256)`
**Problem:** Event exists in contract and ABI but not tracked by subgraph
**Solution Required:** Add event handler to `subgraph.yaml` and create mapping function

---

### Issue #3: Missing Goldsky Handler - PlatformWalletUpdated (CertificateManager)
**Contract:** CertificateManager
**Event:** `PlatformWalletUpdated(address, address)`
**Problem:** Event exists in contract and ABI but not tracked by subgraph
**Solution Required:** Add event handler to `subgraph.yaml` and create mapping function

---

### Issue #4: Missing Goldsky Handler - BaseURIUpdated
**Contract:** CourseLicense
**Event:** `BaseURIUpdated(string)`
**Problem:** Event exists in contract and ABI but not tracked by subgraph
**Solution Required:** Add event handler to `subgraph.yaml` and create mapping function

---

### Issue #5: Missing Goldsky Handler - PlatformFeePercentageUpdated
**Contract:** CourseLicense
**Event:** `PlatformFeePercentageUpdated(uint256, uint256)`
**Problem:** Event exists in contract and ABI but not tracked by subgraph
**Solution Required:** Add event handler to `subgraph.yaml` and create mapping function

---

### Issue #6: Missing Goldsky Handler - PlatformWalletUpdated (CourseLicense)
**Contract:** CourseLicense
**Event:** `PlatformWalletUpdated(address, address)`
**Problem:** Event exists in contract and ABI but not tracked by subgraph
**Solution Required:** Add event handler to `subgraph.yaml` and create mapping function

---

### Issue #7: Missing Goldsky Handlers - Paused/Unpaused
**Contract:** CertificateManager (OpenZeppelin Pausable)
**Events:** `Paused(address)` and `Unpaused(address)`
**Problem:** Standard OpenZeppelin events not tracked by subgraph
**Solution Required:** Add event handlers to `subgraph.yaml` and create mapping functions

---

## 6. IMPLEMENTATION PRIORITY

### HIGH PRIORITY (User-facing admin operations)
1. ❌ Add `TokenURIUpdated` event to CertificateManager.setTokenURI
2. ⚠️ Track `DefaultCertificateFeeUpdated` in Goldsky
3. ⚠️ Track `PlatformWalletUpdated` (both contracts) in Goldsky
4. ⚠️ Track `PlatformFeePercentageUpdated` in Goldsky

### MEDIUM PRIORITY (Configuration changes)
5. ⚠️ Track `BaseURIUpdated` in Goldsky

### LOW PRIORITY (Emergency operations)
6. ⚠️ Track `Paused` and `Unpaused` events in Goldsky

---

## 7. GOLDSKY SUBGRAPH.YAML REQUIRED CHANGES

### CertificateManager DataSource - Add Event Handlers:

```yaml
# Admin Configuration Events (MISSING)
- event: DefaultCertificateFeeUpdated(uint256)
  handler: handleDefaultCertificateFeeUpdated
- event: PlatformWalletUpdated(indexed address,indexed address)
  handler: handlePlatformWalletUpdatedCertMgr
- event: Paused(address)
  handler: handleCertificateManagerPaused
- event: Unpaused(address)
  handler: handleCertificateManagerUnpaused
```

### CourseLicense DataSource - Add Event Handlers:

```yaml
# Admin Configuration Events (MISSING)
- event: BaseURIUpdated(string)
  handler: handleBaseURIUpdated
- event: PlatformFeePercentageUpdated(uint256,uint256)
  handler: handlePlatformFeePercentageUpdated
- event: PlatformWalletUpdated(indexed address,indexed address)
  handler: handlePlatformWalletUpdatedLicense
```

---

## 8. MAPPING FUNCTIONS REQUIRED

### certificateManager.ts - Add:
- `handleDefaultCertificateFeeUpdated()`
- `handlePlatformWalletUpdatedCertMgr()`
- `handleCertificateManagerPaused()`
- `handleCertificateManagerUnpaused()`
- `handleTokenURIUpdated()` (after contract update)

### courseLicense.ts - Add:
- `handleBaseURIUpdated()`
- `handlePlatformFeePercentageUpdated()`
- `handlePlatformWalletUpdatedLicense()`

---

## 9. SMART CONTRACT CHANGES REQUIRED

### CertificateManager.sol

**Add Event Declaration (after line 133):**
```solidity
event TokenURIUpdated(uint256 indexed tokenId, string newURI);
```

**Update setTokenURI function (line 862-868):**
```solidity
function setTokenURI(
    uint256 tokenId,
    string calldata tokenURI
) external onlyOwner {
    if (!_exists(tokenId)) revert CertificateNotFound(tokenId);
    _tokenURIs[tokenId] = tokenURI;
    emit TokenURIUpdated(tokenId, tokenURI); // ADD THIS LINE
}
```

---

## 10. ADMIN PAGE VALIDATION

### Current Admin Functions Coverage:

| Function | Contract | Event Emitted | Goldsky Tracked | Status |
|----------|----------|---------------|-----------------|--------|
| Load contract data (6 readers) | Mixed | N/A | N/A | ✅ Working |
| setDefaultCertificateFee | CertMgr | ✅ Yes | ❌ No | ⚠️ Partial |
| setDefaultCourseAdditionFee | CertMgr | ✅ Yes | ✅ Yes | ✅ Complete |
| setPlatformWallet | CertMgr | ✅ Yes | ❌ No | ⚠️ Partial |
| setDefaultPlatformName | CertMgr | ✅ Yes | ✅ Yes | ✅ Complete |
| updateDefaultBaseRoute | CertMgr | ✅ Yes | ✅ Yes | ✅ Complete |
| setTokenURI | CertMgr | ❌ No | ❌ No | ❌ Missing |
| revokeCertificate | CertMgr | ✅ Yes | ✅ Yes | ✅ Complete |
| pause | CertMgr | ✅ Yes (OZ) | ❌ No | ⚠️ Partial |
| unpause | CertMgr | ✅ Yes (OZ) | ❌ No | ⚠️ Partial |
| setURI | License | ✅ Yes | ❌ No | ⚠️ Partial |
| setPlatformFeePercentage | License | ✅ Yes | ❌ No | ⚠️ Partial |
| blacklistUser | Factory | ✅ Yes | ✅ Yes | ✅ Complete |
| unblacklistUser | Factory | ✅ Yes | ✅ Yes | ✅ Complete |

**Summary:** 5/14 FULLY TRACKED, 8/14 PARTIALLY TRACKED, 1/14 NOT TRACKED

---

## 11. RECOMMENDED ACTION PLAN

### Phase 1: Smart Contract Update (HIGH PRIORITY)
1. Add `TokenURIUpdated` event to CertificateManager
2. Emit event in `setTokenURI()` function
3. Recompile and redeploy CertificateManager
4. Export new ABI to frontend and Goldsky

### Phase 2: Goldsky Subgraph Update (HIGH PRIORITY)
1. Add missing event handlers to `subgraph.yaml` (6 handlers)
2. Implement mapping functions in TypeScript:
   - `certificateManager.ts` - 4 new handlers
   - `courseLicense.ts` - 3 new handlers
3. Run `npm run codegen`
4. Run `npm run build`
5. Deploy updated subgraph

### Phase 3: Frontend Verification (MEDIUM PRIORITY)
1. Test each admin function on testnet
2. Verify events appear in Goldsky GraphQL endpoint
3. Update admin page to query and display event history
4. Create admin activity log component

### Phase 4: Documentation (LOW PRIORITY)
1. Document all admin events in API docs
2. Create admin events reference guide
3. Update deployment checklist

---

## 12. TESTING CHECKLIST

Before marking as complete, verify:

- [ ] All 14 admin functions emit events in smart contracts
- [ ] All 14 events appear in contract ABIs
- [ ] All 14 events tracked in `subgraph.yaml`
- [ ] All 14 mapping handlers implemented and tested
- [ ] Subgraph builds without errors
- [ ] Subgraph deploys successfully
- [ ] GraphQL queries return admin event data
- [ ] Admin page displays event history
- [ ] All functions tested on testnet
- [ ] All events verified in Goldsky explorer

---

## 13. CONCLUSION

**Current State:** INCOMPLETE
- ✅ Reader functions: 100% working (6/6)
- ⚠️ Writer functions: 35.7% fully tracked (5/14)
- ❌ Missing contract event: 1
- ⚠️ Missing Goldsky handlers: 8

**Immediate Action Required:**
1. Update CertificateManager smart contract (add TokenURIUpdated event)
2. Add 8 missing event handlers to Goldsky subgraph
3. Implement 7 new mapping functions
4. Redeploy contracts and subgraph
5. Verify end-to-end tracking

**Estimated Implementation Time:**
- Contract update: 30 minutes
- Goldsky mapping implementation: 2-3 hours
- Testing and verification: 1-2 hours
- **Total: 4-6 hours**

---

**Report Generated:** 2025-01-XX
**Next Review:** After Phase 1 & 2 implementation
**Sign-off Required:** Lead Developer + Smart Contract Auditor