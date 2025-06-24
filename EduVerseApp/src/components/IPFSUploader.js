import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { pinataService } from "../services/PinataService";
import { Colors } from "../constants/Colors";

/**
 * IPFSUploader Component
 * Component untuk upload file ke IPFS via Pinata
 */
export const IPFSUploader = ({
  onUploadComplete,
  onUploadStart,
  onUploadProgress,
  onUploadError,
  accept = "all", // 'all', 'images', 'documents'
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  buttonText = "Upload File",
  style,
  disabled = false,
  metadata = {},
  keyValues = {},
  network = "private",
  groupId,
  buttonStyle,
  textStyle,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const handleFileSelection = async () => {
    if (disabled || uploading) return;

    try {
      let file = null;

      if (accept === "images") {
        // Request media library permissions
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant media library access to upload images."
          );
          return;
        }

        // Use ImagePicker for images
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          file = {
            uri: asset.uri,
            type: asset.type || "image/jpeg",
            name: asset.fileName || "image.jpg",
            size: asset.fileSize,
          };
          uploadFile(file);
        }
      } else {
        // Use DocumentPicker for all files or documents
        const result = await DocumentPicker.getDocumentAsync({
          type: accept === "documents" ? "application/*" : "*/*",
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          file = {
            uri: asset.uri,
            type: asset.mimeType,
            name: asset.name,
            size: asset.size,
          };
          uploadFile(file);
        }
      }
    } catch (error) {
      console.error("File selection error:", error);
      Alert.alert("Error", "Gagal memilih file");
      if (onUploadError) {
        onUploadError(error);
      }
    }
  };

  const uploadFile = async (file) => {
    try {
      // Validate file
      pinataService.validateFile(file, {
        maxSize: maxSizeBytes,
        allowedTypes: getAllowedTypes(accept),
      });

      setUploading(true);
      setProgress(0);

      if (onUploadStart) {
        onUploadStart();
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Convert file to File object for upload
      const fileBlob = await fetch(file.uri).then((r) => r.blob());
      const fileObject = new File([fileBlob], file.name, { type: file.type });

      const result = await pinataService.uploadFile(fileObject, {
        name: file.name,
        network,
        groupId,
        keyValues,
        metadata: {
          ...metadata,
          originalSize: file.size,
          uploadDate: new Date().toISOString(),
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (onUploadComplete) {
        onUploadComplete(result);
      }

      Alert.alert("Success", "File berhasil diupload ke IPFS!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", error.message || "Gagal upload file");

      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const getAllowedTypes = (accept) => {
    switch (accept) {
      case "images":
        return ["image/jpeg", "image/png", "image/gif", "image/webp"];
      case "documents":
        return [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
      default:
        return []; // Allow all types
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.uploadButton,
        buttonStyle,
        style,
        (disabled || uploading) && styles.disabledButton,
      ]}
      onPress={handleFileSelection}
      disabled={disabled || uploading}
    >
      {uploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={[styles.buttonText, textStyle, { marginLeft: 8 }]}>
            Uploading... {progress}%
          </Text>
        </View>
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{buttonText}</Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Custom hook untuk upload JSON data
 */
export const useIPFSJsonUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadJson = async (jsonData, options = {}) => {
    try {
      setUploading(true);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 15;
        });
      }, 100);

      const result = await pinataService.uploadJson(jsonData, {
        network: "private",
        ...options,
        metadata: {
          ...options.metadata,
          uploadDate: new Date().toISOString(),
          dataType: "json",
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      return result;
    } catch (error) {
      console.error("JSON upload error:", error);
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadJson,
    uploading,
    progress,
  };
};

/**
 * Custom hook untuk file operations
 */
export const useIPFSFileOperations = () => {
  const [loading, setLoading] = useState(false);

  const listFiles = async (options = {}) => {
    try {
      setLoading(true);
      return await pinataService.listFiles(options);
    } catch (error) {
      console.error("List files error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId, network = "private") => {
    try {
      setLoading(true);
      return await pinataService.deleteFile(fileId, network);
    } catch (error) {
      console.error("Delete file error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getFile = async (fileId, network = "private") => {
    try {
      setLoading(true);
      return await pinataService.getFile(fileId, network);
    } catch (error) {
      console.error("Get file error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateFile = async (fileId, updates, network = "private") => {
    try {
      setLoading(true);
      return await pinataService.updateFile(fileId, updates, network);
    } catch (error) {
      console.error("Update file error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    listFiles,
    deleteFile,
    getFile,
    updateFile,
    loading,
  };
};

const styles = StyleSheet.create({
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  disabledButton: {
    backgroundColor: Colors.gray,
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default IPFSUploader;
