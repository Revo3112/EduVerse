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

  // Fungsi untuk menentukan MIME type dari ekstensi file
  const getMimeTypeFromExtension = (fileName) => {
    if (!fileName) return null;

    const extension = fileName.toLowerCase().split(".").pop();
    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
      json: "application/json",
    };

    return mimeTypes[extension] || null;
  };

  const handleFileSelection = async () => {
    if (disabled || uploading) return;

    try {
      let file = null;

      if (accept === "images") {
        // Use ImagePicker for images
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 10],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];

          // PERBAIKAN: Deteksi MIME type yang lebih robust
          let mimeType = asset.type;

          // Jika asset.type tidak ada atau hanya "image", deteksi dari nama file
          if (!mimeType || mimeType === "image") {
            const fileName = asset.fileName || asset.uri.split("/").pop();
            const extension = fileName.toLowerCase().split(".").pop();

            switch (extension) {
              case "png":
                mimeType = "image/png";
                break;
              case "jpg":
              case "jpeg":
                mimeType = "image/jpeg";
                break;
              case "gif":
                mimeType = "image/gif";
                break;
              case "webp":
                mimeType = "image/webp";
                break;
              default:
                mimeType = "image/jpeg"; // fallback
            }
          }

          file = {
            uri: asset.uri,
            type: mimeType, // Pastikan MIME type yang benar
            name:
              asset.fileName || `image_${Date.now()}.${mimeType.split("/")[1]}`,
            size: asset.fileSize || 0,
          };

          console.log("Selected image file:", file); // Debug log
          uploadFile(file);
        }
      } else {
        // Use DocumentPicker for all files or documents
        const pickerOptions = {
          type:
            accept === "documents"
              ? [
                  "application/pdf",
                  "application/msword",
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ]
              : "*/*",
          copyToCacheDirectory: true,
        };

        const result = await DocumentPicker.getDocumentAsync(pickerOptions);

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];

          // Pastikan MIME type terdeteksi dengan benar
          let mimeType = asset.mimeType || getMimeTypeFromExtension(asset.name);

          file = {
            uri: asset.uri,
            type: mimeType,
            name: asset.name,
            size: asset.size || 0,
          };

          console.log("Selected document file:", file); // Debug log
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
      console.log("Starting upload with file:", file);

      // DEBUG: Tambahkan debug file structure
      pinataService.debugFileStructure(file);

      // Custom validation yang lebih toleran
      if (!file) {
        throw new Error("File tidak boleh kosong");
      }

      // Cek apakah file memiliki struktur yang valid
      if (!file.uri && !file._data && !file.name) {
        throw new Error("File tidak memiliki struktur yang valid");
      }

      const fileSize = file.size || file.fileSize || 0;
      if (fileSize > maxSizeBytes) {
        throw new Error(
          `Ukuran file terlalu besar. Maksimal: ${pinataService.formatFileSize(
            maxSizeBytes
          )}`
        );
      }

      // PERBAIKAN: Validasi tipe file yang lebih robust
      const allowedTypes = getAllowedTypes(accept);
      if (allowedTypes.length > 0) {
        let fileType = file.type;

        // Handle kasus dimana file.type = "image" (tidak spesifik)
        if (fileType === "image") {
          const fileName = file.name || "";
          const extension = fileName.toLowerCase().split(".").pop();

          // Map ekstensi ke MIME type yang benar
          const extensionMimeMap = {
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            webp: "image/webp",
          };

          fileType = extensionMimeMap[extension] || "image/jpeg";
          file.type = fileType; // Update file object
          console.log(`Corrected file type from "image" to "${fileType}"`);
        }

        if (fileType && !allowedTypes.includes(fileType)) {
          // Coba deteksi ulang berdasarkan ekstensi file
          const fileName = file.name || "";
          const detectedType = pinataService.detectMimeType(fileName);

          if (!detectedType || !allowedTypes.includes(detectedType)) {
            throw new Error(
              `Tipe file tidak diizinkan.\n` +
                `File type: "${fileType}"\n` +
                `Detected: "${detectedType}"\n` +
                `Diizinkan: ${allowedTypes.join(", ")}`
            );
          }

          // Update file type jika berhasil dideteksi
          file.type = detectedType;
        }
      }

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

      console.log("Final file object for upload:", {
        name: file.name,
        type: file.type,
        size: file.size,
        uri: file.uri,
        hasData: !!file._data,
      });

      const result = await pinataService.uploadFile(file, {
        name: file.name,
        network,
        groupId,
        keyValues: {
          ...keyValues,
          fileName: file.name,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          source: "EduVerse Mobile App",
        },
        metadata: {
          ...metadata,
          originalSize: file.size,
          mimeType: file.type,
          uploadDate: new Date().toISOString(),
          platform: "React Native",
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      console.log("Upload result:", {
        success: result.success,
        isDuplicate: result.isDuplicate,
        cid: result.ipfsHash,
        message: result.message,
      });

      if (onUploadComplete) {
        onUploadComplete({
          ...result,
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
          },
        });
      }

      // Show success message with duplicate info if applicable
      const successMessage = result.isDuplicate
        ? `File berhasil diupload!\n\n⚠️ Catatan: File ini sudah ada di IPFS (duplicate terdeteksi). Menggunakan versi yang sudah ada.`
        : "File berhasil diupload ke IPFS!";

      Alert.alert("Success", successMessage);
    } catch (error) {
      console.error("Upload error:", error);

      // Enhanced error messaging
      let userMessage = "Gagal upload file";

      if (error.message.includes("Network request failed")) {
        userMessage =
          "Koneksi jaringan bermasalah. Periksa internet Anda dan coba lagi.";
      } else if (
        error.message.includes("JWT") ||
        error.message.includes("401")
      ) {
        userMessage = "Masalah autentikasi. Silakan hubungi support.";
      } else if (error.message.includes("terlalu besar")) {
        userMessage = error.message; // Use the formatted message from our service
      } else if (error.message.includes("timeout")) {
        userMessage = "Upload timeout. Coba lagi dengan file yang lebih kecil.";
      } else {
        userMessage = error.message || "Terjadi kesalahan saat upload";
      }

      Alert.alert("Error", userMessage);

      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Helper function untuk mendapatkan allowed types
  const getAllowedTypes = (accept) => {
    switch (accept) {
      case "images":
        return ["image/jpeg", "image/png", "image/gif", "image/webp"];
      case "documents":
        return [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ];
      case "all":
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
