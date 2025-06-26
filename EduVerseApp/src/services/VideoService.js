/**
 * VideoService.js - Video Upload & Management Service
 * Service khusus untuk menangani video upload dan management di IPFS Pinata
 * Optimized untuk React Native dan free tier Pinata
 */

import { pinataService } from "./PinataService";

class VideoService {
  constructor() {
    this.pinataService = pinataService;

    // Free tier limits - Updated for 2025
    this.FREE_TIER_LIMITS = {
      maxFiles: 500,
      maxStorage: 1024 * 1024 * 1024, // 1GB
      maxBandwidth: 10 * 1024 * 1024 * 1024, // 10GB/month
      maxFileSize: 25 * 1024 * 1024 * 1024, // 25GB per file (Pinata limit)
      maxRequests: 10000, // per month
      rateLimit: 60, // per minute
      resumableThreshold: 100 * 1024 * 1024, // 100MB - auto resumable upload
    };

    // Video optimization settings
    this.VIDEO_SETTINGS = {
      // Recommended file sizes for free tier
      small: 10 * 1024 * 1024, // 10MB - short clips
      medium: 25 * 1024 * 1024, // 25MB - lessons
      large: 50 * 1024 * 1024, // 50MB - full content
      maxRecommended: 100 * 1024 * 1024, // 100MB - absolute max for free tier

      // Supported formats (prioritized by efficiency)
      supportedFormats: [
        "video/mp4", // Most efficient, widely supported
        "video/webm", // Good compression, web-optimized
        "video/quicktime", // MOV format
        "video/x-msvideo", // AVI format
        "video/x-matroska", // MKV format
        "video/x-flv", // FLV format
        "video/x-ms-wmv", // WMV format
        "video/3gpp", // 3GP format
        "video/ogg", // OGG video
        "video/x-m4v", // M4V format
        "video/x-f4v", // F4V format
        "video/x-ms-asf", // ASF format
        "video/vnd.rn-realvideo", // RealVideo formats
        "video/x-ms-vob", // VOB format
      ],

      // Recommended encoding settings
      encoding: {
        format: "MP4",
        codec: "H.264",
        resolution: {
          mobile: "480p (854x480)",
          standard: "720p (1280x720)",
          hd: "1080p (1920x1080)",
        },
        frameRate: "30fps",
        bitrate: {
          low: "500-1000 kbps",
          medium: "1000-2000 kbps",
          high: "2000-4000 kbps",
        },
        audio: "AAC 128kbps",
      },
    };

    console.log("VideoService initialized with free tier optimization");
  }

  /**
   * Validate video file for upload - ENHANCED FOR MIME TYPE DETECTION
   */
  validateVideo(videoFile) {
    console.log("Validating video file:", videoFile?.name);
    console.log("Original file data:", videoFile);

    if (!videoFile) {
      return {
        isValid: false,
        error: "File video diperlukan",
        code: "MISSING_FILE",
      };
    }

    // Check file name
    if (!videoFile.name || videoFile.name.trim() === "") {
      return {
        isValid: false,
        error: "Nama file video diperlukan",
        code: "MISSING_NAME",
      };
    }

    // ENHANCED: Detect MIME type with fallback for generic "video" type
    let mimeType = videoFile.type;
    const fileName = videoFile.name;

    // Handle generic "video" type or missing type
    if (!mimeType || mimeType === "video" || !mimeType.startsWith("video/")) {
      mimeType = this.detectMimeTypeFromFileName(fileName);
      console.log(
        `Corrected MIME type from "${videoFile.type}" to "${mimeType}" for file: ${fileName}`
      );
    }

    console.log(`Final MIME type for validation: ${mimeType}`);

    // Check if MIME type is supported
    if (!this.VIDEO_SETTINGS.supportedFormats.includes(mimeType)) {
      console.log("Supported formats:", this.VIDEO_SETTINGS.supportedFormats);
      return {
        isValid: false,
        error: `Format video tidak didukung: ${mimeType}. Gunakan: ${this.VIDEO_SETTINGS.supportedFormats
          .map((f) => f.split("/")[1].toUpperCase())
          .join(", ")}`,
        code: "UNSUPPORTED_FORMAT",
        detectedMimeType: mimeType,
        originalType: videoFile.type,
        supportedFormats: this.VIDEO_SETTINGS.supportedFormats,
      };
    }

    // Check file size
    const fileSize = videoFile.size || 0;
    if (fileSize === 0) {
      return {
        isValid: false,
        error: "File video kosong atau tidak valid",
        code: "EMPTY_FILE",
      };
    }

    if (fileSize > this.VIDEO_SETTINGS.maxRecommended) {
      return {
        isValid: false,
        error: `Video terlalu besar (${this.formatFileSize(
          fileSize
        )}). Maksimal direkomendasikan: ${this.formatFileSize(
          this.VIDEO_SETTINGS.maxRecommended
        )} untuk free plan.`,
        code: "FILE_TOO_LARGE",
        currentSize: fileSize,
        maxSize: this.VIDEO_SETTINGS.maxRecommended,
        compressionRequired: true,
      };
    }

    // Generate warnings for large files
    const warnings = [];
    if (fileSize > this.VIDEO_SETTINGS.large) {
      warnings.push(
        `File berukuran besar (${this.formatFileSize(
          fileSize
        )}). Upload mungkin memakan waktu lama.`
      );
    }

    if (fileSize > this.VIDEO_SETTINGS.medium) {
      warnings.push(
        "Pertimbangkan kompresi untuk menghemat storage dan bandwidth."
      );
    }

    return {
      isValid: true,
      fileSize: fileSize,
      formattedSize: this.formatFileSize(fileSize),
      mimeType: mimeType,
      warnings: warnings,
      isLargeFile: fileSize > this.VIDEO_SETTINGS.medium,
      compressionRecommended: fileSize > this.VIDEO_SETTINGS.large,
    };
  }

  /**
   * Check if video upload is possible within free tier limits
   */
  async canUploadVideo(videoSize) {
    try {
      console.log(
        "Checking upload capacity for video size:",
        this.formatFileSize(videoSize)
      );

      // Get current usage
      const usage = await this.getCurrentUsage();

      const afterUpload = {
        files: usage.files.used + 1,
        storage: usage.storage.used + videoSize,
      };

      const result = {
        possible: true,
        warnings: [],
        afterUpload: {
          files: afterUpload.files,
          storage: afterUpload.storage,
          storageFormatted: this.formatFileSize(afterUpload.storage),
        },
        usage: usage,
      };

      // Check file limit
      if (afterUpload.files > this.FREE_TIER_LIMITS.maxFiles) {
        result.possible = false;
        result.warnings.push(
          `Akan melebihi limit file (${afterUpload.files}/${this.FREE_TIER_LIMITS.maxFiles})`
        );
      }

      // Check storage limit
      if (afterUpload.storage > this.FREE_TIER_LIMITS.maxStorage) {
        result.possible = false;
        result.warnings.push(
          `Akan melebihi limit storage (${this.formatFileSize(
            afterUpload.storage
          )}/${this.formatFileSize(this.FREE_TIER_LIMITS.maxStorage)})`
        );
      }

      // Generate warnings for approaching limits
      const storagePercent =
        (afterUpload.storage / this.FREE_TIER_LIMITS.maxStorage) * 100;
      const filesPercent =
        (afterUpload.files / this.FREE_TIER_LIMITS.maxFiles) * 100;

      if (storagePercent > 80 && result.possible) {
        result.warnings.push(
          `Setelah upload, storage akan ${storagePercent.toFixed(1)}% penuh`
        );
      }

      if (filesPercent > 80 && result.possible) {
        result.warnings.push(
          `Setelah upload, file count akan ${filesPercent.toFixed(
            1
          )}% dari limit`
        );
      }

      // Add recommendations if approaching limits
      if (storagePercent > 70) {
        result.recommendations = [
          "Pertimbangkan kompresi video sebelum upload",
          "Hapus video lama yang tidak terpakai",
          "Gunakan resolusi 720p instead of 1080p",
        ];
      }

      console.log("Upload capacity check completed:", {
        possible: result.possible,
        warnings: result.warnings.length,
        storageAfter: result.afterUpload.storageFormatted,
      });

      return result;
    } catch (error) {
      console.error("Failed to check upload capacity:", error);
      return {
        possible: true, // Default to allowing if check fails
        warnings: ["Tidak dapat memeriksa kapasitas. Upload dengan hati-hati."],
        error: error.message,
      };
    }
  }

  /**
   * Upload video to IPFS with optimizations
   */
  async uploadVideo(videoFile, options = {}) {
    try {
      console.log("=== VIDEO UPLOAD START ===");
      console.log(
        "Original File:",
        videoFile?.name,
        "Type:",
        videoFile?.type,
        "Size:",
        this.formatFileSize(videoFile?.size || 0)
      );

      // Validate video first (this will also correct the MIME type)
      const validation = this.validateVideo(videoFile);
      if (!validation.isValid) {
        console.error("Video validation failed:", validation);
        throw new Error(validation.error);
      }

      console.log("Video validation passed:", {
        detectedMimeType: validation.mimeType,
        originalType: videoFile.type,
        fileSize: validation.formattedSize,
      });

      // Create a corrected file object with proper MIME type
      const correctedVideoFile = {
        ...videoFile,
        type: validation.mimeType, // Use the validated/corrected MIME type
      };

      console.log("Corrected video file object:", correctedVideoFile);

      // Check upload capacity
      const capacityCheck = await this.canUploadVideo(videoFile.size);
      if (!capacityCheck.possible) {
        throw new Error(
          `Upload tidak memungkinkan: ${capacityCheck.warnings.join(", ")}`
        );
      }

      const {
        name,
        courseId,
        sectionId,
        metadata = {},
        keyValues = {},
        onProgress,
        network = "public", // CHANGED: Default to PUBLIC for better accessibility
      } = options;

      // Prepare video-specific metadata
      const videoMetadata = {
        ...metadata,
        type: "video",
        contentType: "course-video",
        originalSize: videoFile.size,
        formattedSize: validation.formattedSize,
        mimeType: validation.mimeType,
        courseId: courseId,
        sectionId: sectionId,
        uploadedAt: new Date().toISOString(),
        app: "EduVerse",
        freeTierOptimized: true,
      };

      // Prepare video-specific key values
      const videoKeyValues = {
        ...keyValues,
        type: "video",
        category: "education",
        platform: "react-native",
        courseId: courseId || "unknown",
        sectionId: sectionId || "unknown",
      };

      console.log("Starting video upload with metadata:", videoMetadata);

      // Upload using enhanced PinataService with corrected MIME type
      const result = await this.pinataService.uploadFile(correctedVideoFile, {
        name: name || videoFile.name,
        network: network,
        metadata: videoMetadata,
        keyValues: videoKeyValues,
      });

      // Enhance result with video-specific data
      result.videoInfo = {
        originalSize: videoFile.size,
        formattedSize: validation.formattedSize,
        mimeType: validation.mimeType,
        isLargeFile: validation.isLargeFile,
        warnings: validation.warnings,
        compressionRecommended: validation.compressionRecommended,
      };

      result.urls = {
        ipfs: `ipfs://${result.ipfsHash}`,
        gateway: result.publicUrl,
        streaming: result.publicUrl,
      };

      console.log("=== VIDEO UPLOAD COMPLETED ===");
      console.log("CID:", result.ipfsHash);
      console.log("Gateway URL:", result.publicUrl);
      console.log("Video Info:", result.videoInfo);

      return result;
    } catch (error) {
      console.error("Video upload failed:", error);
      throw new Error(`Video upload gagal: ${error.message}`);
    }
  }

  /**
   * Upload video to IPFS with PUBLIC access (recommended for course videos)
   */
  async uploadVideoPublic(videoFile, options = {}) {
    console.log("🌐 Uploading video with PUBLIC access for easy sharing...");

    return await this.uploadVideo(videoFile, {
      ...options,
      network: "public", // Force public network
    });
  }

  /**
   * Get current usage statistics
   */
  async getCurrentUsage() {
    try {
      console.log("Getting current usage statistics...");

      // Get files from Pinata
      const filesResponse = await this.pinataService.listFiles({
        limit: this.FREE_TIER_LIMITS.maxFiles,
      });

      const files = filesResponse.files || [];

      // Calculate totals
      const totalStorage = files.reduce(
        (sum, file) => sum + (file.size || 0),
        0
      );
      const videoFiles = files.filter(
        (file) => file.mime_type && file.mime_type.startsWith("video/")
      );
      const videoStorage = videoFiles.reduce(
        (sum, file) => sum + (file.size || 0),
        0
      );

      const usage = {
        files: {
          used: files.length,
          limit: this.FREE_TIER_LIMITS.maxFiles,
          remaining: this.FREE_TIER_LIMITS.maxFiles - files.length,
          usedPercent: (files.length / this.FREE_TIER_LIMITS.maxFiles) * 100,
        },
        storage: {
          used: totalStorage,
          usedFormatted: this.formatFileSize(totalStorage),
          limit: this.FREE_TIER_LIMITS.maxStorage,
          limitFormatted: this.formatFileSize(this.FREE_TIER_LIMITS.maxStorage),
          remaining: this.FREE_TIER_LIMITS.maxStorage - totalStorage,
          remainingFormatted: this.formatFileSize(
            this.FREE_TIER_LIMITS.maxStorage - totalStorage
          ),
          usedPercent: (totalStorage / this.FREE_TIER_LIMITS.maxStorage) * 100,
        },
        videos: {
          count: videoFiles.length,
          storage: videoStorage,
          storageFormatted: this.formatFileSize(videoStorage),
          storagePercent:
            totalStorage > 0 ? (videoStorage / totalStorage) * 100 : 0,
        },
      };

      // Generate status
      const warnings = [];
      const recommendations = [];

      if (usage.storage.usedPercent > 90) {
        warnings.push(
          "Storage hampir penuh! Hapus file yang tidak diperlukan."
        );
      } else if (usage.storage.usedPercent > 80) {
        warnings.push("Storage lebih dari 80% penuh.");
      }

      if (usage.files.usedPercent > 90) {
        warnings.push("Limit file hampir tercapai!");
      } else if (usage.files.usedPercent > 80) {
        warnings.push("File count lebih dari 80% dari limit.");
      }

      if (usage.storage.usedPercent > 70) {
        recommendations.push(
          "Pertimbangkan kompresi video untuk menghemat space"
        );
        recommendations.push(
          "Upload video dalam resolusi 720p instead of 1080p"
        );
      }

      if (usage.files.usedPercent > 70) {
        recommendations.push("Gunakan Groups untuk mengorganisir file");
        recommendations.push("Hapus file duplikat atau yang tidak terpakai");
      }

      if (usage.storage.usedPercent > 85 || usage.files.usedPercent > 85) {
        recommendations.push(
          "Pertimbangkan upgrade ke Picnic plan ($20/bulan)"
        );
      }

      usage.warnings = warnings;
      usage.recommendations = recommendations;

      console.log("Usage statistics retrieved:", {
        storage: `${usage.storage.usedFormatted} / ${usage.storage.limitFormatted}`,
        files: `${usage.files.used} / ${usage.files.limit}`,
        videos: `${usage.videos.count} videos (${usage.videos.storageFormatted})`,
      });

      return usage;
    } catch (error) {
      console.error("Failed to get usage:", error);
      return {
        error: error.message,
        files: {
          used: 0,
          limit: this.FREE_TIER_LIMITS.maxFiles,
          usedPercent: 0,
        },
        storage: {
          used: 0,
          limit: this.FREE_TIER_LIMITS.maxStorage,
          usedPercent: 0,
        },
        videos: { count: 0, storage: 0 },
        warnings: ["Tidak dapat memeriksa usage saat ini"],
        recommendations: [],
      };
    }
  }

  /**
   * Get video optimization recommendations
   */
  getOptimizationTips(currentSize = null) {
    const tips = {
      general: {
        recommendedFormats: ["MP4 (H.264)", "WebM"],
        maxFileSize: this.formatFileSize(this.VIDEO_SETTINGS.maxRecommended),
        optimalSize: this.formatFileSize(this.VIDEO_SETTINGS.medium),
        encoding: this.VIDEO_SETTINGS.encoding,
      },
      compression: [
        "Gunakan H.264 codec untuk kompatibilitas maksimal",
        "Resolusi 720p optimal untuk e-learning content",
        "Frame rate 30fps cukup untuk video edukasi",
        "Bitrate 1-2 Mbps untuk keseimbangan kualitas-ukuran",
        "Audio AAC 128kbps untuk kualitas yang baik",
      ],
      tools: [
        "HandBrake (gratis, user-friendly)",
        "FFmpeg (command line, powerful)",
        "Adobe Media Encoder (professional)",
        "Online compressors (quick solution)",
        "VLC Media Player (basic compression)",
      ],
      freeTierSpecific: [
        `Target ukuran video: ${this.formatFileSize(
          this.VIDEO_SETTINGS.medium
        )} atau kurang`,
        "Gunakan resolusi 720p untuk menghemat storage",
        "Pertimbangkan split video panjang menjadi beberapa part",
        "Hapus video lama secara berkala",
        "Monitor usage dashboard secara rutin",
      ],
    };

    // Add specific recommendations based on current file size
    if (currentSize) {
      if (currentSize > this.VIDEO_SETTINGS.maxRecommended) {
        tips.urgent = [
          "KOMPRESI DIPERLUKAN: File terlalu besar untuk free tier",
          `Reduce file size dari ${this.formatFileSize(
            currentSize
          )} ke max ${this.formatFileSize(this.VIDEO_SETTINGS.maxRecommended)}`,
          'Gunakan preset "Web optimized" di software kompresi',
        ];
      } else if (currentSize > this.VIDEO_SETTINGS.large) {
        tips.recommended = [
          "File cukup besar, kompresi disarankan",
          "Pertimbangkan reduce bitrate atau resolution",
          "Test upload di waktu internet stabil",
        ];
      }
    }

    return tips;
  }

  /**
   * Generate video access URL from CID
   */
  async getVideoUrl(cid, options = {}) {
    try {
      const { preferPrivate = true, forcePublic = false } = options;

      console.log(`Generating video URL for CID: ${cid}`);

      if (forcePublic || !preferPrivate) {
        const publicUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        console.log("Using public gateway URL:", publicUrl);
        return publicUrl;
      }

      // Try to get private access URL, fallback to public
      const url = await this.pinataService.createPrivateAccessLink(cid);
      console.log("Generated video access URL:", url);

      return url;
    } catch (error) {
      console.error("Failed to generate video URL:", error);

      // Fallback to public gateway
      const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      console.log("Using fallback public URL:", fallbackUrl);
      return fallbackUrl;
    }
  }

  /**
   * Get video metadata by CID
   */
  async getVideoMetadata(cid) {
    try {
      console.log("Getting video metadata for CID:", cid);

      // Search for the file by CID
      const filesResponse = await this.pinataService.listFiles({
        cid: cid,
        limit: 1,
      });

      const files = filesResponse.files || [];
      if (files.length === 0) {
        throw new Error("Video not found");
      }

      const videoFile = files[0];

      return {
        success: true,
        metadata: {
          id: videoFile.id,
          name: videoFile.name,
          cid: videoFile.cid,
          size: videoFile.size,
          formattedSize: this.formatFileSize(videoFile.size),
          mimeType: videoFile.mime_type,
          createdAt: videoFile.created_at,
          isVideo: videoFile.mime_type?.startsWith("video/") || false,
        },
      };
    } catch (error) {
      console.error("Failed to get video metadata:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete video by CID
   */
  async deleteVideo(fileId) {
    try {
      console.log("Deleting video file ID:", fileId);

      const result = await this.pinataService.deleteFile(fileId);

      console.log("Video deleted successfully");
      return result;
    } catch (error) {
      console.error("Failed to delete video:", error);
      throw new Error(`Gagal hapus video: ${error.message}`);
    }
  }

  /**
   * Detect MIME type from filename - Enhanced for video files
   */
  detectMimeTypeFromFileName(fileName) {
    if (!fileName) return "application/octet-stream";

    const extension = fileName.toLowerCase().split(".").pop();
    const videoMimeTypes = {
      // Primary video formats (most common)
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",

      // Additional video formats
      flv: "video/x-flv",
      wmv: "video/x-ms-wmv",
      "3gp": "video/3gpp",
      m4v: "video/x-m4v",
      ogv: "video/ogg",
      f4v: "video/x-f4v",
      asf: "video/x-ms-asf",
      rm: "video/vnd.rn-realvideo",
      rmvb: "video/vnd.rn-realvideo",
      vob: "video/x-ms-vob",
    };

    const detectedType = videoMimeTypes[extension];
    console.log(
      `MIME detection: ${fileName} (${extension}) -> ${
        detectedType || "not found"
      }`
    );

    return detectedType || "application/octet-stream";
  }

  /**
   * Utility: Format file size
   */
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Generate comprehensive usage report
   */
  async generateUsageReport() {
    try {
      const usage = await this.getCurrentUsage();
      const tips = this.getOptimizationTips();

      const report = {
        timestamp: new Date().toISOString(),
        plan: "Free Plan",
        usage: usage,
        limits: this.FREE_TIER_LIMITS,
        videoSettings: this.VIDEO_SETTINGS,
        optimizationTips: tips,
        summary: {
          canUploadVideos:
            usage.storage.usedPercent < 95 && usage.files.usedPercent < 95,
          recommendedVideoSize:
            usage.storage.remaining > this.VIDEO_SETTINGS.medium
              ? this.formatFileSize(this.VIDEO_SETTINGS.medium)
              : this.formatFileSize(usage.storage.remaining),
          urgentActions: [],
        },
      };

      // Generate urgent actions
      if (usage.storage.usedPercent > 95) {
        report.summary.urgentActions.push(
          "Storage critical - hapus file sekarang"
        );
      } else if (usage.storage.usedPercent > 90) {
        report.summary.urgentActions.push(
          "Storage hampir penuh - cleanup diperlukan"
        );
      }

      if (usage.files.usedPercent > 95) {
        report.summary.urgentActions.push(
          "File limit critical - hapus file sekarang"
        );
      } else if (usage.files.usedPercent > 90) {
        report.summary.urgentActions.push(
          "File count hampir limit - organize files"
        );
      }

      return report;
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
        plan: "Free Plan",
      };
    }
  }
}

// Export singleton instance
export const videoService = new VideoService();
export default videoService;
