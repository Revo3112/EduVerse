# EduVerse Pinata v3 IPFS Integration

## 🚀 Overview

EduVerse sekarang menggunakan Pinata v3 API untuk penyimpanan IPFS yang lebih efisien dan andal. Implementasi ini dirancang khusus untuk kebutuhan platform edukasi dengan optimasi untuk:

- 📹 Upload video course yang efisien
- 📄 Manajemen materi pembelajaran
- 🔗 Akses file yang mudah dan cepat
- 💰 Optimasi untuk free tier Pinata
- 📊 Monitoring penggunaan storage

## 📋 Fitur Utama

### ✅ Yang Sudah Diimplementasi

1. **File Upload dengan Pinata v3 API**

   - ✅ Upload ke public/private network
   - ✅ Auto-detection MIME type
   - ✅ Duplicate file handling
   - ✅ Progress tracking
   - ✅ Error handling yang robust

2. **Video Upload Khusus**

   - ✅ Validasi video format dan ukuran
   - ✅ Optimasi untuk free tier
   - ✅ Kompresi recommendations
   - ✅ Video streaming URL generation

3. **Group Management**

   - ✅ Create public/private groups
   - ✅ Upload files to groups
   - ✅ Batch operations
   - ✅ Group file listing

4. **Smart URL Generation**

   - ✅ Auto-detection network type
   - ✅ Signed URLs untuk paid plans
   - ✅ Fallback ke public gateway
   - ✅ Optimized video streaming URLs

5. **Advanced Features**

   - ✅ File search dan filtering
   - ✅ Pagination support
   - ✅ Bulk delete operations
   - ✅ Storage statistics
   - ✅ Health check dan diagnostics

6. **Plan Detection**
   - ✅ Auto-detect free vs paid plan
   - ✅ Feature adaptation berdasarkan plan
   - ✅ Graceful degradation untuk free tier

## 🛠️ Setup dan Konfigurasi

### 1. Environment Variables

Tambahkan ke `.env` file Anda:

```env
# Required
PINATA_JWT=your_pinata_jwt_token_here

# Optional (untuk paid plans)
PINATA_GATEWAY=your_dedicated_gateway.mypinata.cloud
GATEWAY_KEY=your_gateway_key

# Untuk React Native, gunakan prefix REACT_NATIVE_
REACT_NATIVE_PINATA_JWT=your_pinata_jwt_token_here
REACT_NATIVE_PINATA_GATEWAY=your_dedicated_gateway.mypinata.cloud
REACT_NATIVE_GATEWAY_KEY=your_gateway_key
```

### 2. Import Services

```javascript
import { pinataService } from "./src/services/PinataService";
import { videoService } from "./src/services/VideoService";
import EduVerseIPFSHelpers from "./src/services/EduVerseIPFSHelpers";
```

### 3. Basic Usage

```javascript
// Upload course video
const videoResult = await EduVerseIPFSHelpers.uploadCourseVideo(videoFile, {
  courseId: "blockchain-101",
  lessonId: "intro",
  title: "Introduction to Blockchain",
  instructor: "John Doe",
});

// Upload course material
const materialResult = await EduVerseIPFSHelpers.uploadCourseMaterial(
  pdfFile,
  {
    courseId: "blockchain-101",
    lessonId: "resources",
  },
  "document"
);
```

## 📁 File Structure

```
src/services/
├── PinataService.js              # Core Pinata v3 API service
├── VideoService.js               # Video-specific upload service
├── EduVerseIPFSHelpers.js        # EduVerse helper functions
├── PINATA_SERVICE_GUIDE.md       # Detailed API guide
└── PINATA_SERVICE_V3_CHANGELOG.md # Migration guide

src/components/
├── IPFSUploader.js               # General file uploader component
└── VideoUploader.js              # Video-specific uploader component

src/screens/
└── CourseUploadScreen.js         # Example implementation screen
```

## 🎯 Recommended Usage Patterns

### For Course Videos

```javascript
// Recommended: Upload sebagai PUBLIC untuk easy access
const result = await videoService.uploadVideoPublic(videoFile, {
  name: "lesson-1-intro.mp4",
  courseId: "blockchain-101",
  sectionId: "intro",
  metadata: {
    title: "Introduction to Blockchain",
    duration: "15 minutes",
    difficulty: "beginner",
  },
});

// Access URL tersedia langsung
const videoUrl = result.publicUrl;
```

### For Course Materials

```javascript
// Upload ke public network untuk easy sharing
const result = await pinataService.uploadFilePublic(pdfFile, {
  name: "blockchain-whitepaper.pdf",
  keyValues: {
    course: "blockchain-101",
    type: "reference",
    category: "document",
  },
});
```

### For Complete Course Creation

```javascript
// Create course dengan semua materials sekaligus
const courseResult = await EduVerseIPFSHelpers.createCourseWithMaterials(
  {
    courseId: "blockchain-101",
    title: "Blockchain Fundamentals",
    instructor: "John Doe",
  },
  [
    { file: videoFile1, materialType: "video", sectionId: "intro" },
    { file: pdfFile, materialType: "document", sectionId: "resources" },
    { file: imageFile, materialType: "image", sectionId: "diagrams" },
  ]
);
```

## 🔍 Monitoring dan Diagnostics

### Health Check

```javascript
const health = await EduVerseIPFSHelpers.checkEduVerseIPFSHealth();
console.log("IPFS Health:", health.overall); // 'healthy', 'warning', 'unhealthy'
```

### Storage Statistics

```javascript
const stats = await EduVerseIPFSHelpers.getEduVerseStorageStats();
console.log("Storage Usage:", stats.totalSizeFormatted);
console.log("Video Files:", stats.breakdown.videos.count);
```

### Configuration Check

```javascript
const config = pinataService.getConfiguration();
console.log("Plan Type:", config.plan.type);
console.log("Features:", config.features);
```

## 🎨 UI Components

### VideoUploader Component

```jsx
<VideoUploader
  onUploadComplete={(result) => {
    console.log("Video uploaded:", result.ipfsHash);
    // Handle successful upload
  }}
  onUploadError={(error) => {
    console.error("Upload failed:", error);
  }}
  courseId="blockchain-101"
  sectionId="intro"
  showUsageInfo={true}
/>
```

### IPFSUploader Component

```jsx
<IPFSUploader
  buttonText="Upload Course Material"
  accept="documents" // atau "images", "all"
  maxSizeBytes={25 * 1024 * 1024} // 25MB
  onUploadComplete={(result) => {
    console.log("File uploaded:", result.ipfsHash);
  }}
  network="public"
  keyValues={{
    course: "blockchain-101",
    type: "material",
  }}
/>
```

## 🔧 Plan Compatibility

### Free Plan (Default)

- ✅ File upload ke public/private network
- ✅ File listing dan search
- ✅ Group management
- ✅ Basic file operations
- ❌ Signed URLs (auto-fallback ke public gateway)
- ❌ Dedicated gateway

### Paid Plan

- ✅ Semua fitur free plan
- ✅ Signed URLs untuk private access
- ✅ Dedicated gateway (faster loading)
- ✅ Advanced analytics
- ✅ Priority support

Service secara otomatis mendeteksi plan type dan menyesuaikan fitur yang tersedia.

## 🚨 Error Handling

Service menggunakan comprehensive error handling:

```javascript
try {
  const result = await pinataService.uploadFile(file);
  if (result.success) {
    // Handle success
  } else {
    // Handle upload failure
    console.error("Upload failed:", result.error);
  }
} catch (error) {
  // Handle exceptions
  if (error.message.includes("Network request failed")) {
    // Network issue
  } else if (error.message.includes("JWT")) {
    // Authentication issue
  } else if (error.message.includes("403")) {
    // Permission issue (possibly free plan limitation)
  }
}
```

## 📊 Performance Optimizations

1. **Smart Network Selection**: Auto-pilih public network untuk content yang akan dibagikan
2. **Batch Operations**: Gunakan bulk operations untuk multiple files
3. **Pagination**: Implement pagination untuk large file lists
4. **Caching**: Cache file URLs dan metadata
5. **Progress Tracking**: Real-time upload progress
6. **Error Recovery**: Automatic retry dengan exponential backoff

## 🔐 Security Considerations

1. **API Key Protection**: Simpan PINATA_JWT dengan aman
2. **Network Selection**: Gunakan private network untuk sensitive data
3. **Access Control**: Implementasikan proper authentication di app
4. **Input Validation**: Validate file types dan sizes sebelum upload
5. **Error Sanitization**: Jangan expose internal errors ke users

## 🚀 Migration Guide

Jika migrasi dari Pinata v2 atau service lain:

### Perubahan Major

1. **Network Parameter**: Sekarang required (`public` atau `private`)
2. **Response Format**: New structure dengan `data` object
3. **File IDs**: v3 API provides unique file IDs
4. **Signed URLs**: New endpoint dan format
5. **Group Management**: Enhanced dengan public/private groups

### Breaking Changes

- `pinataOptions` dan `pinataMetadata` diganti dengan `network`, `keyValues`, dan `metadata`
- Response structure berubah dari flat object ke nested `data` object
- Signed URL API endpoint dan payload format berubah

### Migration Steps

1. Update environment variables
2. Replace old service imports
3. Update upload method calls
4. Handle new response format
5. Test semua existing functionality

## 📝 TODO & Future Enhancements

### Planned Features

- [ ] Video compression integration
- [ ] Thumbnail generation
- [ ] Batch upload dengan progress untuk multiple files
- [ ] Advanced search dengan full-text indexing
- [ ] File versioning system
- [ ] Automatic backup ke multiple providers
- [ ] CDN integration untuk faster delivery
- [ ] Analytics dashboard

### Known Issues

- [ ] Large file upload (>100MB) bisa timeout di connection lambat
- [ ] Video preview tidak otomatis generate thumbnail
- [ ] Batch operations belum optimal untuk very large datasets

## 📞 Support

### Troubleshooting

1. Jalankan health check: `await pinataService.healthCheck()`
2. Validate API key: `pinataService.validateApiKey()`
3. Check configuration: `pinataService.getConfiguration()`
4. Review Pinata documentation: https://docs.pinata.cloud/

### Common Issues

**"Network request failed"**

- Check internet connection
- Validate PINATA_JWT
- Check file size limits

**"JWT token invalid"**

- Regenerate API key di Pinata dashboard
- Check environment variable spelling

**"File too large"**

- Use video compression
- Check free tier limits
- Consider upgrading plan

### Getting Help

- Check console logs untuk detailed errors
- Use built-in debugging methods
- Review service documentation
- Contact Pinata support untuk API issues

---

## 📄 License

MIT License - lihat file LICENSE untuk details.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork repository
2. Create feature branch
3. Test thoroughly
4. Submit pull request

---

**Happy coding! 🚀**
