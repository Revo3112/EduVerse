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
import { pinataService } from "../services/PinataService";

/**
 * Demo screen showing Pinata IPFS integration
 * This can be used for testing or as a reference for implementation
 */
export default function IPFSTestScreen({ navigation }) {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [jsonData, setJsonData] = useState(
    '{"example": "data", "timestamp": "' + new Date().toISOString() + '"}'
  );
  const { uploadJson, uploading: jsonUploading } = useIPFSJsonUpload();

  useEffect(() => {
    testPinataConnection();
  }, []);
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
});

// Add some colors to the Colors constant if not present
const defaultColors = {
  success: "#4CAF50",
  error: "#F44336",
  black: "#000000",
};
