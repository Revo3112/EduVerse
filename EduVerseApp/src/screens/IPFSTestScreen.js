import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import { IPFSUploader, useIPFSJsonUpload } from "../components/IPFSUploader";
import VideoUploader from "../components/VideoUploader";
import { pinataService } from "../services/PinataService";
import { videoService } from "../services/VideoService";

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

  // Test video playback
  const testVideoPlayback = (url) => {
    console.log("Testing video playback:", url);
    Alert.alert(
      "Video Playback Test",
      `URL: ${url}\n\nURL akan dibuka di browser untuk testing.`,
      [
        { text: "Cancel" },
        {
          text: "Open URL",
          onPress: () => console.log("Opening video URL:", url),
        },
      ]
    );
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
                  onPress={() => testVideoPlayback(video.publicUrl)}
                >
                  <Text style={styles.playButtonText}>▶️ Test Play</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
});

// Add some colors to the Colors constant if not present
const defaultColors = {
  success: "#4CAF50",
  error: "#F44336",
  black: "#000000",
};
