/**
 * VideoUploader.js - Video Upload Component
 * Component khusus untuk upload video ke IPFS dengan optimasi free tier
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { videoService } from "../services/VideoService";
import { Colors } from "../constants/Colors";

// Safety check for Colors.light object
if (!Colors.light) {
  console.error("Colors.light is not defined! This will cause runtime errors.");
  // Provide fallback colors to prevent crashes
  Colors.light = {
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
  };
}

const { width, height } = Dimensions.get("window");

export const VideoUploader = ({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  courseId,
  sectionId,
  style,
  disabled = false,
  showUsageInfo = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [usageInfo, setUsageInfo] = useState(null);
  const [showCompressionTips, setShowCompressionTips] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);

  // Load usage info on component mount
  React.useEffect(() => {
    if (showUsageInfo) {
      loadUsageInfo();
    }
  }, [showUsageInfo]);

  const loadUsageInfo = async () => {
    try {
      const usage = await videoService.getCurrentUsage();
      setUsageInfo(usage);
    } catch (error) {
      console.warn("Could not load usage info:", error.message);
    }
  };

  const handleVideoSelection = async () => {
    if (disabled || uploading) return;

    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Aplikasi memerlukan akses ke galeri untuk memilih video.",
          [{ text: "OK" }]
        );
        return;
      }

      // Launch video picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false, // Keep original quality
        quality: 1.0, // Don't compress automatically
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Create file object
        const videoFile = {
          uri: asset.uri,
          type:
            asset.type ||
            videoService.detectMimeType(asset.fileName || asset.uri),
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: asset.fileSize || 0,
        };

        console.log("Selected video:", videoFile);
        setCurrentFile(videoFile);

        // Validate video
        const validation = videoService.validateVideo(videoFile);

        if (!validation.isValid) {
          if (validation.compressionRequired) {
            showCompressionDialog(videoFile, validation);
          } else {
            Alert.alert("Video Error", validation.error);
          }
          return;
        }

        // Check capacity
        const capacityCheck = await videoService.canUploadVideo(videoFile.size);

        if (!capacityCheck.possible) {
          Alert.alert(
            "Upload Tidak Memungkinkan",
            capacityCheck.warnings.join("\n"),
            [
              { text: "OK" },
              {
                text: "Lihat Tips",
                onPress: () => setShowCompressionTips(true),
              },
            ]
          );
          return;
        }

        // Show warnings if any
        if (
          capacityCheck.warnings.length > 0 ||
          validation.warnings.length > 0
        ) {
          const allWarnings = [
            ...capacityCheck.warnings,
            ...validation.warnings,
          ];
          Alert.alert("Peringatan Upload", allWarnings.join("\n"), [
            { text: "Batal", style: "cancel" },
            {
              text: "Lanjutkan",
              onPress: () => uploadVideo(videoFile),
            },
          ]);
        } else {
          uploadVideo(videoFile);
        }
      }
    } catch (error) {
      console.error("Video selection error:", error);
      Alert.alert("Error", `Gagal memilih video: ${error.message}`);
    }
  };

  const uploadVideo = async (videoFile) => {
    try {
      setUploading(true);
      setProgress(0);
      onUploadStart?.(videoFile);

      console.log("Starting video upload:", videoFile.name);

      // Upload with progress simulation (Pinata doesn't provide real progress yet)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + Math.random() * 10;
          return prev;
        });
      }, 500);

      const result = await videoService.uploadVideo(videoFile, {
        courseId,
        sectionId,
        metadata: {
          uploadSource: "VideoUploader",
          uploadedAt: new Date().toISOString(),
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log("Video upload completed:", result);

      // Update usage info
      if (showUsageInfo) {
        await loadUsageInfo();
      }

      setUploading(false);
      onUploadComplete?.(result);

      Alert.alert(
        "Upload Berhasil! 🎉",
        `Video "${videoFile.name}" berhasil diupload ke IPFS.\n\n` +
          `Ukuran: ${result.videoInfo.formattedSize}\n` +
          `CID: ${result.ipfsHash.substring(0, 20)}...`,
        [
          { text: "OK" },
          {
            text: "Copy URL",
            onPress: () => {
              console.log("Video URL:", result.publicUrl);
              // Could implement clipboard copy here
            },
          },
        ]
      );
    } catch (error) {
      setUploading(false);
      setProgress(0);
      console.error("Video upload error:", error);
      onUploadError?.(error);

      Alert.alert("Upload Gagal", `Video upload gagal: ${error.message}`, [
        { text: "OK" },
        {
          text: "Coba Lagi",
          onPress: () => uploadVideo(videoFile),
        },
      ]);
    }
  };

  const showCompressionDialog = (videoFile, validation) => {
    Alert.alert(
      "Kompresi Diperlukan",
      `Video terlalu besar (${
        validation.formattedSize || videoService.formatFileSize(videoFile.size)
      }) untuk free plan.\n\n` +
        "Maksimal: 100MB\n\n" +
        "Silakan kompres video terlebih dahulu.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Lihat Tips Kompresi",
          onPress: () => setShowCompressionTips(true),
        },
      ]
    );
  };

  const CompressionTipsModal = () => {
    if (!showCompressionTips) return null;

    const tips = videoService.getOptimizationTips(currentFile?.size);

    return (
      <Modal
        visible={showCompressionTips}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tips Kompresi Video 🎬</Text>
            <TouchableOpacity
              onPress={() => setShowCompressionTips(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {tips.urgent && (
              <View style={styles.urgentSection}>
                <Text style={styles.sectionTitle}>🚨 Tindakan Diperlukan</Text>
                {tips.urgent.map((tip, index) => (
                  <Text key={index} style={styles.urgentText}>
                    • {tip}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Pengaturan Optimal</Text>
              <Text style={styles.tipText}>
                Format: {tips.general.recommendedFormats.join(", ")}
              </Text>
              <Text style={styles.tipText}>
                Ukuran maksimal: {tips.general.maxFileSize}
              </Text>
              <Text style={styles.tipText}>
                Ukuran optimal: {tips.general.optimalSize}
              </Text>
              <Text style={styles.tipText}>
                Resolusi: {tips.general.encoding.resolution.standard}
              </Text>
              <Text style={styles.tipText}>
                Frame Rate: {tips.general.encoding.frameRate}
              </Text>
              <Text style={styles.tipText}>
                Bitrate: {tips.general.encoding.bitrate.medium}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛠️ Tools Kompresi</Text>
              {tips.tools.map((tool, index) => (
                <Text key={index} style={styles.tipText}>
                  • {tool}
                </Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Tips Free Tier</Text>
              {tips.freeTierSpecific.map((tip, index) => (
                <Text key={index} style={styles.tipText}>
                  • {tip}
                </Text>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚙️ Langkah Kompresi</Text>
              <Text style={styles.tipText}>1. Download HandBrake (gratis)</Text>
              <Text style={styles.tipText}>
                2. Pilih preset "Web {"\u003E"} Very Fast 720p30"
              </Text>
              <Text style={styles.tipText}>
                3. Sesuaikan bitrate ke 1500-2000 kbps
              </Text>
              <Text style={styles.tipText}>
                4. Export dan upload hasil kompresi
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const UsageInfo = () => {
    if (!showUsageInfo || !usageInfo) return null;

    const isWarning =
      usageInfo.storage.usedPercent > 80 || usageInfo.files.usedPercent > 80;

    return (
      <View
        style={[styles.usageContainer, isWarning && styles.warningContainer]}
      >
        <Text style={styles.usageTitle}>📊 Free Plan Usage</Text>
        <Text style={styles.usageText}>
          Storage: {usageInfo.storage.usedFormatted} /{" "}
          {usageInfo.storage.limitFormatted} (
          {usageInfo.storage.usedPercent.toFixed(1)}%)
        </Text>
        <Text style={styles.usageText}>
          Files: {usageInfo.files.used} / {usageInfo.files.limit} (
          {usageInfo.files.usedPercent.toFixed(1)}%)
        </Text>
        {usageInfo.videos.count > 0 && (
          <Text style={styles.usageText}>
            Videos: {usageInfo.videos.count} (
            {usageInfo.videos.storageFormatted})
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <UsageInfo />

      <TouchableOpacity
        style={[
          styles.uploadButton,
          disabled && styles.disabledButton,
          uploading && styles.uploadingButton,
        ]}
        onPress={handleVideoSelection}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <View style={styles.uploadingContent}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.uploadingText}>
              Uploading... {progress.toFixed(0)}%
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.uploadButtonText}>🎬 Upload Video</Text>
            <Text style={styles.uploadButtonSubtext}>
              Max: 100MB • Format: MP4, WebM, MOV
            </Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tipsButton}
        onPress={() => setShowCompressionTips(true)}
      >
        <Text style={styles.tipsButtonText}>💡 Tips Kompresi</Text>
      </TouchableOpacity>

      <CompressionTipsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  usageContainer: {
    backgroundColor: Colors.light.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.tabIconDefault,
  },
  warningContainer: {
    backgroundColor: "#FFF3CD",
    borderColor: "#FFEAA7",
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 4,
  },
  usageText: {
    fontSize: 12,
    color: Colors.light.text,
    opacity: 0.8,
  },
  uploadButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: Colors.light.tabIconDefault,
    opacity: 0.6,
  },
  uploadingButton: {
    backgroundColor: Colors.light.tint,
    opacity: 0.8,
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  uploadButtonSubtext: {
    color: "#ffffff",
    fontSize: 12,
    opacity: 0.9,
  },
  uploadingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  uploadingText: {
    color: "#ffffff",
    fontSize: 14,
    marginLeft: 8,
  },
  tipsButton: {
    backgroundColor: "transparent",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  tipsButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: "500",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.tabIconDefault,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.tabIconDefault,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  urgentSection: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  urgentText: {
    fontSize: 14,
    color: "#D32F2F",
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: "500",
  },
});

export default VideoUploader;
