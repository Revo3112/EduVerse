/**
 * CourseUploadScreen.js - Contoh implementasi upload course dengan Pinata v3
 *
 * Contoh screen untuk upload materi course lengkap dengan video, dokumen, dan gambar
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ProgressBarAndroid,
} from "react-native";
import { VideoUploader } from "../components/VideoUploader";
import { IPFSUploader } from "../components/IPFSUploader";
import {
  uploadCourseVideo,
  uploadCourseMaterial,
  createCourseWithMaterials,
  checkEduVerseIPFSHealth,
} from "../services/EduVerseIPFSHelpers";
import { pinataService } from "../services/PinataService";

export const CourseUploadScreen = ({ route, navigation }) => {
  const [courseData, setCourseData] = useState({
    courseId: "blockchain-101",
    title: "Blockchain Fundamentals",
    instructor: "John Doe",
    description: "Learn the basics of blockchain technology",
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIPFSHealth();
  }, []);

  const checkIPFSHealth = async () => {
    try {
      const health = await checkEduVerseIPFSHealth();
      setHealthStatus(health);

      if (health.overall === "unhealthy") {
        Alert.alert(
          "IPFS Status Warning",
          "IPFS service may not be working properly. Please check your connection.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Health check failed:", error);
    }
  };

  const handleVideoUpload = async (videoFile, sectionData) => {
    try {
      setLoading(true);

      const courseVideoData = {
        ...courseData,
        lessonId: sectionData.lessonId || "lesson-1",
        sectionId: sectionData.sectionId || "intro",
        duration: sectionData.duration || "10 minutes",
        difficulty: "beginner",
      };

      console.log("📹 Starting video upload...");

      const result = await uploadCourseVideo(videoFile, courseVideoData);

      if (result) {
        setUploadedFiles((prev) => [
          ...prev,
          {
            type: "video",
            name: videoFile.name,
            cid: result.ipfsHash,
            url: result.publicUrl,
            size: result.videoInfo.formattedSize,
            result: result,
          },
        ]);

        Alert.alert(
          "Video Uploaded! 🎉",
          `Video "${
            videoFile.name
          }" berhasil diupload ke IPFS.\\n\\nCID: ${result.ipfsHash.substring(
            0,
            20
          )}...`,
          [
            { text: "OK" },
            {
              text: "View Video",
              onPress: () => openVideoPreview(result.publicUrl),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Video upload failed:", error);
      Alert.alert("Upload Failed", `Video upload gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (file, materialType = "document") => {
    try {
      setLoading(true);

      const result = await uploadCourseMaterial(
        file,
        {
          ...courseData,
          lessonId: "materials",
        },
        materialType
      );

      if (result) {
        setUploadedFiles((prev) => [
          ...prev,
          {
            type: materialType,
            name: file.name,
            cid: result.ipfsHash,
            url: result.publicUrl,
            size: pinataService.formatFileSize(file.size),
            result: result,
          },
        ]);

        Alert.alert(
          "Material Uploaded! 📄",
          `${materialType} "${file.name}" berhasil diupload.`
        );
      }
    } catch (error) {
      console.error("Material upload failed:", error);
      Alert.alert("Upload Failed", `Material upload gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createCompleteCourseBatch = async () => {
    Alert.alert(
      "Create Complete Course",
      "This will create a course group and upload all materials together. Continue?",
      [{ text: "Cancel" }, { text: "Create", onPress: performBatchUpload }]
    );
  };

  const performBatchUpload = async () => {
    try {
      setLoading(true);

      // Example files - in real app, these would come from file selection
      const exampleFiles = [
        {
          name: "intro-video.mp4",
          file: {
            /* video file object */
          },
          materialType: "video",
          sectionId: "intro",
        },
        {
          name: "course-slides.pdf",
          file: {
            /* pdf file object */
          },
          materialType: "document",
          sectionId: "materials",
        },
        {
          name: "blockchain-diagram.png",
          file: {
            /* image file object */
          },
          materialType: "image",
          sectionId: "materials",
        },
      ];

      const result = await createCourseWithMaterials(courseData, exampleFiles);

      Alert.alert(
        "Course Created! 🎓",
        `Course group created with ${result.successCount} files uploaded successfully.\\n\\n` +
          `${result.errorCount} files failed to upload.`,
        [
          { text: "OK" },
          {
            text: "View Course",
            onPress: () => navigateToCourse(result.courseGroup.groupId),
          },
        ]
      );
    } catch (error) {
      console.error("Batch upload failed:", error);
      Alert.alert("Batch Upload Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const openVideoPreview = (url) => {
    // Navigate to video player or open in browser
    console.log("Opening video:", url);
    // navigation.navigate('VideoPlayer', { url });
  };

  const navigateToCourse = (groupId) => {
    // Navigate to course view
    console.log("Navigating to course:", groupId);
    // navigation.navigate('CourseView', { groupId });
  };

  const clearUploads = () => {
    Alert.alert(
      "Clear Uploads",
      "This will clear the upload list (files will remain on IPFS)",
      [
        { text: "Cancel" },
        { text: "Clear", onPress: () => setUploadedFiles([]) },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Health Status */}
      {healthStatus && (
        <View
          style={[
            styles.healthStatus,
            { backgroundColor: getHealthColor(healthStatus.overall) },
          ]}
        >
          <Text style={styles.healthText}>
            IPFS Status: {healthStatus.overall.toUpperCase()}
          </Text>
          {healthStatus.recommendations && (
            <Text style={styles.healthDetails}>
              {healthStatus.recommendations[0]}
            </Text>
          )}
        </View>
      )}

      {/* Course Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Course Information</Text>
        <Text style={styles.courseInfo}>Course: {courseData.title}</Text>
        <Text style={styles.courseInfo}>ID: {courseData.courseId}</Text>
        <Text style={styles.courseInfo}>
          Instructor: {courseData.instructor}
        </Text>
      </View>

      {/* Video Upload Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎥 Upload Course Video</Text>
        <VideoUploader
          onUploadComplete={(result) =>
            handleVideoUpload(result.file, {
              lessonId: "lesson-1",
              sectionId: "intro",
              duration: "15 minutes",
            })
          }
          onUploadStart={() => console.log("Video upload started")}
          onUploadError={(error) => console.error("Video upload error:", error)}
          courseId={courseData.courseId}
          sectionId="intro"
          showUsageInfo={true}
          style={styles.uploader}
        />
      </View>

      {/* Document Upload Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📄 Upload Course Materials</Text>

        <IPFSUploader
          buttonText="Upload PDF Document"
          accept="documents"
          maxSizeBytes={25 * 1024 * 1024} // 25MB
          onUploadComplete={(result) =>
            handleDocumentUpload(result.file, "document")
          }
          network="public"
          style={styles.uploader}
          keyValues={{ type: "course-material", category: "document" }}
        />

        <IPFSUploader
          buttonText="Upload Images"
          accept="images"
          maxSizeBytes={10 * 1024 * 1024} // 10MB
          onUploadComplete={(result) =>
            handleDocumentUpload(result.file, "image")
          }
          network="public"
          style={[styles.uploader, { marginTop: 10 }]}
          keyValues={{ type: "course-material", category: "image" }}
        />
      </View>

      {/* Batch Upload Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 Batch Operations</Text>
        <TouchableOpacity
          style={styles.batchButton}
          onPress={createCompleteCourseBatch}
          disabled={loading}
        >
          <Text style={styles.batchButtonText}>
            Create Complete Course with Materials
          </Text>
        </TouchableOpacity>
      </View>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              📁 Uploaded Files ({uploadedFiles.length})
            </Text>
            <TouchableOpacity onPress={clearUploads}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>

          {uploadedFiles.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              <Text style={styles.fileName}>{file.name}</Text>
              <Text style={styles.fileDetails}>
                Type: {file.type} | Size: {file.size}
              </Text>
              <Text style={styles.fileCid}>
                CID: {file.cid.substring(0, 30)}...
              </Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => console.log("Opening:", file.url)}
              >
                <Text style={styles.viewButtonText}>View File</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing upload...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const getHealthColor = (status) => {
  switch (status) {
    case "healthy":
      return "#4CAF50";
    case "warning":
      return "#FF9800";
    case "unhealthy":
      return "#F44336";
    default:
      return "#9E9E9E";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  healthStatus: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  healthText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  healthDetails: {
    color: "white",
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  courseInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  uploader: {
    marginVertical: 8,
  },
  batchButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  batchButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  clearButton: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "500",
  },
  fileItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  fileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  fileDetails: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  fileCid: {
    fontSize: 10,
    color: "#999",
    fontFamily: "monospace",
    marginBottom: 8,
  },
  viewButton: {
    backgroundColor: "#34C759",
    padding: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  viewButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
});

export default CourseUploadScreen;
