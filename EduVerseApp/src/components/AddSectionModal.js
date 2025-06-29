// AddSectionModal.js - FULLY OPTIMIZED for Smart Contract Integration
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../constants/Colors";
import { videoService } from "../services/VideoService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const AddSectionModal = ({
  visible,
  onClose,
  onSave,
  initialData = null,
  isEditing = false,
}) => {
  // Animation values
  const slideValue = useRef(new Animated.Value(screenHeight)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Modal height states
  const [modalHeight, setModalHeight] = useState(screenHeight * 0.85);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // ✅ FIXED: Form state aligned with smart contract requirements
  const [formData, setFormData] = useState({
    title: "", // Smart contract: max 200 chars
    duration: "", // Smart contract: in seconds, max 86400 (24 hours)
  });
  // ✅ ENHANCED: Auto-fill duration state
  const [isDurationAutoFilled, setIsDurationAutoFilled] = useState(false);

  const [errors, setErrors] = useState({});
  const [selectedVideoFile, setSelectedVideoFile] = useState(null); // Store file for later upload
  const [isSelectingVideo, setIsSelectingVideo] = useState(false);

  // ✅ ENHANCED: Initialize form data when modal opens
  useEffect(() => {
    if (visible) {
      if (isEditing && initialData) {
        setFormData({
          title: initialData.title || "",
          duration: initialData.duration
            ? Math.round(initialData.duration / 60).toString() // Convert seconds to minutes for display
            : "",
        });
        setSelectedVideoFile(initialData.videoFile || null);
      } else {
        // Reset for new section
        setFormData({
          title: "",
          duration: "",
        });
        setSelectedVideoFile(null);
      }
      setErrors({});
      setModalHeight(screenHeight * 0.85);
      setIsFullScreen(false);
      showModal();
    } else {
      hideModal();
    }
  }, [visible, initialData, isEditing]);

  const showModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideValue, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideValue, {
        toValue: screenHeight,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start(() => {
      // Clean up after animation
      setFormData({ title: "", duration: "" });
      setErrors({});
      setSelectedVideoFile(null);
    });
  };

  const expandToFullScreen = () => {
    setIsFullScreen(true);
    setModalHeight(screenHeight - 30);

    Animated.spring(slideValue, {
      toValue: -30,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const collapseToNormal = () => {
    setIsFullScreen(false);
    setModalHeight(screenHeight * 0.85);

    Animated.spring(slideValue, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  // ✅ ENHANCED: Video selection with comprehensive validation
  const handleVideoSelection = async () => {
    if (isSelectingVideo) return;

    try {
      setIsSelectingVideo(true);

      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "We need access to your media library to select videos."
        );
        return;
      }

      // Launch video picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1.0,
        videoMaxDuration: 3600, // 1 hour max selection
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // ✅ FIXED: Create file object compatible with upload services
        const videoFile = {
          uri: asset.uri,
          type:
            asset.type ||
            videoService.detectMimeType(asset.fileName || asset.uri) ||
            "video/mp4",
          name: asset.fileName || `section_video_${Date.now()}.mp4`,
          size: asset.fileSize || 0,
          duration: asset.duration || 0, // Duration in milliseconds
        };

        console.log("✅ Video file selected for section:", {
          name: videoFile.name,
          size: videoFile.size,
          duration: videoFile.duration,
          type: videoFile.type,
        });

        // ✅ ENHANCED: Comprehensive validation
        const validationResult = await validateVideoFile(videoFile);

        if (!validationResult.isValid) {
          Alert.alert("Video Validation Error", validationResult.error);
          return;
        }

        // Show warnings if any
        if (validationResult.warnings.length > 0) {
          Alert.alert(
            "Video Selected with Warnings",
            validationResult.warnings.join("\n") +
              "\n\nVideo will be uploaded when you create the course.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Continue",
                onPress: () => processVideoSelection(videoFile, asset),
              },
            ]
          );
        } else {
          processVideoSelection(videoFile, asset);
        }
      }
    } catch (error) {
      console.error("Video selection error:", error);
      Alert.alert(
        "Selection Error",
        `Failed to select video: ${error.message}`
      );
    } finally {
      setIsSelectingVideo(false);
    }
  };

  // ✅ NEW: Process video selection after validation
  const processVideoSelection = (videoFile, asset) => {
    setSelectedVideoFile(videoFile);

    // Auto-fill duration based on video duration (always update, not just when empty)
    if (asset.duration && asset.duration > 0) {
      const exactMinutes = (asset.duration / 60000).toFixed(2);
      setFormData((prev) => ({
        ...prev,
        duration: exactMinutes.toString(),
      }));
      setIsDurationAutoFilled(true); // Tandai bahwa durasi terisi otomatis

      console.log(
        `✅ Duration auto-filled: ${exactMinutes} minutes from video duration`
      );
    }

    Alert.alert(
      "Video Selected! 📹",
      `Video "${videoFile.name}" selected successfully.\n\n` +
        `Size: ${
          videoService.formatFileSize
            ? videoService.formatFileSize(videoFile.size)
            : `${(videoFile.size / 1024 / 1024).toFixed(1)} MB`
        }\n` +
        `Type: ${videoFile.type}\n` +
        `Duration: ${
          asset.duration
            ? `${Math.round(asset.duration / 60000)} minutes`
            : "Unknown"
        }\n` +
        `${
          asset.duration ? "⏱️ Duration automatically filled in form!" : ""
        }\n\n` +
        "Video will be uploaded to IPFS when you create the course."
    );
  };

  // ✅ NEW: Comprehensive video validation
  const validateVideoFile = async (videoFile) => {
    const warnings = [];
    let isValid = true;
    let error = "";

    // File size validation
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (videoFile.size > maxSize) {
      isValid = false;
      error = `Video file is too large (${
        videoService.formatFileSize
          ? videoService.formatFileSize(videoFile.size)
          : `${(videoFile.size / 1024 / 1024).toFixed(1)} MB`
      }). Maximum allowed: 100MB.`;
      return { isValid, error, warnings };
    }

    // File type validation
    const allowedTypes = [
      "video/mp4",
      "video/mov",
      "video/avi",
      "video/mkv",
      "video/webm",
    ];
    if (!allowedTypes.includes(videoFile.type)) {
      warnings.push(
        `Video type ${videoFile.type} may not be fully supported. Recommended: MP4.`
      );
    }

    // Duration validation (if available)
    if (videoFile.duration > 0) {
      const durationMinutes = videoFile.duration / 60000;
      if (durationMinutes > 600) {
        // 10 hours
        isValid = false;
        error = `Video duration is too long (${Math.round(
          durationMinutes
        )} minutes). Maximum allowed: 600 minutes (10 hours).`;
        return { isValid, error, warnings };
      }

      if (durationMinutes > 120) {
        // 2 hours warning
        warnings.push(
          `Video is quite long (${Math.round(
            durationMinutes
          )} minutes). Consider splitting into smaller sections for better user experience.`
        );
      }
    }

    // Size warnings
    if (videoFile.size > 50 * 1024 * 1024) {
      // 50MB warning
      warnings.push(
        `Video file is large (${
          videoService.formatFileSize
            ? videoService.formatFileSize(videoFile.size)
            : `${(videoFile.size / 1024 / 1024).toFixed(1)} MB`
        }). Upload may take longer.`
      );
    }

    // Check upload capacity if videoService supports it
    try {
      if (videoService.canUploadVideo) {
        const capacityCheck = await videoService.canUploadVideo(videoFile.size);
        if (!capacityCheck.possible) {
          isValid = false;
          error =
            capacityCheck.error ||
            "Video upload not possible due to capacity limits.";
          return { isValid, error, warnings };
        }

        if (capacityCheck.warnings && capacityCheck.warnings.length > 0) {
          warnings.push(...capacityCheck.warnings);
        }
      }
    } catch (capacityError) {
      console.warn("Could not check upload capacity:", capacityError);
      // Continue without capacity check
    }

    return { isValid, error, warnings };
  };

  // Remove selected video
  const removeSelectedVideo = () => {
    Alert.alert(
      "Remove Video",
      "Are you sure you want to remove the selected video?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setSelectedVideoFile(null);
          },
        },
      ]
    );
  };

  // ✅ ENHANCED: Form validation aligned with smart contract limits
  const validateForm = () => {
    const newErrors = {};

    // ✅ Title validation (smart contract: max 200 chars)
    if (!formData.title.trim()) {
      newErrors.title = "Section title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (formData.title.trim().length > 200) {
      newErrors.title =
        "Title cannot exceed 200 characters (smart contract limit)";
    }

    // ✅ Duration validation (smart contract: max 86400 seconds = 24 hours)
    if (!formData.duration.trim()) {
      newErrors.duration = "Duration is required";
    } else {
      const durationMinutes = parseFloat(formData.duration);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        newErrors.duration = "Duration must be a positive number";
      } else if (durationMinutes > 1440) {
        // 1440 minutes = 24 hours
        newErrors.duration =
          "Duration cannot exceed 1440 minutes (24 hours, smart contract limit)";
      } else if (durationMinutes < 0.5) {
        // 30 seconds minimum
        newErrors.duration =
          "Duration must be at least 0.5 minutes (30 seconds)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ FIXED: Handle save with proper data structure for CreateCourseScreen
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // ✅ FIXED: Create section data compatible with smart contract and CreateCourseScreen
    const durationInSeconds = Math.round(parseFloat(formData.duration) * 60); // Convert minutes to seconds

    const sectionData = {
      title: formData.title.trim(), // Smart contract parameter: string title
      duration: durationInSeconds, // Smart contract parameter: uint256 duration (in seconds)
      videoFile: selectedVideoFile, // For upload to IPFS -> contentCID
      // Additional metadata for UI
      id: Date.now() + Math.random(), // Temporary ID for UI
      orderId: 0, // Will be set by parent component
      createdAt: new Date().toISOString(),
      uploadStatus: selectedVideoFile ? "pending" : "no-video",
    };

    console.log("✅ Section data prepared for CreateCourseScreen:", {
      title: sectionData.title,
      durationSeconds: sectionData.duration,
      durationMinutes: parseFloat(formData.duration),
      hasVideo: !!sectionData.videoFile,
      videoFileName: sectionData.videoFile?.name,
      videoSize: sectionData.videoFile?.size,
      uploadStatus: sectionData.uploadStatus,
    });

    // Validate final data
    if (sectionData.title.length > 200) {
      Alert.alert(
        "Error",
        "Title exceeds smart contract limit of 200 characters"
      );
      return;
    }

    if (sectionData.duration > 86400) {
      Alert.alert(
        "Error",
        "Duration exceeds smart contract limit of 86400 seconds (24 hours)"
      );
      return;
    }

    if (sectionData.duration <= 0) {
      Alert.alert("Error", "Duration must be greater than 0 seconds");
      return;
    }

    onSave(sectionData);
    onClose();
  };

  const handleBackdropPress = () => {
    if (!isFullScreen) {
      onClose();
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Reset auto-fill indicator when user manually changes duration
    if (field === "duration") {
      setIsDurationAutoFilled(false);
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };
  // ✅ Helper: Format duration display
  const formatDurationDisplay = () => {
    if (!formData.duration) return "";

    const minutes = parseFloat(formData.duration);
    const seconds = Math.round(minutes * 60);

    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hours ${remainingMinutes} minutes`;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </TouchableWithoutFeedback>

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              height: modalHeight,
              transform: [{ translateY: slideValue }],
              opacity: opacityValue,
            },
          ]}
        >
          <SafeAreaView style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.dragHandle} />
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>
                  {isEditing ? "Edit Section" : "Add New Section"}
                </Text>
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={
                      isFullScreen ? collapseToNormal : expandToFullScreen
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isFullScreen ? "contract" : "expand"}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.gestureHint}>
                Tap expand button for full screen • All data validated for smart
                contract
              </Text>
            </View>

            {/* Scrollable Form Content */}
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.formContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Section Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Section Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  value={formData.title}
                  onChangeText={(value) => handleInputChange("title", value)}
                  placeholder="Enter section title (max 200 characters)"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={200}
                  autoCorrect={true}
                  autoCapitalize="words"
                />
                {errors.title && (
                  <Text style={styles.errorText}>{errors.title}</Text>
                )}
                <Text style={styles.helperText}>
                  {formData.title.length}/200 characters (Smart contract limit:
                  200)
                </Text>
              </View>

              {/* Duration Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Duration (minutes) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.duration && styles.inputError]}
                  value={formData.duration}
                  onChangeText={(value) => handleInputChange("duration", value)}
                  placeholder="Enter duration in minutes (max 1440 = 24 hours)"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={10}
                />
                {errors.duration && (
                  <Text style={styles.errorText}>{errors.duration}</Text>
                )}
                <Text style={styles.helperText}>
                  {formData.duration ? (
                    <>
                      Duration: {formatDurationDisplay()}
                      {isDurationAutoFilled && (
                        <Text style={{ color: Colors.success }}>
                          {" "}
                          • Auto-filled from video ✓
                        </Text>
                      )}
                      • Smart contract stores in seconds (max 86400)
                    </>
                  ) : (
                    "Smart contract limit: 1440 minutes (24 hours). Will be converted to seconds."
                  )}
                </Text>
              </View>

              {/* Video Content Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Video Content</Text>

                {/* Video Selection Area */}
                <TouchableOpacity
                  style={[
                    styles.videoUploadArea,
                    selectedVideoFile && styles.videoSelected,
                  ]}
                  onPress={handleVideoSelection}
                  disabled={isSelectingVideo}
                  activeOpacity={0.7}
                >
                  {selectedVideoFile ? (
                    <View style={styles.videoPreview}>
                      <Ionicons
                        name="videocam"
                        size={48}
                        color={Colors.primary}
                      />
                      <Text style={styles.videoSelectedText}>
                        {selectedVideoFile.name}
                      </Text>
                      <Text style={styles.videoDetailsText}>
                        {videoService.formatFileSize
                          ? videoService.formatFileSize(selectedVideoFile.size)
                          : `${(selectedVideoFile.size / 1024 / 1024).toFixed(
                              1
                            )} MB`}{" "}
                        • {selectedVideoFile.type}
                      </Text>
                      {selectedVideoFile.duration > 0 && (
                        <Text style={styles.videoDetailsText}>
                          Video duration:{" "}
                          {Math.round(selectedVideoFile.duration / 60000)}{" "}
                          minutes
                        </Text>
                      )}
                      <Text style={styles.videoChangeText}>
                        Tap to change video
                      </Text>
                      <TouchableOpacity
                        style={styles.removeVideoButton}
                        onPress={removeSelectedVideo}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color={Colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <Ionicons
                        name="videocam-outline"
                        size={48}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.videoPlaceholderText}>
                        {isSelectingVideo
                          ? "Selecting video..."
                          : "Tap to select video"}
                      </Text>
                      <Text style={styles.videoRequirements}>
                        Max: 100MB, 600 minutes • Recommended: MP4 format
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.helperText}>
                  Video will be uploaded to IPFS when you create the course. The
                  IPFS CID will be stored as contentCID in the smart contract.
                </Text>
              </View>

              {/* Smart Contract Info Box */}
              <View style={styles.smartContractInfoBox}>
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={Colors.success}
                />
                <Text style={styles.smartContractInfoText}>
                  <Text style={styles.infoTextBold}>
                    Smart Contract Integration:
                  </Text>
                  {"\n"}• Title: Stored as string (max 200 chars)
                  {"\n"}• Duration: Stored as uint256 in seconds (max 86400)
                  {"\n"}• Content: Video → IPFS → CID stored as string
                  {"\n"}• All validation ensures blockchain compatibility
                </Text>
              </View>

              {/* Upload Process Info Box */}
              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={Colors.info}
                />
                <Text style={styles.infoText}>
                  <Text style={styles.infoTextBold}>Upload Process:</Text>
                  {"\n"}• Video stored temporarily until course creation
                  {"\n"}• All videos upload to IPFS when you click "Create
                  Course"
                  {"\n"}• IPFS CIDs automatically stored on blockchain
                  {"\n"}• Smart contract function: addCourseSection(courseId,
                  title, contentCID, duration)
                </Text>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Fixed Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Update Section" : "Add Section"}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.black,
  },
  modalContainer: {
    // Height is dynamic
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.lightGray,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  gestureHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
    minHeight: 50,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },

  // Video selection styles
  videoUploadArea: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    minHeight: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  videoSelected: {
    borderColor: Colors.primary,
    borderStyle: "solid",
    backgroundColor: Colors.surface,
  },
  videoPreview: {
    alignItems: "center",
    padding: 20,
    position: "relative",
    width: "100%",
  },
  videoSelectedText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 12,
    textAlign: "center",
  },
  videoDetailsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  videoChangeText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 8,
    textAlign: "center",
  },
  removeVideoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
  },
  videoPlaceholder: {
    alignItems: "center",
    padding: 20,
  },
  videoPlaceholderText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  videoRequirements: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // ✅ NEW: Smart contract specific info box
  smartContractInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  smartContractInfoText: {
    fontSize: 14,
    color: "#0369a1",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: "600",
    color: Colors.text,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
    backgroundColor: Colors.surface,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
});

export default AddSectionModal;
