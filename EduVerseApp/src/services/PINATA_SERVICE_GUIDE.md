# Pinata Service v3 API Guide

## Overview

PinataService telah diperbarui untuk menggunakan Pinata v3 API dengan fitur-fitur terbaru dan optimasi untuk React Native. Service ini mendukung:

- Upload file ke IPFS dengan network public/private
- Signed URLs untuk akses file private
- Group management untuk mengorganisir file
- Bulk operations untuk efisiensi
- Auto-detection plan type (free/paid)
- Smart URL generation untuk optimal access

## Quick Start

### Basic File Upload

```javascript
import { pinataService } from "../services/PinataService";

// Upload file ke public network (recommended untuk course videos)
const result = await pinataService.uploadFile(file, {
  name: "my-video.mp4",
  network: "public", // atau 'private'
  keyValues: {
    course: "blockchain-101",
    type: "video",
  },
});

console.log("Upload successful:", result.success);
console.log("IPFS Hash:", result.ipfsHash);
console.log("Public URL:", result.publicUrl);
```

### Upload JSON Data

```javascript
const courseData = {
  title: "Blockchain Fundamentals",
  description: "Learn blockchain basics",
  lessons: ["intro", "wallet", "transactions"],
};

const result = await pinataService.uploadJson(courseData, {
  name: "course-metadata.json",
  network: "public",
});
```

## Network Types

### Public Network

- Files can be accessed directly via public gateway
- No signed URLs needed
- Perfect for course videos and public content
- Default for educational content

### Private Network

- Files require authentication to access
- Uses signed URLs for secure access
- Good for premium content or user data
- Requires paid Pinata plan for optimal experience

## Advanced Features

### Group Management

```javascript
// Create a public group for a course
const group = await pinataService.createPublicGroup("blockchain-course-videos");

// Upload files to the group
const uploadResult = await pinataService.uploadToPublicGroup(
  videoFile,
  group.groupId,
  {
    name: "lesson-1-intro.mp4",
  }
);

// Get all files in the group
const groupFiles = await pinataService.getPublicGroupFiles(group.groupId);
```

### File Search and Listing

```javascript
// List files with filters
const files = await pinataService.listFiles({
  network: "public",
  mimeType: "video/mp4",
  limit: 50,
  order: "DESC",
});

// Search files
const searchResults = await pinataService.searchFiles({
  name: "blockchain",
  mimeType: "video/mp4",
});

// Get all files with pagination
const allFiles = await pinataService.getAllFiles({
  network: "public",
  maxFiles: 1000,
});
```

### Bulk Operations

```javascript
// Delete multiple files
const fileIds = ["id1", "id2", "id3"];
const deleteResult = await pinataService.bulkDeleteFiles(fileIds, "private");

console.log(`Deleted ${deleteResult.successCount} files`);
console.log(`Failed ${deleteResult.errorCount} files`);
```

### Storage Statistics

```javascript
const stats = await pinataService.getStorageStats();

console.log("Total files:", stats.stats.totalFiles);
console.log("Total size:", stats.stats.totalSizeFormatted);
console.log("By network:", stats.stats.byNetwork);
console.log("By MIME type:", stats.stats.byMimeType);
```

## File Access URLs

### Smart URL Generation

```javascript
// Get optimal access URL (auto-detects network type)
const accessUrl = await pinataService.getFileAccessUrl(cid);

// Force public gateway
const publicUrl = pinataService.getPublicGatewayUrl(cid);

// Get video streaming URL (optimized for video playback)
const streamingUrl = await pinataService.getVideoStreamingUrl(cid);
```

### Signed URLs (Paid Plans)

```javascript
// Create signed URL for private file access
const signedUrlResult = await pinataService.createSignedUrl(cid, {
  expires: 3600, // 1 hour
  method: "GET",
});

console.log("Signed URL:", signedUrlResult.signedUrl);
console.log("Expires at:", signedUrlResult.expiresAt);
```

## Error Handling

```javascript
try {
  const result = await pinataService.uploadFile(file);
  if (result.success) {
    // Handle success
    console.log("File uploaded:", result.ipfsHash);
  } else {
    // Handle upload failure
    console.error("Upload failed:", result.error);
  }
} catch (error) {
  // Handle exception
  console.error("Exception:", error.message);
}
```

## Plan Detection

PinataService automatically detects your Pinata plan type:

```javascript
const planStatus = pinataService.getPlanStatus();

console.log("Plan type:", planStatus.planType); // 'free', 'paid', or 'unknown'
console.log("Free plan detected:", planStatus.freePlanDetected);
console.log("Has dedicated gateway:", !!planStatus.dedicatedGateway);
```

For free plans:

- Signed URLs are not available
- Service automatically falls back to public gateway
- All features work, but with public access only

## Health Check and Diagnostics

```javascript
// Comprehensive health check
const health = await pinataService.healthCheck();
console.log("Overall health:", health.overall); // 'healthy', 'warning', 'unhealthy'

// API key validation
const validation = pinataService.validateApiKey();
console.log("API key valid:", validation.isValid);

// Service configuration
const config = pinataService.getConfiguration();
console.log("Service config:", config);
```

## Best Practices

### For Educational Content (EduVerse)

1. **Use Public Network**: Upload course videos and materials to public network for easy access

```javascript
await pinataService.uploadFilePublic(videoFile, {
  name: "course-video.mp4",
  keyValues: {
    course: "blockchain-101",
    lesson: "1",
    type: "video",
  },
});
```

2. **Organize with Groups**: Create groups for each course

```javascript
const courseGroup = await pinataService.createPublicGroup("blockchain-course");
```

3. **Use Metadata**: Add rich metadata for better organization

```javascript
await pinataService.uploadFile(file, {
  keyValues: {
    course: "blockchain-101",
    instructor: "john-doe",
    difficulty: "beginner",
    duration: "15min",
  },
});
```

### Performance Optimization

1. **Batch Operations**: Use bulk operations for multiple files
2. **Pagination**: Use pagination for large file lists
3. **Caching**: Cache file URLs and metadata when possible
4. **Network Selection**: Choose appropriate network (public vs private)

## Environment Variables

Make sure these are set in your environment:

```
PINATA_JWT=your_pinata_jwt_token_here
PINATA_GATEWAY=your_dedicated_gateway (optional)
GATEWAY_KEY=your_gateway_key (optional)
```

For React Native, you might need to use:

```
REACT_NATIVE_PINATA_JWT=your_pinata_jwt_token_here
REACT_NATIVE_PINATA_GATEWAY=your_dedicated_gateway (optional)
REACT_NATIVE_GATEWAY_KEY=your_gateway_key (optional)
```

## Migration from Old API

If you're migrating from older Pinata API versions:

1. **Network Parameter**: Now required, defaults to 'public'
2. **Response Format**: New response structure with `data` object
3. **File IDs**: v3 API provides file IDs for better tracking
4. **Groups**: Enhanced group management
5. **Signed URLs**: New endpoint and format

## Support

For issues or questions:

1. Check the health check: `await pinataService.healthCheck()`
2. Validate API key: `pinataService.validateApiKey()`
3. Review configuration: `pinataService.getConfiguration()`
4. Check Pinata documentation: https://docs.pinata.cloud/
