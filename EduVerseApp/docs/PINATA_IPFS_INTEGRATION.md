# Pinata IPFS Integration Guide

## Overview

This guide explains how to use the Pinata IPFS integration in the EduVerse app. The integration provides a production-ready solution for uploading files and JSON data to IPFS via the Pinata service, with proper error handling, progress tracking, and React Native compatibility.

## Features

- ✅ **Production-ready**: Uses the latest Pinata API with JWT authentication
- ✅ **React Native compatible**: Uses fetch/FormData instead of Node.js-only modules
- ✅ **Progress tracking**: Real-time upload progress with callbacks
- ✅ **Error handling**: Comprehensive error handling with retries
- ✅ **File validation**: Size and type validation before upload
- ✅ **Metadata support**: Custom metadata and searchable key-value pairs
- ✅ **Multiple file types**: Support for images, documents, and JSON data
- ✅ **Environment variables**: Secure API key management
- ✅ **No breaking dependencies**: Works with existing Expo/React Native setup

## Setup

### 1. Environment Variables

The following environment variables are configured in `.env`:

```properties
# Pinata Configuration
PINATA_JWT=your_jwt_token_here
PINATA_GATEWAY=your-gateway-subdomain.mypinata.cloud
```

### 2. Dependencies

Required dependencies (already installed):

- `expo-document-picker`: For file selection
- `expo-image-picker`: For image capture/selection
- `react-native-dotenv`: For environment variable access

No additional dependencies were added to maintain compatibility.

## Components

### 1. PinataService (`src/services/PinataService.js`)

Core service for IPFS operations using the Pinata API.

#### Key Methods:

```javascript
import { pinataService } from "../services/PinataService";

// Upload a file
const result = await pinataService.uploadFile(file, {
  name: "my-file.jpg",
  metadata: { description: "My file" },
  keyValues: [{ key: "category", value: "image" }],
  onProgress: (percent) => console.log(`${percent}% uploaded`),
});

// Upload JSON data
const jsonResult = await pinataService.uploadJSON(data, {
  name: "data.json",
  metadata: { description: "JSON data" },
});

// Get file URL
const url = pinataService.getFileUrl("QmHash...");

// Test connection
const status = await pinataService.testConnection();
```

### 2. IPFSUploader Component (`src/components/IPFSUploader.js`)

Reusable UI component for file uploads with progress tracking.

#### Usage:

```javascript
import { IPFSUploader } from "../components/IPFSUploader";

<IPFSUploader
  onUploadComplete={(result) => {
    console.log("Upload complete:", result);
    // result.ipfsHash, result.gatewayUrl, etc.
  }}
  accept="images" // 'images', 'documents', 'all'
  maxSizeBytes={5 * 1024 * 1024} // 5MB
  buttonText="Upload Image"
  metadata={{
    description: "Course thumbnail",
    category: "image",
  }}
  keyValues={[
    { key: "type", value: "thumbnail" },
    { key: "course", value: courseId },
  ]}
/>;
```

#### Props:

- `onUploadComplete`: Callback when upload finishes
- `onUploadStart`: Callback when upload starts
- `onUploadProgress`: Progress callback (percentage)
- `accept`: File types ('images', 'documents', 'all')
- `maxSizeBytes`: Maximum file size in bytes
- `buttonText`: Custom button text
- `metadata`: Custom metadata object
- `keyValues`: Array of searchable key-value pairs
- `disabled`: Disable the upload button

### 3. useIPFSJsonUpload Hook

Hook for uploading JSON data.

#### Usage:

```javascript
import { useIPFSJsonUpload } from "../components/IPFSUploader";

const { uploadJson, uploading } = useIPFSJsonUpload();

const handleUpload = async () => {
  try {
    const result = await uploadJson(data, {
      name: "course-data.json",
      description: "Course metadata",
    });
    console.log("JSON uploaded:", result.ipfsHash);
  } catch (error) {
    console.error("Upload failed:", error);
  }
};
```

## Integration Examples

### 1. Course Thumbnail Upload (CreateCourseScreen)

The `CreateCourseScreen` has been updated to include IPFS upload for course thumbnails:

```javascript
const handleThumbnailUpload = (result) => {
  if (result.success) {
    // Automatically set the IPFS hash as thumbnail URI
    handleInputChange("thumbnailURI", `ipfs://${result.ipfsHash}`);
    Alert.alert("Success", "Thumbnail uploaded to IPFS successfully!");
  }
};

// In render:
<IPFSUploader
  onUploadComplete={handleThumbnailUpload}
  accept="images"
  buttonText="📸 Upload Thumbnail to IPFS"
  maxSizeBytes={5 * 1024 * 1024}
  metadata={{
    description: "Course thumbnail image",
    category: "thumbnail",
  }}
/>;
```

### 2. Testing Screen (IPFSTestScreen)

A comprehensive test screen is available at `Settings > IPFS Test` for:

- Testing Pinata connection
- Uploading files and images
- Uploading JSON data
- Viewing uploaded files
- Listing pinned files

## API Reference

### PinataService Methods

#### `uploadFile(file, options)`

Uploads a file to IPFS via Pinata.

**Parameters:**

- `file`: File or Blob object
- `options.name`: Custom filename
- `options.metadata`: Metadata object
- `options.keyValues`: Array of {key, value} pairs
- `options.onProgress`: Progress callback function

**Returns:** Promise with upload result

#### `uploadJSON(data, options)`

Uploads JSON data to IPFS.

**Parameters:**

- `data`: JSON object
- `options.name`: Custom filename
- `options.metadata`: Metadata object
- `options.keyValues`: Array of {key, value} pairs

**Returns:** Promise with upload result

#### `getFileUrl(ipfsHash, useCustomGateway)`

Gets the URL for an IPFS file.

**Parameters:**

- `ipfsHash`: IPFS hash (with or without ipfs:// prefix)
- `useCustomGateway`: Use custom gateway (default: true)

**Returns:** File URL string

#### `listFiles(filters)`

Lists pinned files with optional filters.

**Parameters:**

- `filters.status`: Pin status
- `filters.pageLimit`: Results limit
- `filters.metadata`: Metadata filters

**Returns:** Promise with files list

#### `testConnection()`

Tests the Pinata API connection.

**Returns:** Promise with connection status

## Error Handling

The service includes comprehensive error handling:

```javascript
const result = await pinataService.uploadFile(file);

if (result.success) {
  // Upload successful
  console.log("IPFS Hash:", result.ipfsHash);
  console.log("Gateway URL:", result.gatewayUrl);
} else {
  // Upload failed
  console.error("Error:", result.error);
  Alert.alert("Upload Failed", result.error);
}
```

## Security Best Practices

1. **Environment Variables**: API keys are stored in environment variables
2. **JWT Authentication**: Uses secure JWT tokens instead of API keys
3. **File Validation**: Validates file size and type before upload
4. **Error Handling**: Proper error handling without exposing sensitive data

## Troubleshooting

### Common Issues:

1. **"Pinata JWT not configured"**

   - Check that `PINATA_JWT` is set in `.env`
   - Restart the Expo development server after changing `.env`

2. **Upload fails with 401 Unauthorized**

   - Verify JWT token is valid and not expired
   - Check Pinata API key permissions

3. **File too large errors**

   - Check `maxSizeBytes` setting
   - Verify Pinata account limits

4. **Progress not updating**
   - Ensure `onProgress` callback is provided
   - Check that XMLHttpRequest is supported in environment

### Debug Mode:

Access the IPFS Test screen via `Settings > IPFS Test` to:

- Test API connection
- Upload test files
- View console logs
- Verify configuration

## Performance Considerations

1. **File Size Limits**: Set appropriate `maxSizeBytes` for your use case
2. **Progress Tracking**: Use progress callbacks for better UX on large files
3. **Caching**: Consider caching IPFS URLs for better performance
4. **Retry Logic**: The service includes automatic retry logic for network failures

## Next Steps

1. **Integrate with Smart Contracts**: Use IPFS hashes in course creation
2. **Implement Caching**: Cache uploaded files for offline access
3. **Add Image Optimization**: Compress images before upload
4. **Batch Uploads**: Support multiple file uploads
5. **Background Uploads**: Support background file uploads

## Support

For issues with the Pinata integration:

1. Check the IPFS Test screen for connection status
2. Review console logs for detailed error messages
3. Verify environment variables are correctly set
4. Test with small files first before uploading larger content
