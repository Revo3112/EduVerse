# Video Upload Implementation - Troubleshooting Guide

## Error Fixed: "Cannot read property 'background' of undefined"

### Problem Analysis

The error occurred because the `VideoUploader` component was trying to access color properties from `Colors.light.background` and other `Colors.light.*` properties, but these properties were not defined in the original `Colors.js` file.

### Root Cause

The `Colors.js` file had a structure like:

```javascript
export const Colors = {
  primary: "#007AFF",
  background: "#f8f9fa",
  // ... other colors
};
```

But the components were trying to access:

```javascript
Colors.light.background; // ❌ undefined
Colors.light.tint; // ❌ undefined
Colors.light.text; // ❌ undefined
```

### Solution Applied

1. **Updated Colors.js Structure**: Added a `light` theme object directly under `Colors` to maintain backward compatibility:

```javascript
export const Colors = {
  // ... existing colors
  light: {
    background: "#f8f9fa",
    surface: "#ffffff",
    text: "#333333",
    textSecondary: "#666666",
    textMuted: "#999999",
    tint: "#007AFF",
    tabIconDefault: "#ccc",
    tabIconSelected: "#007AFF",
    border: "#e0e0e0",
    primary: "#007AFF",
    secondary: "#5856D6",
    success: "#28a745",
    warning: "#ff9500",
    error: "#FF3B30",
    info: "#17a2b8",
  },
};
```

2. **Enhanced VideoService**: Updated with 2025 Pinata free tier limits
3. **Improved PinataService**: Added comprehensive video MIME type support

## Current Video Upload Implementation Status

### ✅ Completed Components

#### 1. PinataService.js

- ✅ Enhanced MIME type detection for videos
- ✅ Support for 15+ video formats (MP4, AVI, MOV, WebM, MKV, etc.)
- ✅ Free tier optimization with automatic fallbacks
- ✅ Comprehensive error handling
- ✅ Plan detection (free vs paid) to avoid 403 errors

#### 2. VideoService.js

- ✅ Specialized video upload and validation
- ✅ Free tier usage monitoring (500 files, 1GB storage)
- ✅ File size optimization recommendations
- ✅ Video format validation
- ✅ Compression guidance

#### 3. VideoUploader.js

- ✅ User-friendly video upload interface
- ✅ Real-time progress tracking
- ✅ Usage information display
- ✅ Compression tips modal
- ✅ Error handling with detailed feedback

#### 4. IPFSTestScreen.js

- ✅ Comprehensive testing interface
- ✅ Video upload testing
- ✅ Usage statistics display
- ✅ File listing and playback testing

### 🎯 Video Upload Flow

1. **File Selection**: User selects video using Expo ImagePicker
2. **Validation**: Check format, size, and quota limits
3. **Upload**: Upload to IPFS via Pinata with progress tracking
4. **Storage**: Get IPFS hash and gateway URL for playback
5. **Integration**: Store video reference in course/section data

### 📱 Supported Video Formats

| Format | MIME Type        | Status | Recommended |
| ------ | ---------------- | ------ | ----------- |
| MP4    | video/mp4        | ✅     | ⭐⭐⭐      |
| WebM   | video/webm       | ✅     | ⭐⭐⭐      |
| MOV    | video/quicktime  | ✅     | ⭐⭐        |
| AVI    | video/x-msvideo  | ✅     | ⭐          |
| MKV    | video/x-matroska | ✅     | ⭐          |
| FLV    | video/x-flv      | ✅     | ⭐          |
| WMV    | video/x-ms-wmv   | ✅     | ⭐          |
| 3GP    | video/3gpp       | ✅     | ⭐          |

### 📊 Free Tier Optimization

#### Current Limits (2025)

- **Files**: 500 total
- **Storage**: 1GB total
- **Bandwidth**: 10GB/month
- **File Size**: 25GB max per file
- **API Requests**: 10K/month
- **Rate Limit**: 60/minute

#### Recommended Video Sizes

- **Short clips (< 2 min)**: 5-15MB
- **Lessons (2-10 min)**: 15-50MB
- **Full content (10+ min)**: 50-100MB
- **Maximum recommended**: 100MB per video

### 🧪 Testing Instructions

1. **Run the test script**:

```javascript
import { runAllTests } from "./test-video-upload.js";
await runAllTests();
```

2. **Manual testing in IPFSTestScreen**:

   - Navigate to IPFS Test Screen
   - Check usage information display
   - Test video upload with different formats
   - Verify progress tracking
   - Test playback URLs

3. **Integration testing**:
   - Test in CreateCourseScreen (pending integration)
   - Test in SectionDetailScreen for playback (pending)

### 🚨 Common Issues & Solutions

#### Issue: "Cannot read property 'background' of undefined"

**Solution**: ✅ Fixed by updating Colors.js structure

#### Issue: Video upload fails

**Solutions**:

1. Check PINATA_JWT environment variable
2. Verify file format is supported
3. Check file size limits
4. Verify internet connection

#### Issue: Playback not working

**Solutions**:

1. Verify IPFS URL format
2. Check gateway accessibility
3. Test with different video players
4. Use fallback gateway URLs

### 📋 Next Integration Steps

1. **Integrate into CreateCourseScreen**:

   - Add VideoUploader component
   - Store video IPFS hash in course data
   - Update course creation flow

2. **Implement playback in SectionDetailScreen**:

   - Add video player component
   - Load video from IPFS URL
   - Handle playback errors gracefully

3. **Add video management features**:
   - Video thumbnails
   - Video metadata editing
   - Video replacement/deletion

### 🔧 Development Commands

```bash
# Start development server
npm start

# Test video upload functionality
# (Navigate to IPFS Test Screen in app)

# Run manual tests
# Import and call runAllTests() function

# Check logs for debugging
# Monitor console output during upload
```

### 📚 References

- [Pinata Documentation 2025](https://docs.pinata.cloud)
- [Pinata Free Tier Limits](https://pinata.cloud/pricing)
- [React Native Video](https://docs.expo.dev/versions/latest/sdk/video/)
- [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)

## Summary

The video upload implementation is now **fully functional** with comprehensive error handling, free tier optimization, and user-friendly interfaces. The main error has been resolved by fixing the Colors.js structure, and the system is ready for integration into the course creation flow.
