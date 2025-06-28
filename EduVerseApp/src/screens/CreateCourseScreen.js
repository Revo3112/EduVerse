// src/screens/CreateCourseScreen.js - Updated with Web3Context
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { pinataService } from "../services/PinataService";
import { videoService } from "../services/VideoService";
import { useCreateCourse, useETHPrice } from "../hooks/useBlockchain";
import AddSectionModal from "../components/AddSectionModal";

export default function CreateCourseScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const {
    createCourse,
    loading: isCreatingCourse,
    progress: createProgress,
  } = useCreateCourse();
  const { maxPriceETH } = useETHPrice();

  // Course data state
  const [courseData, setCourseData] = useState({
    title: "",
    description: "",
    price: "",
    isPaid: false,
    thumbnailFile: null,
    thumbnailUrl: "",
  });

  const [sections, setSections] = useState([]);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);

  // Upload process state
  const [currentPhase, setCurrentPhase] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({
    phase: 0,
    percentage: 0,
    message: "",
    completedFiles: 0,
    totalFiles: 0,
    completedSections: 0,
    totalSections: 0,
  });

  // Upload results state
  const [uploadResults, setUploadResults] = useState({
    thumbnailCID: null,
    videoCIDs: new Map(),
    courseId: null,
    sectionIds: [],
    transactionHashes: [],
  });

  // Validation state
  const [currentMaxPrice, setCurrentMaxPrice] = useState(null);
  const [priceValidationError, setPriceValidationError] = useState("");

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  // Input handlers
  const handleInputChange = (field, value) => {
    setCourseData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleThumbnailSelect = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera roll permissions needed.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert("File Too Large", "Please select image < 5MB.");
          return;
        }

        setCourseData((prev) => ({
          ...prev,
          thumbnailFile: {
            uri: asset.uri,
            type: asset.type || "image/jpeg",
            name: asset.fileName || `thumbnail_${Date.now()}.jpg`,
            size: asset.fileSize,
          },
          thumbnailUrl: asset.uri,
        }));

        console.log("✅ Thumbnail selected:", asset.fileName);
      }
    } catch (error) {
      console.error("Error selecting thumbnail:", error);
      Alert.alert("Error", "Failed to select image.");
    }
  };

  // Section handlers
  const handleAddSection = useCallback(
    (sectionData) => {
      if (sections.length >= 50) {
        Alert.alert("Error", "Maximum 50 sections allowed per course");
        return;
      }

      const duplicateTitle = sections.find(
        (section) =>
          section.title.toLowerCase().trim() === sectionData.title.toLowerCase()
      );
      if (duplicateTitle) {
        Alert.alert("Error", "Section title already exists");
        return;
      }

      const newSection = {
        id: Date.now() + Math.random(),
        title: sectionData.title,
        duration: sectionData.duration,
        videoFile: sectionData.videoFile,
        orderId: sections.length,
        createdAt: new Date().toISOString(),
        uploadStatus: sectionData.videoFile ? "pending" : "no-video",
      };

      setSections((prev) => [...prev, newSection]);
      console.log("✅ Section added:", newSection.title);
    },
    [sections]
  );

  const removeSection = useCallback((sectionId) => {
    Alert.alert("Remove Section", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setSections((prev) => prev.filter((s) => s.id !== sectionId));
        },
      },
    ]);
  }, []);

  // Validation functions
  const validateCourseData = () => {
    // Title validation
    if (!courseData.title.trim()) {
      Alert.alert("Error", "Course title is required");
      return false;
    }
    if (courseData.title.trim().length > 200) {
      Alert.alert("Error", "Title cannot exceed 200 characters");
      return false;
    }

    // Description validation
    if (!courseData.description.trim()) {
      Alert.alert("Error", "Course description is required");
      return false;
    }
    if (courseData.description.trim().length > 1000) {
      Alert.alert("Error", "Description cannot exceed 1000 characters");
      return false;
    }

    // Thumbnail validation
    if (!courseData.thumbnailFile) {
      Alert.alert("Error", "Please select a thumbnail image");
      return false;
    }

    // Price validation
    if (courseData.isPaid) {
      if (!courseData.price.trim()) {
        Alert.alert("Error", "Please enter a price for paid course");
        return false;
      }
      const priceValue = parseFloat(courseData.price);
      if (isNaN(priceValue) || priceValue <= 0) {
        Alert.alert("Error", "Please enter valid price > 0");
        return false;
      }
      if (currentMaxPrice && priceValue > currentMaxPrice) {
        Alert.alert(
          "Error",
          `Price exceeds maximum limit of ${currentMaxPrice.toFixed(6)} ETH`
        );
        return false;
      }
    }

    // Sections validation
    if (sections.length === 0) {
      Alert.alert("Error", "Please add at least one section");
      return false;
    }

    // Validate each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      if (!section.title.trim() || section.title.trim().length > 200) {
        Alert.alert("Error", `Section ${i + 1} title invalid (max 200 chars)`);
        return false;
      }

      if (
        !section.duration ||
        section.duration <= 0 ||
        section.duration > 86400
      ) {
        Alert.alert(
          "Error",
          `Section ${i + 1} duration invalid (max 24 hours)`
        );
        return false;
      }
    }

    return true;
  };

  // Phase 1: Upload all files to IPFS
  const executePhase1_UploadFiles = async () => {
    console.log("🚀 PHASE 1: Starting file uploads to IPFS");
    setCurrentPhase(1);
    setUploadProgress({
      phase: 1,
      percentage: 0,
      message: "Uploading files to IPFS...",
      completedFiles: 0,
      totalFiles: 0,
      completedSections: 0,
      totalSections: sections.length,
    });

    const filesToUpload = [];

    // Add thumbnail to upload queue
    if (courseData.thumbnailFile) {
      filesToUpload.push({
        type: "thumbnail",
        file: courseData.thumbnailFile,
        id: "thumbnail",
      });
    }

    // Add videos to upload queue
    sections.forEach((section) => {
      if (section.videoFile) {
        filesToUpload.push({
          type: "video",
          file: section.videoFile,
          id: section.id,
          sectionTitle: section.title,
        });
      }
    });

    const totalFiles = filesToUpload.length;
    setUploadProgress((prev) => ({ ...prev, totalFiles }));

    console.log(`📤 Uploading ${totalFiles} files to IPFS...`);

    let completedFiles = 0;
    const results = {
      thumbnailCID: null,
      videoCIDs: new Map(),
    };

    // Upload files sequentially
    for (const fileItem of filesToUpload) {
      try {
        console.log(`📁 Uploading ${fileItem.type}: ${fileItem.file.name}`);

        setUploadProgress((prev) => ({
          ...prev,
          message: `Uploading ${fileItem.type}: ${fileItem.file.name}`,
          percentage: Math.round((completedFiles / totalFiles) * 100),
        }));

        let uploadResult;

        if (fileItem.type === "thumbnail") {
          uploadResult = await pinataService.uploadFile(fileItem.file, {
            name: `course_thumbnail_${Date.now()}`,
            network: "public",
            keyvalues: {
              category: "thumbnail",
              courseTitle: courseData.title.trim(),
              app: "eduverse",
              creator: address,
              uploadedAt: new Date().toISOString(),
            },
          });

          if (uploadResult.success) {
            results.thumbnailCID = uploadResult.ipfsHash.replace("ipfs://", "");
            console.log(`✅ Thumbnail uploaded: ${results.thumbnailCID}`);
          } else {
            throw new Error(uploadResult.error || "Thumbnail upload failed");
          }
        } else if (fileItem.type === "video") {
          uploadResult = await videoService.uploadVideoPublic(fileItem.file, {
            courseId: "temp-course",
            sectionId: fileItem.id.toString(),
            name: fileItem.file.name,
            metadata: {
              uploadSource: "CreateCourseScreen",
              sectionTitle: fileItem.sectionTitle,
              uploadedAt: new Date().toISOString(),
            },
          });

          if (uploadResult.success) {
            const videoCID = uploadResult.ipfsHash.replace("ipfs://", "");
            results.videoCIDs.set(fileItem.id, videoCID);
            console.log(
              `✅ Video uploaded for section ${fileItem.sectionTitle}: ${videoCID}`
            );
          } else {
            throw new Error(uploadResult.error || "Video upload failed");
          }
        }

        completedFiles++;
        setUploadProgress((prev) => ({
          ...prev,
          completedFiles,
          percentage: Math.round((completedFiles / totalFiles) * 100),
        }));

        // Small delay between uploads
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to upload ${fileItem.type}:`, error);
        throw new Error(`Failed to upload ${fileItem.type}: ${error.message}`);
      }
    }

    console.log("✅ PHASE 1 COMPLETED: All files uploaded to IPFS");
    setUploadResults((prev) => ({
      ...prev,
      thumbnailCID: results.thumbnailCID,
      videoCIDs: results.videoCIDs,
    }));

    return results;
  };

  // Main course creation orchestrator
  const handleCreateCourse = async () => {
    if (!validateCourseData()) return;

    if (isCreatingCourse) {
      Alert.alert("Please wait", "Course creation already in progress");
      return;
    }

    const videosToUpload = sections.filter((s) => s.videoFile).length;
    const totalFiles = videosToUpload + (courseData.thumbnailFile ? 1 : 0);

    Alert.alert(
      "Create Course",
      `Ready to create course with ${sections.length} sections?\n\n` +
        `Title: ${courseData.title}\n` +
        `Price: ${courseData.isPaid ? `${courseData.price} ETH` : "Free"}\n` +
        `Files to upload: ${totalFiles}\n\n` +
        `Process:\n1. Upload files to IPFS\n2. Create course on blockchain\n3. Add sections\n\n` +
        `Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create Course", onPress: executeCreateCourse },
      ]
    );
  };

  const executeCreateCourse = async () => {
    try {
      console.log("🚀 Starting course creation process");

      // Phase 1: Upload all files to IPFS
      const uploadedFiles = await executePhase1_UploadFiles();

      // Prepare sections with CIDs
      const sectionsWithCIDs = sections.map((section) => ({
        title: section.title,
        duration: section.duration,
        contentCID:
          uploadedFiles.videoCIDs.get(section.id) ||
          "placeholder-video-content",
      }));

      // Create course with sections
      const courseResult = await createCourse(
        {
          title: courseData.title.trim(),
          description: courseData.description.trim(),
          thumbnailCID: uploadedFiles.thumbnailCID,
          pricePerMonth: courseData.isPaid ? courseData.price : "0",
        },
        sectionsWithCIDs
      );

      if (courseResult.success) {
        Alert.alert(
          "Success! 🎉",
          `✅ Course created successfully!\n\n` +
            `📚 Course ID: ${courseResult.courseId}\n` +
            `📖 Sections: ${courseResult.sectionsAdded}/${courseResult.totalSections} added\n` +
            `🖼️ Thumbnail: ${uploadedFiles.thumbnailCID.substring(
              0,
              12
            )}...\n` +
            `🎬 Videos: ${uploadedFiles.videoCIDs.size} uploaded\n` +
            `💰 Price: ${
              courseData.isPaid ? `${courseData.price} ETH/month` : "Free"
            }`
        );

        resetForm();
        navigation.navigate("MyCourses");
      } else {
        throw new Error(courseResult.error || "Failed to create course");
      }
    } catch (error) {
      console.error("❌ Course creation failed:", error);
      handleCreateCourseError(error);
    }
  };

  // Helper functions
  const handleCreateCourseError = (error) => {
    let errorMessage = "Failed to create course.";

    if (
      error.message.includes("user rejected") ||
      error.message.includes("User denied")
    ) {
      errorMessage = "Transaction was rejected by user.";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage = "Insufficient funds for transaction fees.";
    } else if (error.message.includes("timeout")) {
      errorMessage = "Process timed out. Please try again.";
    } else if (
      error.message.includes("IPFS") ||
      error.message.includes("upload")
    ) {
      errorMessage = `File upload failed: ${error.message}`;
    } else {
      errorMessage = `Failed to create course: ${error.message}`;
    }

    Alert.alert("Error", errorMessage);
  };

  const resetForm = () => {
    setCourseData({
      title: "",
      description: "",
      price: "",
      isPaid: false,
      thumbnailFile: null,
      thumbnailUrl: "",
    });
    setSections([]);
    setUploadResults({
      thumbnailCID: null,
      videoCIDs: new Map(),
      courseId: null,
      sectionIds: [],
      transactionHashes: [],
    });
  };

  // Price validation effects
  useEffect(() => {
    if (maxPriceETH) {
      setCurrentMaxPrice(parseFloat(maxPriceETH));
      console.log("📊 Maximum price allowed:", maxPriceETH, "ETH");
    }
  }, [maxPriceETH]);

  useEffect(() => {
    if (courseData.isPaid && courseData.price && currentMaxPrice) {
      const priceValue = parseFloat(courseData.price);
      if (isNaN(priceValue)) {
        setPriceValidationError("Please enter a valid number");
      } else if (priceValue <= 0) {
        setPriceValidationError("Price must be greater than 0");
      } else if (priceValue > currentMaxPrice) {
        setPriceValidationError(
          `Price cannot exceed ${currentMaxPrice.toFixed(6)} ETH (≈ $2 USD)`
        );
      } else {
        setPriceValidationError("");
      }
    } else {
      setPriceValidationError("");
    }
  }, [courseData.price, courseData.isPaid, currentMaxPrice]);

  // Render guards
  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="wallet-outline" size={64} color="#ccc" />
          <Text style={styles.notConnectedTitle}>Wallet Not Connected</Text>
          <Text style={styles.notConnectedSubtitle}>
            Connect your wallet to create courses
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isOnMantaNetwork) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="warning-outline" size={64} color="#ff9500" />
          <Text style={styles.warningTitle}>Wrong Network</Text>
          <Text style={styles.warningSubtitle}>
            Please switch to Manta Pacific Testnet
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate totals for UI
  const videosToUpload = sections.filter((s) => s.videoFile).length;
  const totalFiles = videosToUpload + (courseData.thumbnailFile ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create New Course</Text>
          <Text style={styles.subtitle}>
            3-Phase Upload: Files → Course → Sections
          </Text>
        </View>

        <View style={styles.form}>
          {/* Basic Course Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Course Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter course title (max 200 chars)"
                value={courseData.title}
                onChangeText={(text) => handleInputChange("title", text)}
                placeholderTextColor="#999"
                maxLength={200}
              />
              <Text style={styles.helperText}>
                {courseData.title.length}/200 characters
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what students will learn (max 1000 chars)"
                value={courseData.description}
                onChangeText={(text) => handleInputChange("description", text)}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#999"
                maxLength={1000}
              />
              <Text style={styles.helperText}>
                {courseData.description.length}/1000 characters
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Thumbnail Image *</Text>
              <TouchableOpacity
                style={[
                  styles.thumbnailUploadArea,
                  courseData.thumbnailFile && styles.thumbnailSelected,
                ]}
                onPress={handleThumbnailSelect}
                disabled={isCreatingCourse}
              >
                {courseData.thumbnailFile ? (
                  <View style={styles.thumbnailPreview}>
                    <Image
                      source={{ uri: courseData.thumbnailUrl }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                    <View style={styles.thumbnailOverlay}>
                      <Ionicons
                        name="checkmark-circle"
                        size={32}
                        color="#4caf50"
                      />
                      <Text style={styles.thumbnailSelectedText}>
                        Ready for Upload
                      </Text>
                      <Text style={styles.thumbnailChangeText}>
                        Tap to change
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons name="image-outline" size={48} color="#9e9e9e" />
                    <Text style={styles.thumbnailPlaceholderText}>
                      Tap to select thumbnail
                    </Text>
                    <Text style={styles.thumbnailRequirements}>
                      16:9 aspect ratio, max 5MB
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Pricing</Text>

            <View style={styles.switchGroup}>
              <View style={styles.switchInfo}>
                <Text style={styles.label}>Paid Course</Text>
                <Text style={styles.switchSubtext}>
                  Enable to charge for this course
                </Text>
              </View>
              <Switch
                value={courseData.isPaid}
                onValueChange={(value) => handleInputChange("isPaid", value)}
                trackColor={{ false: "#767577", true: "#9747FF" }}
                thumbColor={courseData.isPaid ? "#fff" : "#f4f3f4"}
              />
            </View>

            {courseData.isPaid && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price per Month (ETH)</Text>
                <TextInput
                  style={[
                    styles.input,
                    priceValidationError && styles.inputError,
                  ]}
                  placeholder={
                    currentMaxPrice
                      ? `Max: ${currentMaxPrice.toFixed(6)} ETH`
                      : "0.001"
                  }
                  value={courseData.price}
                  onChangeText={(text) => handleInputChange("price", text)}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
                {priceValidationError ? (
                  <Text style={styles.errorText}>{priceValidationError}</Text>
                ) : currentMaxPrice ? (
                  <Text style={styles.helpText}>
                    Maximum: {currentMaxPrice.toFixed(6)} ETH (≈ $2 USD)
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Course Sections */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📖 Course Sections</Text>
              <TouchableOpacity
                style={styles.addSectionButton}
                onPress={() => setShowAddSectionModal(true)}
                disabled={isCreatingCourse}
              >
                <Ionicons name="add" size={20} color="#9747FF" />
                <Text style={styles.addSectionText}>Add Section</Text>
              </TouchableOpacity>
            </View>

            {sections.length > 0 ? (
              <View style={styles.sectionsContainer}>
                {sections.map((section, index) => (
                  <SectionItem
                    key={section.id}
                    section={section}
                    index={index}
                    onRemove={removeSection}
                    disabled={isCreatingCourse}
                  />
                ))}
                <View style={styles.sectionsSummary}>
                  <Text style={styles.sectionsCount}>
                    {sections.length} section{sections.length !== 1 ? "s" : ""}{" "}
                    added
                  </Text>
                  {videosToUpload > 0 && (
                    <Text style={styles.videosSummary}>
                      📹 {videosToUpload} video{videosToUpload !== 1 ? "s" : ""}{" "}
                      ready
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptySections}>
                <Ionicons name="document-outline" size={48} color="#ccc" />
                <Text style={styles.emptySectionsText}>
                  No sections added yet. Add your first section to get started.
                </Text>
              </View>
            )}
          </View>

          {/* Upload Summary */}
          {totalFiles > 0 && (
            <View style={styles.uploadSummary}>
              <Text style={styles.uploadSummaryTitle}>📤 Upload Process</Text>
              <Text style={styles.uploadSummaryText}>
                3-Phase Creation Process:
              </Text>
              <View style={styles.phasesList}>
                <Text style={styles.phaseItem}>
                  📁 Phase 1: Upload {totalFiles} file
                  {totalFiles !== 1 ? "s" : ""} to IPFS
                </Text>
                <Text style={styles.phaseItem}>
                  🔗 Phase 2: Create course on blockchain
                </Text>
                <Text style={styles.phaseItem}>
                  📚 Phase 3: Add {sections.length} section
                  {sections.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <Text style={styles.uploadSummaryNote}>
                💡 Each phase waits for completion before proceeding
              </Text>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (sections.length === 0 ||
                isCreatingCourse ||
                !courseData.thumbnailFile ||
                priceValidationError) &&
                styles.disabledButton,
            ]}
            onPress={handleCreateCourse}
            disabled={
              sections.length === 0 ||
              isCreatingCourse ||
              !courseData.thumbnailFile ||
              !!priceValidationError
            }
          >
            {isCreatingCourse ? (
              <View style={styles.creatingContent}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.createButtonText}>
                  {uploadProgress.message || "Creating Course..."}
                </Text>
              </View>
            ) : (
              <View style={styles.createContent}>
                <Ionicons name="rocket-outline" size={20} color="white" />
                <Text style={styles.createButtonText}>
                  Create Course {totalFiles > 0 && `(${totalFiles} files)`}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Progress Display */}
          {isCreatingCourse && (
            <View style={styles.progressContainer}>
              <View style={styles.phaseIndicator}>
                <Text style={styles.phaseText}>
                  {uploadProgress.phase === 1
                    ? "Phase 1/2: Uploading Files"
                    : "Phase 2/2: Creating Course"}
                </Text>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${createProgress}%` }]}
                />
              </View>

              <Text style={styles.progressText}>{uploadProgress.message}</Text>

              <View style={styles.progressStats}>
                <Text style={styles.progressStat}>{createProgress}%</Text>
                {uploadProgress.phase === 1 && (
                  <Text style={styles.progressStat}>
                    Files: {uploadProgress.completedFiles}/
                    {uploadProgress.totalFiles}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Info Cards */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#9747FF"
            />
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>Smart Contract Process:</Text>
              {"\n"}• Files uploaded to IPFS for decentralized storage
              {"\n"}• Course created on Manta Pacific blockchain
              {"\n"}• Sections added with IPFS content references
              {"\n"}• No timeout issues with sequential processing
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Section Modal */}
      <AddSectionModal
        visible={showAddSectionModal}
        onClose={() => setShowAddSectionModal(false)}
        onSave={handleAddSection}
        isEditing={false}
      />
    </SafeAreaView>
  );
}

// Section Item Component
const SectionItem = React.memo(({ section, index, onRemove, disabled }) => (
  <View style={styles.sectionItem}>
    <View style={styles.sectionInfo}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {index + 1}. {section.title}
        </Text>
        {section.videoFile && (
          <View style={styles.videoStatusBadge}>
            <Ionicons name="videocam" size={16} color="#9747FF" />
            <Text style={styles.videoStatusText}>Video Ready</Text>
          </View>
        )}
      </View>
      <Text style={styles.sectionDuration}>
        {Math.round(section.duration / 60)} minutes ({section.duration} seconds)
      </Text>
      {section.videoFile && (
        <Text style={styles.sectionVideoFile}>📹 {section.videoFile.name}</Text>
      )}
    </View>
    <TouchableOpacity
      style={[styles.removeButton, disabled && styles.disabledRemoveButton]}
      onPress={() => onRemove(section.id)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons
        name="trash-outline"
        size={20}
        color={disabled ? "#ccc" : "#ff4444"}
      />
    </TouchableOpacity>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  notConnectedSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff9500",
    marginTop: 20,
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  form: {
    padding: 20,
    paddingTop: 10,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#333",
  },
  inputError: {
    borderColor: "#ff4444",
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: "#ff4444",
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  switchInfo: {
    flex: 1,
  },
  switchSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },

  // Thumbnail styles
  thumbnailUploadArea: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailSelected: {
    borderColor: "#9747FF",
    borderStyle: "solid",
    backgroundColor: "white",
  },
  thumbnailPreview: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  thumbnailSelectedText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  thumbnailChangeText: {
    color: "white",
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    padding: 20,
  },
  thumbnailPlaceholderText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginTop: 12,
    marginBottom: 8,
  },
  thumbnailRequirements: {
    fontSize: 12,
    color: "#9e9e9e",
    textAlign: "center",
  },

  // Section styles
  addSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9747FF",
  },
  addSectionText: {
    color: "#9747FF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  sectionsContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionInfo: {
    flex: 1,
  },
  videoStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  videoStatusText: {
    fontSize: 12,
    color: "#333",
    marginLeft: 4,
    fontWeight: "500",
  },
  sectionDuration: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  sectionVideoFile: {
    fontSize: 12,
    color: "#9747FF",
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  disabledRemoveButton: {
    opacity: 0.5,
  },
  sectionsSummary: {
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  sectionsCount: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  videosSummary: {
    fontSize: 12,
    color: "#9747FF",
    marginTop: 4,
    fontWeight: "500",
  },
  emptySections: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  emptySectionsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },

  // Upload summary styles
  uploadSummary: {
    backgroundColor: "#f0f8ff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b3d9ff",
    marginBottom: 20,
  },
  uploadSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  uploadSummaryText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  phasesList: {
    marginBottom: 12,
  },
  phaseItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
    paddingLeft: 8,
  },
  uploadSummaryNote: {
    fontSize: 12,
    color: "#4a90e2",
    fontStyle: "italic",
  },

  // Button styles
  createButton: {
    backgroundColor: "#9747FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  createContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  creatingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Progress styles
  progressContainer: {
    marginBottom: 20,
  },
  phaseIndicator: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  phaseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1565c0",
    textAlign: "center",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#9747FF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressStat: {
    fontSize: 12,
    color: "#9747FF",
    fontWeight: "600",
  },

  // Info card styles
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#9747FF",
    marginBottom: 15,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#1565c0",
    flex: 1,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: "600",
    color: "#0d47a1",
  },
});
