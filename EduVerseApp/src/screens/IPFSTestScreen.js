import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import { IPFSUploader, useIPFSJsonUpload } from "../components/IPFSUploader";
import VideoUploader from "../components/VideoUploader";
import { pinataService } from "../services/PinataService";
import { videoService } from "../services/VideoService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

/**
 * Demo screen showing Pinata IPFS integration
 * Enhanced with video upload testing capabilities
 */
export default function IPFSTestScreen({ navigation }) {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);
  const [usageInfo, setUsageInfo] = useState(null);
  const [jsonData, setJsonData] = useState(
    '{"example": "data", "timestamp": "' + new Date().toISOString() + '"}'
  );
  const { uploadJson, uploading: jsonUploading } = useIPFSJsonUpload();

  // Video player states
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoStatus, setVideoStatus] = useState({});
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    testPinataConnection();
    loadUsageInfo();
  }, []);

  const loadUsageInfo = async () => {
    try {
      const usage = await videoService.getCurrentUsage();
      setUsageInfo(usage);
    } catch (error) {
      console.warn("Could not load usage info:", error.message);
    }
  };

  const testPinataConnection = async () => {
    setTestingConnection(true);
    console.log("Starting Pinata connection test...");

    try {
      const result = await pinataService.testConnection();
      console.log("Connection test result:", result);
      setConnectionStatus(result);

      if (result.success) {
        Alert.alert("Success", "Successfully connected to Pinata!");
      } else {
        Alert.alert("Connection Failed", result.error || "Unknown error");
      }
    } catch (error) {
      console.error("Connection test exception:", error);
      const errorResult = { success: false, error: error.message };
      setConnectionStatus(errorResult);
      Alert.alert("Connection Error", error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFileUploadComplete = (result) => {
    console.log("File uploaded:", result);
    setUploadedFiles((prev) => [result, ...prev]);
  };

  const handleJsonUpload = async () => {
    try {
      const data = JSON.parse(jsonData);
      const result = await uploadJson(data, {
        name: "test-data.json",
        metadata: {
          description: "Test JSON data from IPFS demo screen",
          category: "test",
          source: "demo-screen",
        },
        keyValues: {
          category: "test",
          source: "demo",
        },
      });

      Alert.alert("Success", "JSON data uploaded to IPFS successfully!");
      setUploadedFiles((prev) => [result, ...prev]);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to upload JSON data");
    }
  };

  const openFile = (url) => {
    Alert.alert(
      "Open File",
      "File URL copied to clipboard and will open in browser",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open", onPress: () => console.log("Opening:", url) },
      ]
    );
  };

  const listPinnedFiles = async () => {
    try {
      const result = await pinataService.listFiles({
        limit: 10,
        metadata: {
          app: "eduverse",
        },
      });

      if (result.success) {
        Alert.alert(
          "Pinned Files",
          `Found ${result.count} files. Check console for details.`
        );
        console.log("Pinned files:", result.files);
      } else {
        Alert.alert("Error", result.error || "Failed to list files");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to list files");
    }
  };

  // Handle video upload completion
  const handleVideoUploadComplete = (result) => {
    console.log("Video upload completed:", result);
    setUploadedVideos((prev) => [...prev, result]);
    loadUsageInfo(); // Refresh usage info

    Alert.alert(
      "Video Upload Success! 🎉",
      `CID: ${result.ipfsHash.substring(0, 20)}...\n` +
        `Size: ${result.videoInfo.formattedSize}\n` +
        `URL: ${result.publicUrl}`,
      [
        { text: "OK" },
        {
          text: "Test Playback",
          onPress: () => testVideoPlayback(result.publicUrl),
        },
      ]
    );
  };

  // Handle video upload start
  const handleVideoUploadStart = (file) => {
    console.log("Video upload started:", file.name);
  };

  // Handle video upload error
  const handleVideoUploadError = (error) => {
    console.error("Video upload error:", error);
    Alert.alert("Upload Error", error.message);
  };

  // Test video playback dengan in-app player
  const testVideoPlayback = (url, fileName = "Unknown Video") => {
    console.log("Opening video player for:", url);
    setSelectedVideo({
      url: url,
      fileName: fileName,
    });
    setShowVideoPlayer(true);
    setIsVideoLoading(true);
  };

  // Handle video player events
  const handleVideoStatusUpdate = (status) => {
    setVideoStatus(status);

    if (status.isLoaded && isVideoLoading) {
      setIsVideoLoading(false);
      console.log("Video loaded successfully:", {
        duration: status.durationMillis
          ? `${Math.floor(status.durationMillis / 1000)}s`
          : "Unknown",
        isBuffering: status.isBuffering,
        shouldPlay: status.shouldPlay,
        uri: selectedVideo?.url,
      });
    }

    if (status.error) {
      console.error("Video playback error:", status.error);
      setIsVideoLoading(false);
      Alert.alert(
        "Playback Error",
        "Failed to play video. The file might be corrupted or the format is not supported.",
        [
          { text: "Close", onPress: closeVideoPlayer },
          { text: "Retry", onPress: () => setIsVideoLoading(true) },
        ]
      );
    }
  };

  // Play/Pause video
  const togglePlayPause = async () => {
    if (videoRef.current && videoStatus.isLoaded) {
      try {
        if (videoStatus.shouldPlay) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
      } catch (error) {
        console.error("Error toggling play/pause:", error);
      }
    }
  };

  // Close video player
  const closeVideoPlayer = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.pauseAsync();
      } catch (error) {
        console.log("Error pausing video:", error);
      }
    }
    setShowVideoPlayer(false);
    setSelectedVideo(null);
    setVideoStatus({});
    setIsVideoLoading(false);
  };

  // Format duration helper
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return "Unknown";
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Test video service capabilities
  const testVideoService = async () => {
    try {
      Alert.alert("Testing Video Service...", "Checking capabilities...");

      const usage = await videoService.getCurrentUsage();
      const tips = videoService.getOptimizationTips();
      const report = await videoService.generateUsageReport();

      console.log("Video Service Test Results:");
      console.log("Usage:", usage);
      console.log("Optimization Tips:", tips);
      console.log("Report:", report);

      Alert.alert(
        "Video Service Test Results",
        `✅ Service initialized\n` +
          `📊 Storage: ${usage.storage.usedFormatted}/${usage.storage.limitFormatted}\n` +
          `📁 Files: ${usage.files.used}/${usage.files.limit}\n` +
          `🎬 Videos: ${usage.videos.count} (${usage.videos.storageFormatted})\n\n` +
          `Check console for detailed results.`
      );
    } catch (error) {
      Alert.alert("Video Service Test Failed", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>IPFS Test Screen</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusContainer}>
            {testingConnection ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: connectionStatus?.success
                      ? Colors.success
                      : Colors.error,
                  },
                ]}
              />
            )}
            <Text style={styles.statusText}>
              {testingConnection
                ? "Testing connection..."
                : connectionStatus?.success
                ? "Connected to Pinata"
                : `Error: ${connectionStatus?.error || "Unknown error"}`}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={testPinataConnection}
              disabled={testingConnection}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* File Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>File Upload</Text>
          <Text style={styles.sectionDescription}>
            Upload images or documents to IPFS via Pinata
          </Text>
          <IPFSUploader
            onUploadComplete={handleFileUploadComplete}
            onUploadStart={() => console.log("Upload started")}
            onUploadProgress={(progress) =>
              console.log("Upload progress:", progress)
            }
            onUploadError={(error) => console.error("Upload error:", error)}
            accept="all"
            maxSizeBytes={10 * 1024 * 1024} // 10MB
            buttonText="📁 Upload File"
            metadata={{
              description: "Test file from IPFS demo screen",
              category: "test",
            }}
            keyValues={{
              category: "test",
              source: "demo",
            }}
            network="private"
          />
          <IPFSUploader
            onUploadComplete={handleFileUploadComplete}
            onUploadError={(error) => console.error("Upload error:", error)}
            accept="images"
            buttonText="📸 Upload Image"
            style={styles.uploadButton}
            metadata={{
              description: "Test image from IPFS demo screen",
              category: "image",
            }}
            keyValues={{
              category: "image",
              source: "demo",
            }}
            network="private"
          />
        </View>

        {/* JSON Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>JSON Upload</Text>
          <Text style={styles.sectionDescription}>
            Upload JSON data directly to IPFS
          </Text>

          <TextInput
            style={styles.jsonInput}
            value={jsonData}
            onChangeText={setJsonData}
            placeholder="Enter JSON data..."
            multiline
            numberOfLines={6}
          />

          <TouchableOpacity
            style={[
              styles.uploadJsonButton,
              jsonUploading && styles.uploadingButton,
            ]}
            onPress={handleJsonUpload}
            disabled={jsonUploading}
          >
            {jsonUploading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.uploadJsonButtonText}>📄 Upload JSON</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Utility Functions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Utility Functions</Text>
          <TouchableOpacity
            style={styles.utilityButton}
            onPress={listPinnedFiles}
          >
            <Text style={styles.utilityButtonText}>📋 List Pinned Files</Text>
          </TouchableOpacity>
        </View>

        {/* Usage Information */}
        {usageInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Free Plan Usage</Text>
            <View style={styles.usageGrid}>
              <View style={styles.usageItem}>
                <Text style={styles.usageLabel}>Storage</Text>
                <Text style={styles.usageValue}>
                  {usageInfo.storage.usedFormatted} /{" "}
                  {usageInfo.storage.limitFormatted}
                </Text>
                <Text style={styles.usagePercent}>
                  {usageInfo.storage.usedPercent.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.usageItem}>
                <Text style={styles.usageLabel}>Files</Text>
                <Text style={styles.usageValue}>
                  {usageInfo.files.used} / {usageInfo.files.limit}
                </Text>
                <Text style={styles.usagePercent}>
                  {usageInfo.files.usedPercent.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.usageItem}>
                <Text style={styles.usageLabel}>Videos</Text>
                <Text style={styles.usageValue}>
                  {usageInfo.videos.count} files
                </Text>
                <Text style={styles.usagePercent}>
                  {usageInfo.videos.storageFormatted}
                </Text>
              </View>
            </View>
            {usageInfo.warnings.length > 0 && (
              <View style={styles.warningsContainer}>
                <Text style={styles.warningsTitle}>⚠️ Warnings:</Text>
                {usageInfo.warnings.map((warning, index) => (
                  <Text key={index} style={styles.warningText}>
                    • {warning}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Video Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎬 Video Upload Testing</Text>
          <Text style={styles.sectionDescription}>
            Test video upload functionality with free tier optimization
          </Text>

          <VideoUploader
            onUploadComplete={handleVideoUploadComplete}
            onUploadStart={handleVideoUploadStart}
            onUploadError={handleVideoUploadError}
            courseId="test-course"
            sectionId="test-section"
            showUsageInfo={false} // We show it separately above
          />

          <TouchableOpacity
            style={styles.testButton}
            onPress={testVideoService}
          >
            <Text style={styles.testButtonText}>🧪 Test Video Service</Text>
          </TouchableOpacity>
        </View>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Uploaded Files ({uploadedFiles.length})
            </Text>
            {uploadedFiles.map((file, index) => (
              <TouchableOpacity
                key={index}
                style={styles.fileItem}
                onPress={() => openFile(file.publicUrl)}
              >
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.fileName || "Unknown file"}
                  </Text>
                  <Text style={styles.fileHash} numberOfLines={1}>
                    IPFS: {file.ipfsHash}
                  </Text>
                  <Text style={styles.fileSize}>
                    Size:{" "}
                    {file.fileSize
                      ? `${(file.fileSize / 1024).toFixed(1)} KB`
                      : "Unknown"}
                  </Text>
                </View>
                <Text style={styles.openIcon}>🔗</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Uploaded Videos List */}
        {uploadedVideos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📹 Uploaded Videos ({uploadedVideos.length})
            </Text>
            {uploadedVideos.map((video, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{video.fileName}</Text>
                  <Text style={styles.fileDetails}>
                    {video.videoInfo.formattedSize} • {video.videoInfo.mimeType}
                  </Text>
                  <Text style={styles.fileCid}>
                    CID: {video.ipfsHash.substring(0, 30)}...
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() =>
                    testVideoPlayback(video.publicUrl, video.fileName)
                  }
                >
                  <Text style={styles.playButtonText}>🎬 Play Video</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Video Player Modal */}
      <Modal
        visible={showVideoPlayer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeVideoPlayer}
      >
        <SafeAreaView style={styles.videoPlayerContainer}>
          {/* Video Player Header */}
          <View style={styles.videoPlayerHeader}>
            <TouchableOpacity
              style={styles.closeVideoButton}
              onPress={closeVideoPlayer}
            >
              <Ionicons name="close" size={28} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.videoPlayerTitle} numberOfLines={1}>
              {selectedVideo?.fileName || "Video Player"}
            </Text>
            <View style={styles.videoPlayerHeaderSpacer} />
          </View>

          {/* Video Player Content */}
          <View style={styles.videoPlayerContent}>
            {selectedVideo && (
              <>
                {/* Loading indicator */}
                {isVideoLoading && (
                  <View style={styles.videoLoadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.videoLoadingText}>
                      Loading video...
                    </Text>
                  </View>
                )}

                {/* Video Component */}
                <Video
                  ref={videoRef}
                  style={styles.videoPlayer}
                  source={{ uri: selectedVideo.url }}
                  useNativeControls={true}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping={false}
                  onPlaybackStatusUpdate={handleVideoStatusUpdate}
                  onError={(error) => {
                    console.error("Video error:", error);
                    Alert.alert("Error", "Failed to load video");
                  }}
                />

                {/* Simple Controls */}
                {videoStatus.isLoaded && (
                  <View style={styles.videoControls}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={togglePlayPause}
                    >
                      <Ionicons
                        name={videoStatus.shouldPlay ? "pause" : "play"}
                        size={24}
                        color={Colors.white}
                      />
                      <Text style={styles.controlButtonText}>
                        {videoStatus.shouldPlay ? "Pause" : "Play"}
                      </Text>
                    </TouchableOpacity>

                    {videoStatus.isBuffering && (
                      <View style={styles.bufferingIndicator}>
                        <ActivityIndicator size="small" color={Colors.white} />
                        <Text style={styles.bufferingText}>Buffering...</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Video Info */}
                <View style={styles.videoInfo}>
                  <Text style={styles.videoInfoTitle}>Video Information</Text>

                  <View style={styles.videoInfoRow}>
                    <Text style={styles.videoInfoLabel}>File Name:</Text>
                    <Text style={styles.videoInfoValue} numberOfLines={1}>
                      {selectedVideo.fileName}
                    </Text>
                  </View>

                  <View style={styles.videoInfoRow}>
                    <Text style={styles.videoInfoLabel}>Source:</Text>
                    <Text style={styles.videoInfoValue} numberOfLines={1}>
                      IPFS Gateway
                    </Text>
                  </View>

                  {videoStatus.durationMillis && (
                    <View style={styles.videoInfoRow}>
                      <Text style={styles.videoInfoLabel}>Duration:</Text>
                      <Text style={styles.videoInfoValue}>
                        {formatDuration(videoStatus.durationMillis)}
                      </Text>
                    </View>
                  )}

                  {videoStatus.isLoaded && (
                    <View style={styles.videoInfoRow}>
                      <Text style={styles.videoInfoLabel}>Status:</Text>
                      <Text
                        style={[
                          styles.videoInfoValue,
                          { color: Colors.success },
                        ]}
                      >
                        ✅ Ready to play
                      </Text>
                    </View>
                  )}

                  <View style={styles.videoInfoRow}>
                    <Text style={styles.videoInfoLabel}>URL:</Text>
                    <Text style={styles.videoInfoUrl} numberOfLines={2}>
                      {selectedVideo.url}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 15,
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.lightGray,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  uploadButton: {
    marginTop: 10,
  },
  jsonInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: "top",
    marginBottom: 15,
    minHeight: 120,
  },
  uploadJsonButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingButton: {
    backgroundColor: Colors.gray,
  },
  uploadJsonButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  utilityButton: {
    backgroundColor: Colors.white,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 10,
  },
  utilityButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  fileItem: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  fileHash: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: "monospace",
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.gray,
  },
  openIcon: {
    fontSize: 20,
    marginLeft: 10,
  },
  // Video-specific styles
  usageGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  usageItem: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
  },
  usageLabel: {
    fontSize: 12,
    color: Colors.text,
    opacity: 0.7,
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
  usagePercent: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
    marginTop: 2,
  },
  warningsContainer: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFEAA7",
    marginTop: 8,
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: "#856404",
    lineHeight: 16,
  },
  testButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  testButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  playButton: {
    backgroundColor: Colors.success,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  playButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  // Video Player Modal Styles
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoPlayerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  closeVideoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  videoPlayerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
    marginHorizontal: 16,
    textAlign: "center",
  },
  videoPlayerHeaderSpacer: {
    width: 44, // Same width as close button
  },
  videoPlayerContent: {
    flex: 1,
    justifyContent: "center",
  },
  videoLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 10,
  },
  videoLoadingText: {
    color: Colors.white,
    fontSize: 16,
    marginTop: 12,
  },
  videoPlayer: {
    width: "100%",
    aspectRatio: 16 / 9, // Maintain 16:9 aspect ratio
    backgroundColor: "#000000",
    alignSelf: "center",
  },
  videoControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    marginHorizontal: 8,
  },
  controlButtonText: {
    color: Colors.white,
    fontSize: 14,
    marginLeft: 8,
    fontWeight: "500",
  },
  bufferingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  bufferingText: {
    color: Colors.white,
    fontSize: 14,
    marginLeft: 8,
  },
  videoInfo: {
    flex: 1,
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  videoInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 16,
  },
  videoInfoRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  videoInfoLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    width: 80,
    fontWeight: "500",
  },
  videoInfoValue: {
    flex: 1,
    fontSize: 14,
    color: Colors.white,
  },
  videoInfoUrl: {
    flex: 1,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "monospace",
  },
});

// Add some colors if not present
const ensureColors = () => {
  if (!Colors.white) Colors.white = "#FFFFFF";
  if (!Colors.success) Colors.success = "#4CAF50";
};

// Call ensureColors immediately
ensureColors();

// Add some colors to the Colors constant if not present
const defaultColors = {
  success: "#4CAF50",
  error: "#F44336",
  black: "#000000",
  white: "#FFFFFF",
};
