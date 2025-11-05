# Edit Course Workflow - Quick Reference

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EDIT COURSE PAGE                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. LOAD EXISTING COURSE DATA                                       │
│     • Query Goldsky: GET_COURSE_DETAILS                             │
│     • Verify creator authorization                                  │
│     • Initialize form state & draft sections                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. USER MAKES CHANGES (Draft Mode)                                 │
│                                                                      │
│  ┌────────────────────────┐  ┌────────────────────────┐            │
│  │  Edit Metadata         │  │  Manage Sections       │            │
│  │  • Title               │  │  • Add new section     │            │
│  │  • Description         │  │  • Edit section        │            │
│  │  • Thumbnail           │  │  • Delete section      │            │
│  │  • Category/Difficulty │  │  • Reorder sections    │            │
│  │  • Price               │  │                        │            │
│  └────────────────────────┘  └────────────────────────┘            │
│                                                                      │
│  State Updates:                                                     │
│  • hasChanges = true                                                │
│  • hasSectionChanges = true                                         │
│  • pendingChanges tracks operations                                 │
│  • draftSections mirrors visible state                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. VIDEO UPLOAD (Non-Blocking)                                     │
│                                                                      │
│  User selects video → uploadVideoToLivepeer(file, sectionId)       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  TUS Upload to Livepeer                                     │   │
│  │  • POST /api/livepeer/upload → get TUS endpoint             │   │
│  │  • tus-js-client uploads file                               │   │
│  │  • onProgress: update videoUploadProgress                   │   │
│  │  • onSuccess: return assetId immediately ✅                 │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│                          ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Store Asset in uploadingAssets Map                         │   │
│  │  {                                                           │   │
│  │    assetId: "xxx",                                          │   │
│  │    status: "processing",  ← Initial status                  │   │
│  │    sectionId: "draft-123"                                   │   │
│  │  }                                                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│                          ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Background Polling (useEffect)                             │   │
│  │  Every 5 seconds:                                           │   │
│  │  • GET /api/livepeer/asset/[assetId]                        │   │
│  │  • Check data.storage.ipfs.cid                              │   │
│  │  • Update status: processing → ready                        │   │
│  │  • Store cid in uploadingAssets                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  UI Shows:                                                          │
│  • 📤 Uploading... (during TUS upload)                              │
│  • 🔄 Processing... (Livepeer transcoding)                          │
│  • ✅ Ready (CID available)                                         │
│  • ❌ Failed (requires re-upload)                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. CLICK "UPDATE COURSE" BUTTON                                    │
│                                                                      │
│  Pre-flight Validation:                                             │
│  ✓ Form validation (lengths, required fields)                       │
│  ✓ Check all videos ready (not processing/failed)                   │
│  ✓ No asset in "uploading" or "processing" state                    │
│                                                                      │
│  If validation passes → handleSubmit()                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. THUMBNAIL UPLOAD (if changed)                                   │
│                                                                      │
│  POST /api/upload-thumbnail → Pinata                                │
│  Returns: { cid: "Qm..." }                                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. COMMIT METADATA (commitAllChanges)                              │
│                                                                      │
│  Transaction: prepareUpdateCourseTransaction()                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ CourseFactory.updateCourse(                                   │ │
│  │   courseId,                                                    │ │
│  │   {                                                            │ │
│  │     title,                                                     │ │
│  │     description,                                               │ │
│  │     thumbnailCID,                                              │ │
│  │     creatorName,                                               │ │
│  │     category,    ← Converted to enum                           │ │
│  │     difficulty   ← Converted to enum                           │ │
│  │   },                                                           │ │
│  │   pricePerMonth, ← Converted to Wei                            │ │
│  │   isActive                                                     │ │
│  │ )                                                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  via thirdweb: sendTransaction(courseTransaction)                   │
│                                                                      │
│  Event Emitted: CourseUpdated                                       │
│  Goldsky Indexes: handleCourseUpdated() updates Course entity       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                       onSuccess  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. COMMIT SECTION CHANGES (commitSectionChanges)                   │
│                                                                      │
│  Sequential Operations (500ms delay between each):                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ A) DELETE SECTIONS                                           │  │
│  │    For each sectionId in sectionsToDelete:                   │  │
│  │    • prepareDeleteSectionTransaction(courseId, sectionId)    │  │
│  │    • sendTransaction()                                        │  │
│  │    • Event: SectionDeleted                                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│                          ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ B) UPDATE SECTIONS                                           │  │
│  │    For each [sectionId, data] in sectionsToUpdate:          │  │
│  │    • Get final CID from uploadingAssets or fallback          │  │
│  │    • prepareUpdateSectionTransaction(                        │  │
│  │        courseId, sectionId, title, contentCID, duration      │  │
│  │      )                                                        │  │
│  │    • sendTransaction()                                        │  │
│  │    • Event: SectionUpdated                                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│                          ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ C) ADD NEW SECTIONS                                          │  │
│  │    For each sectionData in sectionsToAdd:                    │  │
│  │    • Get final CID from uploadingAssets or fallback          │  │
│  │    • prepareAddSectionTransaction(                           │  │
│  │        courseId, title, contentCID, duration                 │  │
│  │      )                                                        │  │
│  │    • sendTransaction()                                        │  │
│  │    • Event: SectionAdded                                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  All operations complete → finalizeSectionCommit()                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. FINALIZE & SYNC                                                 │
│                                                                      │
│  • Wait 2 seconds (for Goldsky to index events)                     │
│  • loadCourseData() - refetch from Goldsky                          │
│  • router.push("/myCourse")                                         │
│                                                                      │
│  Toast: "All changes committed successfully!"                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GOLDSKY INDEXER UPDATES                                            │
│                                                                      │
│  Events → Handlers → Entities Updated:                              │
│  • CourseUpdated → handleCourseUpdated() → Course                   │
│  • SectionAdded → handleSectionAdded() → CourseSection              │
│  • SectionUpdated → handleSectionUpdated() → CourseSection          │
│  • SectionDeleted → handleSectionDeleted() → CourseSection          │
└─────────────────────────────────────────────────────────────────────┘
```

## 📊 State Management Reference

### Draft Section Tracking
```typescript
draftSections: DraftSection[] = [
  {
    id: "existing-1",
    sectionId: "0",
    title: "Intro",
    contentCID: "Qm...",
    isModified: false,  // No changes
    ...
  },
  {
    id: "existing-2",
    sectionId: "1",
    title: "Chapter 1 Updated",
    contentCID: "Qm...",
    isModified: true,   // User edited ✏️
    ...
  },
  {
    id: "draft-1234567890",
    sectionId: "0",
    title: "New Section",
    contentCID: "",
    isNew: true,        // User added ➕
    ...
  }
]
```

### Pending Changes Tracking
```typescript
pendingChanges = {
  sectionsToAdd: [
    { title: "New Section", contentCID: "Qm...", duration: 600 }
  ],
  sectionsToUpdate: Map {
    "existing-2" => { title: "Chapter 1 Updated", contentCID: "Qm...", duration: 300 }
  },
  sectionsToDelete: Set { "existing-5" },
  reorderNeeded: false
}
```

### Asset State Tracking
```typescript
uploadingAssets: Map<string, AssetInfo> = Map {
  "draft-1234567890" => {
    assetId: "abc123",
    status: "processing",  // or "uploading", "ready", "failed"
    sectionId: "draft-1234567890",
    cid: undefined         // populated when ready
  }
}
```

## 🔗 Smart Contract Functions Flow

```
CourseFactory.sol
├── updateCourse()           ← Step 6: Metadata commit
├── deleteCourseSection()    ← Step 7A: Delete ops
├── updateCourseSection()    ← Step 7B: Update ops
└── addCourseSection()       ← Step 7C: Add ops
```

## 🎯 Key Features

✅ **Non-Blocking**: Video uploads don't freeze UI
✅ **Background Processing**: Assets process while user continues working
✅ **Draft Mode**: All changes local until explicit commit
✅ **Sequential Commits**: Proper transaction ordering
✅ **Status Indicators**: Clear visual feedback for all states
✅ **Validation Gates**: Can't save with processing videos
✅ **CID Resolution**: Smart fallback for asset CIDs
✅ **Goldsky Sync**: Authoritative refetch after commit

## 🚫 Validation Blocks

Save button disabled when:
- Form validation fails
- Any asset status = "uploading" or "processing"
- Any asset status = "failed"
- No changes detected (hasChanges && hasSectionChanges both false)
- Transaction already in progress (isSending)

## 🎨 UI Indicators

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| NEW | Badge | Green | Newly added section |
| MODIFIED | Badge | Amber | Edited existing section |
| 📤 Uploading | Spinner | Amber | TUS upload in progress |
| 🔄 Processing | Spinner | Blue | Livepeer transcoding |
| ✅ Ready | Check | Green | CID available for commit |
| ❌ Failed | X | Red | Processing error |

## 🔧 Service Dependencies

```
Edit Page
├── thirdweb SDK (Write)
│   ├── useActiveAccount()
│   ├── useSendTransaction()
│   └── sendTransaction()
├── Goldsky (Read)
│   ├── executeQuery()
│   └── GET_COURSE_DETAILS
├── Livepeer (Video)
│   ├── POST /api/livepeer/upload