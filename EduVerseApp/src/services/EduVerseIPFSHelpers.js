/**
 * EduVerse Pinata Integration Examples
 * Contoh implementasi menggunakan PinataService v3 untuk EduVerse
 */

import { pinataService } from "../services/PinataService";
import { videoService } from "../services/VideoService";
import { Alert } from "react-native";

/**
 * Upload Course Video - RECOMMENDED IMPLEMENTATION
 */
export const uploadCourseVideo = async (videoFile, courseData) => {
  try {
    console.log("📹 Uploading course video...");

    // Validate video first
    const validation = videoService.validateVideo(videoFile);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Check if upload is possible
    const capacityCheck = await videoService.canUploadVideo(videoFile.size);
    if (!capacityCheck.possible) {
      Alert.alert(
        "Upload Tidak Memungkinkan",
        capacityCheck.warnings.join("\\n\\n"),
        [
          { text: "OK" },
          {
            text: "Lihat Tips Kompresi",
            onPress: () => showCompressionTips(),
          },
        ]
      );
      return null;
    }

    // Upload to public network for easy access
    const result = await videoService.uploadVideoPublic(videoFile, {
      name: `${courseData.courseId}-${courseData.lessonId}.mp4`,
      courseId: courseData.courseId,
      sectionId: courseData.sectionId,
      metadata: {
        title: courseData.title,
        description: courseData.description,
        instructor: courseData.instructor,
        duration: courseData.duration,
        difficulty: courseData.difficulty,
      },
      keyValues: {
        course: courseData.courseId,
        lesson: courseData.lessonId,
        section: courseData.sectionId,
        type: "course-video",
        category: "education",
        public: "true",
      },
    });

    console.log("✅ Video uploaded successfully:", result.ipfsHash);
    return result;
  } catch (error) {
    console.error("❌ Course video upload failed:", error);
    throw error;
  }
};

/**
 * Upload Course Materials (PDFs, Images, etc.)
 */
export const uploadCourseMaterial = async (file, courseData, materialType) => {
  try {
    console.log("📄 Uploading course material...");

    const result = await pinataService.uploadFilePublic(file, {
      name: `${courseData.courseId}-${materialType}-${Date.now()}`,
      keyValues: {
        course: courseData.courseId,
        lesson: courseData.lessonId,
        type: materialType, // 'pdf', 'image', 'document'
        category: "course-material",
        public: "true",
      },
      metadata: {
        courseTitle: courseData.title,
        materialType: materialType,
        uploadedBy: courseData.instructor,
      },
    });

    console.log("✅ Course material uploaded:", result.ipfsHash);
    return result;
  } catch (error) {
    console.error("❌ Course material upload failed:", error);
    throw error;
  }
};

/**
 * Create Course Group and Upload All Materials
 */
export const createCourseWithMaterials = async (courseData, files) => {
  try {
    console.log("🎓 Creating course with materials...");

    // Create a public group for the course
    const courseGroup = await pinataService.createPublicGroup(
      `course-${courseData.courseId}`,
      {
        network: "public",
      }
    );

    console.log("📁 Course group created:", courseGroup.groupId);

    const uploadResults = [];

    // Upload all files to the course group
    for (const file of files) {
      try {
        let result;

        if (file.type.startsWith("video/")) {
          // Use video service for videos
          result = await videoService.uploadVideoPublic(file.file, {
            name: file.name,
            courseId: courseData.courseId,
            sectionId: file.sectionId,
            groupId: courseGroup.groupId,
          });
        } else {
          // Use general upload for other files
          result = await pinataService.uploadToPublicGroup(
            file.file,
            courseGroup.groupId,
            {
              name: file.name,
              keyValues: {
                course: courseData.courseId,
                type: file.materialType,
                section: file.sectionId,
              },
            }
          );
        }

        uploadResults.push({
          ...result,
          originalFile: file,
          materialType: file.materialType,
        });

        console.log(`✅ Uploaded: ${file.name}`);
      } catch (fileError) {
        console.error(`❌ Failed to upload ${file.name}:`, fileError);
        uploadResults.push({
          error: fileError.message,
          originalFile: file,
        });
      }
    }

    return {
      courseGroup,
      uploadResults,
      successCount: uploadResults.filter((r) => !r.error).length,
      errorCount: uploadResults.filter((r) => r.error).length,
    };
  } catch (error) {
    console.error("❌ Course creation failed:", error);
    throw error;
  }
};

/**
 * Get All Course Materials
 */
export const getCourseContent = async (courseId) => {
  try {
    console.log("📚 Fetching course content...");

    // Search for all files related to this course
    const courseFiles = await pinataService.searchFiles({
      keyValues: {
        course: courseId,
      },
      network: "public",
      limit: 100,
    });

    if (!courseFiles.success) {
      throw new Error("Failed to fetch course files");
    }

    // Organize files by type
    const organizedContent = {
      videos: [],
      documents: [],
      images: [],
      other: [],
    };

    courseFiles.files.forEach((file) => {
      const fileType = file.keyvalues?.type || "other";
      const accessUrl = pinataService.getPublicGatewayUrl(file.cid);

      const fileInfo = {
        ...file,
        accessUrl: accessUrl,
        isVideo: file.mime_type?.startsWith("video/"),
        isImage: file.mime_type?.startsWith("image/"),
        isDocument:
          file.mime_type?.includes("pdf") ||
          file.mime_type?.includes("document"),
      };

      if (fileInfo.isVideo) {
        organizedContent.videos.push(fileInfo);
      } else if (fileInfo.isImage) {
        organizedContent.images.push(fileInfo);
      } else if (fileInfo.isDocument) {
        organizedContent.documents.push(fileInfo);
      } else {
        organizedContent.other.push(fileInfo);
      }
    });

    console.log("📊 Course content organized:", {
      videos: organizedContent.videos.length,
      documents: organizedContent.documents.length,
      images: organizedContent.images.length,
      other: organizedContent.other.length,
    });

    return organizedContent;
  } catch (error) {
    console.error("❌ Failed to get course content:", error);
    throw error;
  }
};

/**
 * Delete Course and All Materials
 */
export const deleteCourse = async (courseId) => {
  try {
    console.log("🗑️ Deleting course and all materials...");

    // Get all course files
    const courseFiles = await pinataService.searchFiles({
      keyValues: {
        course: courseId,
      },
      network: "public",
      limit: 1000, // Get all files
    });

    if (courseFiles.success && courseFiles.files.length > 0) {
      // Extract file IDs
      const fileIds = courseFiles.files.map((file) => file.id);

      // Bulk delete all files
      const deleteResult = await pinataService.bulkDeleteFiles(
        fileIds,
        "public"
      );

      console.log(
        `🗑️ Deleted ${deleteResult.successCount} files, ${deleteResult.errorCount} errors`
      );

      return {
        success: deleteResult.successCount > 0,
        deletedCount: deleteResult.successCount,
        errorCount: deleteResult.errorCount,
        errors: deleteResult.errors,
      };
    } else {
      console.log("📭 No files found for course:", courseId);
      return {
        success: true,
        deletedCount: 0,
        errorCount: 0,
        message: "No files found for this course",
      };
    }
  } catch (error) {
    console.error("❌ Course deletion failed:", error);
    throw error;
  }
};

/**
 * Get Storage Usage for EduVerse
 */
export const getEduVerseStorageStats = async () => {
  try {
    console.log("📊 Getting EduVerse storage statistics...");

    const stats = await pinataService.getStorageStats("public");

    if (!stats.success) {
      throw new Error("Failed to get storage stats");
    }

    // Calculate EduVerse specific metrics
    const eduVerseStats = {
      ...stats.stats,
      breakdown: {
        videos: {
          count: 0,
          size: 0,
          sizeFormatted: "0 Bytes",
        },
        documents: {
          count: 0,
          size: 0,
          sizeFormatted: "0 Bytes",
        },
        images: {
          count: 0,
          size: 0,
          sizeFormatted: "0 Bytes",
        },
      },
    };

    // Analyze by MIME type
    Object.entries(stats.stats.byMimeType).forEach(([mimeType, data]) => {
      if (mimeType.startsWith("video/")) {
        eduVerseStats.breakdown.videos.count += data.count;
        eduVerseStats.breakdown.videos.size += data.size;
      } else if (mimeType.startsWith("image/")) {
        eduVerseStats.breakdown.images.count += data.count;
        eduVerseStats.breakdown.images.size += data.size;
      } else if (mimeType.includes("pdf") || mimeType.includes("document")) {
        eduVerseStats.breakdown.documents.count += data.count;
        eduVerseStats.breakdown.documents.size += data.size;
      }
    });

    // Format sizes
    Object.values(eduVerseStats.breakdown).forEach((category) => {
      category.sizeFormatted = pinataService.formatFileSize(category.size);
    });

    console.log("📊 EduVerse storage stats calculated");
    return eduVerseStats;
  } catch (error) {
    console.error("❌ Failed to get storage stats:", error);
    throw error;
  }
};

/**
 * Health Check for EduVerse Integration
 */
export const checkEduVerseIPFSHealth = async () => {
  try {
    console.log("🏥 Running EduVerse IPFS health check...");

    const health = await pinataService.healthCheck();
    const config = pinataService.getConfiguration();

    return {
      overall: health.overall,
      details: health.checks,
      configuration: config,
      recommendations: generateHealthRecommendations(health, config),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Health check failed:", error);
    return {
      overall: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Generate health recommendations for EduVerse
 */
const generateHealthRecommendations = (health, config) => {
  const recommendations = [];

  if (health.overall === "unhealthy") {
    recommendations.push(
      "❌ IPFS service is not working properly. Check your internet connection and API key."
    );
  }

  if (config.plan.freePlanDetected) {
    recommendations.push(
      "ℹ️ You are using Pinata free plan. Signed URLs are not available, but all basic features work."
    );
  }

  if (!config.plan.dedicatedGatewayAvailable) {
    recommendations.push(
      "ℹ️ No dedicated gateway detected. Videos will use public gateway which may be slower."
    );
  }

  if (health.checks.authentication?.status === "failed") {
    recommendations.push(
      "🔑 API key authentication failed. Please check your PINATA_JWT environment variable."
    );
  }

  if (health.checks.uploadEndpoint?.status === "failed") {
    recommendations.push(
      "📤 Upload endpoint is not accessible. File uploads may fail."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "✅ All systems operational! EduVerse IPFS integration is working perfectly."
    );
  }

  return recommendations;
};

/**
 * Show compression tips for large videos
 */
const showCompressionTips = () => {
  Alert.alert(
    "Tips Kompresi Video",
    "📹 Untuk mengoptimalkan upload video:\\n\\n" +
      "• Gunakan resolusi maksimal 720p untuk mobile\\n" +
      "• Compress dengan bitrate 1-2 Mbps\\n" +
      "• Gunakan format MP4 dengan codec H.264\\n" +
      "• Potong durasi jika memungkinkan\\n" +
      "• Gunakan tools seperti HandBrake atau FFmpeg",
    [{ text: "OK" }]
  );
};

export default {
  uploadCourseVideo,
  uploadCourseMaterial,
  createCourseWithMaterials,
  getCourseContent,
  deleteCourse,
  getEduVerseStorageStats,
  checkEduVerseIPFSHealth,
};
