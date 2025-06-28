/**
 * VideoService.js - Video Upload & Management Service (Updated untuk Signed URL)
 * Service untuk menangani video upload dan management di IPFS Pinata
 */

import { pinataService } from "./PinataService";

class VideoService {
  constructor() {
    this.pinataService = pinataService;

    // Free tier limits
    this.FREE_TIER_LIMITS = {
      maxFiles: 500,
      maxStorage: 1024 * 1024 * 1024, // 1GB
      maxFileSize: 25 * 1024 * 1024 * 1024, // 25GB per file
    };

    // Video optimization settings
    this.VIDEO_SETTINGS = {
      small: 10 * 1024 * 1024, // 10MB
      medium: 25 * 1024 * 1024, // 25MB
      large: 50 * 1024 * 1024, // 50MB
      maxRecommended: 100 * 1024 * 1024, // 100MB

      supportedFormats: [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska",
        "video/x-flv",
        "video/x-ms-wmv",
        "video/3gpp",
        "video/ogg",
        "video/x-m4v",
      ],

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
      },
    };

    console.log("VideoService initialized with free tier optimization");
  }

  /**
   * Detect MIME type from filename
   */
  detectMimeTypeFromFileName(fileName) {
    if (!fileName) return "application/octet-stream";

    const extension = fileName.toLowerCase().split(".").pop();
    const videoMimeTypes = {
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      flv: "video/x-flv",
      wmv: "video/x-ms-wmv",
      "3gp": "video/3gpp",
      m4v: "video/x-m4v",
      ogv: "video/ogg",
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
   * Alias untuk detectMimeTypeFromFileName untuk kompatibilitas
   */
  detectMimeType(fileName) {
    return this.detectMimeTypeFromFileName(fileName);
  }

  /**
   * Validate video file for upload
   */
  validateVideo(videoFile) {
    console.log("Validating video file:", videoFile?.name);

    if (!videoFile) {
      return {
        isValid: false,
        error: "File video diperlukan",
        code: "MISSING_FILE",
      };
    }

    if (!videoFile.name || videoFile.name.trim() === "") {
      return {
        isValid: false,
        error: "Nama file video diperlukan",
        code: "MISSING_NAME",
      };
    }

    // Detect MIME type with fallback
    let mimeType = videoFile.type;
    const fileName = videoFile.name;

    if (!mimeType || mimeType === "video" || !mimeType.startsWith("video/")) {
      mimeType = this.detectMimeTypeFromFileName(fileName);
      console.log(
        `Corrected MIME type from "${videoFile.type}" to "${mimeType}" for file: ${fileName}`
      );
    }

    console.log(`Final MIME type for validation: ${mimeType}`);

    // Check if MIME type is supported
    if (!this.VIDEO_SETTINGS.supportedFormats.includes(mimeType)) {
      return {
        isValid: false,
        error: `Format video tidak didukung: ${mimeType}. Gunakan: ${this.VIDEO_SETTINGS.supportedFormats
          .map((f) => f.split("/")[1].toUpperCase())
          .join(", ")}`,
        code: "UNSUPPORTED_FORMAT",
        detectedMimeType: mimeType,
        originalType: videoFile.type,
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

      console.log("Upload capacity check completed:", {
        possible: result.possible,
        warnings: result.warnings.length,
        storageAfter: result.afterUpload.storageFormatted,
      });

      return result;
    } catch (error) {
      console.error("Failed to check upload capacity:", error);
      return {
        possible: true,
        warnings: ["Tidak dapat memeriksa kapasitas. Upload dengan hati-hati."],
        error: error.message,
      };
    }
  }

  /**
   * Upload video to IPFS dengan network selection
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

      // Validate video first
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

      // Create corrected file object with proper MIME type
      const correctedVideoFile = {
        ...videoFile,
        type: validation.mimeType,
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
        network = "public", // DEFAULT public untuk video agar mudah diakses
        group_id,
        usePrivate = false, // Option to force private
      } = options;

      // Determine final network
      const finalNetwork = usePrivate ? "private" : network;

      console.log(`Upload akan menggunakan network: ${finalNetwork}`);

      // Prepare video-specific keyvalues for API v3
      const videoKeyvalues = {
        type: "video",
        contentType: "course-video",
        originalSize: videoFile.size?.toString() || "0",
        formattedSize: validation.formattedSize,
        mimeType: validation.mimeType,
        courseId: courseId || "unknown",
        sectionId: sectionId || "unknown",
        uploadedAt: new Date().toISOString(),
        app: "EduVerse",
        freeTierOptimized: "true",
        category: "education",
        platform: "react-native",
        uploadSource: "VideoService",
      };

      console.log("Starting video upload with keyvalues:", videoKeyvalues);

      // Upload using PinataService
      const result = await this.pinataService.uploadFile(correctedVideoFile, {
        name: name || videoFile.name,
        network: finalNetwork,
        group_id: group_id,
        keyvalues: videoKeyvalues,
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

      // Generate streaming URL berdasarkan network
      let streamingUrl;
      if (result.isPrivate) {
        console.log(
          "Video is private, streaming URL will be generated on demand"
        );
        streamingUrl = null; // Will be created when needed via signed URL
      } else {
        streamingUrl = result.publicUrl;
      }

      result.urls = {
        ipfs: `ipfs://${result.ipfsHash}`,
        gateway: result.publicUrl,
        streaming: streamingUrl,
      };

      console.log("=== VIDEO UPLOAD COMPLETED ===");
      console.log("CID:", result.ipfsHash);
      console.log("Network:", result.network);
      console.log("Is Private:", result.isPrivate);
      console.log("Gateway URL:", result.publicUrl);
      console.log("Video Info:", result.videoInfo);

      return result;
    } catch (error) {
      console.error("Video upload failed:", error);
      throw new Error(`Video upload gagal: ${error.message}`);
    }
  }

  // ✅ ENHANCED: Public video upload with progress tracking
  async uploadVideoPublic(videoFile, options = {}) {
    console.log("📹 Starting public video upload:", videoFile.name);

    try {
      // Validate video file
      const validation = this.validateVideoFile(videoFile);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Use PinataService for IPFS upload
      const { pinataService } = await import("./PinataService");

      const uploadResult = await pinataService.uploadFile(videoFile, {
        name: options.name || videoFile.name,
        network: "public", // Force public for easy access
        keyvalues: {
          category: "video",
          courseId: options.courseId || "unknown",
          sectionId: options.sectionId || "unknown",
          app: "eduverse",
          uploadedAt: new Date().toISOString(),
          ...options.metadata,
        },
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Video upload failed");
      }

      console.log("✅ Video uploaded successfully:", uploadResult.ipfsHash);

      return {
        success: true,
        ipfsHash: uploadResult.ipfsHash,
        publicUrl: uploadResult.publicUrl,
        streamingUrl: uploadResult.streamingUrl,
        fileName: videoFile.name,
        fileSize: videoFile.size,
        cid: uploadResult.ipfsHash.replace("ipfs://", ""),
      };
    } catch (error) {
      console.error("❌ Video upload failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ ENHANCED: Video file validation
  validateVideoFile(videoFile) {
    if (!videoFile) {
      return { isValid: false, error: "No video file provided" };
    }

    if (!videoFile.uri && !videoFile.path) {
      return { isValid: false, error: "Invalid video file - no path" };
    }

    // Size validation (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (videoFile.size && videoFile.size > maxSize) {
      return {
        isValid: false,
        error: `Video file too large (${this.formatFileSize(
          videoFile.size
        )}). Max: 100MB`,
      };
    }

    // Type validation
    const allowedTypes = [
      "video/mp4",
      "video/mov",
      "video/avi",
      "video/mkv",
      "video/webm",
      "video/quicktime",
    ];

    if (videoFile.type && !allowedTypes.includes(videoFile.type)) {
      console.warn("Video type may not be fully supported:", videoFile.type);
    }

    return { isValid: true };
  }

  // ✅ ENHANCED: Get video streaming URL
  async getVideoStreamingUrl(cid, network = "public") {
    try {
      const { pinataService } = await import("./PinataService");

      const streamingUrl = await pinataService.getOptimizedFileUrl(cid, {
        forcePublic: network === "public",
        network: network,
        expires: 7200, // 2 hours for streaming
      });

      return {
        success: true,
        streamingUrl,
        cid,
      };
    } catch (error) {
      console.error("Failed to get streaming URL:", error);
      return {
        success: false,
        error: error.message,
        fallbackUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      };
    }
  }

  /**
   * Get current usage statistics
   */
  async getCurrentUsage() {
    try {
      console.log("Getting current usage statistics...");

      // Get files from both networks
      const publicFilesResponse = await this.pinataService.listFiles({
        network: "public",
        limit: this.FREE_TIER_LIMITS.maxFiles,
      });

      const privateFilesResponse = await this.pinataService.listFiles({
        network: "private",
        limit: this.FREE_TIER_LIMITS.maxFiles,
      });

      const publicFiles = publicFilesResponse.files || [];
      const privateFiles = privateFilesResponse.files || [];
      const allFiles = [...publicFiles, ...privateFiles];

      // Calculate totals
      const totalStorage = allFiles.reduce(
        (sum, file) => sum + (file.size || 0),
        0
      );
      const videoFiles = allFiles.filter(
        (file) => file.mime_type && file.mime_type.startsWith("video/")
      );
      const videoStorage = videoFiles.reduce(
        (sum, file) => sum + (file.size || 0),
        0
      );

      const usage = {
        files: {
          used: allFiles.length,
          limit: this.FREE_TIER_LIMITS.maxFiles,
          remaining: this.FREE_TIER_LIMITS.maxFiles - allFiles.length,
          usedPercent: (allFiles.length / this.FREE_TIER_LIMITS.maxFiles) * 100,
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
        networks: {
          public: publicFiles.length,
          private: privateFiles.length,
        },
      };

      // Generate warnings and recommendations
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

      usage.warnings = warnings;
      usage.recommendations = recommendations;

      console.log("Usage statistics retrieved:", {
        storage: `${usage.storage.usedFormatted} / ${usage.storage.limitFormatted}`,
        files: `${usage.files.used} / ${usage.files.limit}`,
        videos: `${usage.videos.count} videos (${usage.videos.storageFormatted})`,
        networks: `Public: ${usage.networks.public}, Private: ${usage.networks.private}`,
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
        networks: { public: 0, private: 0 },
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
      ],
      tools: [
        "HandBrake (gratis, user-friendly)",
        "FFmpeg (command line, powerful)",
        "Adobe Media Encoder (professional)",
        "Online compressors (quick solution)",
      ],
      freeTierSpecific: [
        `Target ukuran video: ${this.formatFileSize(
          this.VIDEO_SETTINGS.medium
        )} atau kurang`,
        "Gunakan resolusi 720p untuk menghemat storage",
        "Pertimbangkan split video panjang menjadi beberapa part",
        "Hapus video lama secara berkala",
      ],
      networkTips: [
        "Upload ke 'public' network untuk akses mudah",
        "Gunakan 'private' network untuk konten sensitif",
        "File private memerlukan signed URL untuk akses",
        "Signed URL memiliki batas waktu akses",
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
      }
    }

    return tips;
  }

  /**
   * Format file size utility
   */
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

// Export singleton instance
export const videoService = new VideoService();
export default videoService;
