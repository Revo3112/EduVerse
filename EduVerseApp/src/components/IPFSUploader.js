import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { pinataService } from "../services/PinataService";
import { Colors } from "../constants/Colors";

/**
 * Reusable component for uploading files to IPFS via Pinata
 * Supports both image and document selection with progress tracking
 */
export const IPFSUploader = ({
  onUploadComplete,
  onUploadStart,
  onUploadProgress,
  accept = "all", // 'images', 'documents', 'all'
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  style,
  buttonText = "Upload to IPFS",
  metadata = {},
  keyValues = [],
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Handle file selection based on type
   */
  const selectFile = async () => {
    try {
      let result;

      if (accept === "images") {
        // Request camera/media library permissions
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant media library access to upload images."
          );
          return null;
        }

        // Show action sheet for image source
        Alert.alert("Select Image", "Choose an image source", [
          { text: "Camera", onPress: () => pickImage("camera") },
          { text: "Photo Library", onPress: () => pickImage("library") },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      } else {
        // Document picker for other file types
        result = await DocumentPicker.getDocumentAsync({
          type: accept === "documents" ? "application/*" : "*/*",
          copyToCacheDirectory: true,
          multiple: false,
        });
      }

      if (result && !result.canceled && result.assets && result.assets[0]) {
        await handleFileUpload(result.assets[0]);
      }
    } catch (error) {
      console.error("File selection error:", error);
      Alert.alert("Error", "Failed to select file. Please try again.");
    }
  };

  /**
   * Handle image picking from camera or library
   */
  const pickImage = async (source) => {
    try {
      let result;

      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant camera access to take photos."
          );
          return;
        }

        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      }

      if (result && !result.canceled && result.assets && result.assets[0]) {
        await handleFileUpload(result.assets[0]);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  /**
   * Handle the actual file upload to IPFS
   */
  const handleFileUpload = async (fileInfo) => {
    try {
      // Validate file size
      if (fileInfo.size && fileInfo.size > maxSizeBytes) {
        const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
        Alert.alert(
          "File Too Large",
          `Please select a file smaller than ${maxSizeMB}MB.`
        );
        return;
      }

      setUploading(true);
      setProgress(0);

      if (onUploadStart) {
        onUploadStart();
      }

      // Convert URI to Blob for upload
      const file = await uriToBlob(fileInfo.uri);
      const fileName =
        fileInfo.name || `file_${Date.now()}.${getFileExtension(fileInfo.uri)}`;

      // Upload options
      const uploadOptions = {
        name: fileName,
        metadata: {
          name: fileName,
          description: metadata.description || "Uploaded via EduVerse App",
          ...metadata,
        },
        keyValues: [
          { key: "app", value: "eduverse" },
          { key: "uploadedAt", value: new Date().toISOString() },
          { key: "platform", value: Platform.OS },
          ...keyValues,
        ],
        onProgress: (progressPercent) => {
          setProgress(progressPercent);
          if (onUploadProgress) {
            onUploadProgress(progressPercent);
          }
        },
      };

      // Upload to Pinata
      const result = await pinataService.uploadFile(file, uploadOptions);

      if (result.success) {
        Alert.alert("Success", "File uploaded to IPFS successfully!");
        if (onUploadComplete) {
          onUploadComplete({
            ...result,
            fileName,
            originalUri: fileInfo.uri,
            fileSize: fileInfo.size,
          });
        }
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", error.message || "Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  /**
   * Convert URI to Blob for upload
   */
  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  /**
   * Get file extension from URI
   */
  const getFileExtension = (uri) => {
    const lastDot = uri.lastIndexOf(".");
    return lastDot !== -1 ? uri.substring(lastDot + 1) : "bin";
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.uploadButton,
          disabled && styles.disabledButton,
          uploading && styles.uploadingButton,
        ]}
        onPress={selectFile}
        disabled={disabled || uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <View style={styles.uploadingContent}>
            <ActivityIndicator size="small" color={Colors.white} />
            <Text style={styles.uploadingText}>Uploading... {progress}%</Text>
          </View>
        ) : (
          <Text style={[styles.buttonText, disabled && styles.disabledText]}>
            {buttonText}
          </Text>
        )}
      </TouchableOpacity>

      {uploading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      )}
    </View>
  );
};

/**
 * Hook for uploading JSON data to IPFS
 */
export const useIPFSJsonUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadJson = async (data, options = {}) => {
    try {
      setUploading(true);

      const uploadOptions = {
        name: options.name || `data_${Date.now()}.json`,
        metadata: {
          name: options.name || "JSON Data",
          description:
            options.description || "JSON data uploaded via EduVerse App",
          ...options.metadata,
        },
        keyValues: [
          { key: "app", value: "eduverse" },
          { key: "uploadedAt", value: new Date().toISOString() },
          { key: "platform", value: Platform.OS },
          { key: "dataType", value: "json" },
          ...(options.keyValues || []),
        ],
      };

      const result = await pinataService.uploadJSON(data, uploadOptions);

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      return result;
    } catch (error) {
      console.error("JSON upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadJson, uploading };
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: Colors.gray,
    elevation: 0,
    shadowOpacity: 0,
  },
  uploadingButton: {
    backgroundColor: Colors.secondary,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  disabledText: {
    color: Colors.lightGray,
  },
  uploadingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  uploadingText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  progressContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.lightGray,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  progressText: {
    marginLeft: 10,
    fontSize: 12,
    color: Colors.gray,
    fontWeight: "500",
    minWidth: 35,
    textAlign: "right",
  },
});

export default IPFSUploader;
