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
import { Colors } from "../constants/Colors";
import { VideoUploader } from "./VideoUploader";

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

  // Modal height states - Start with higher default
  const [modalHeight, setModalHeight] = useState(screenHeight * 0.85); // Start at 85% height
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Form state - isolated from parent to prevent interference
  const [formData, setFormData] = useState({
    title: "",
    contentURI: "", // IPFS/Livepeer URI for video content
    duration: "", // Duration in minutes (will be converted to seconds)
  });

  const [errors, setErrors] = useState({});
  const [videoFile, setVideoFile] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoData, setUploadedVideoData] = useState(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible) {
      // Reset form when opening
      if (isEditing && initialData) {
        setFormData({
          title: initialData.title || "",
          contentURI: initialData.contentURI || "",
          // Convert duration from seconds back to minutes for display when editing
          duration: initialData.duration
            ? Math.round(initialData.duration / 60).toString()
            : "",
        });
        setVideoFile(initialData.videoFile || null);
        setUploadedVideoData(initialData.uploadedVideoData || null);
      } else {
        setFormData({
          title: "",
          contentURI: "",
          duration: "",
        });
        setVideoFile(null);
        setUploadedVideoData(null);
      }
      setErrors({});
      setModalHeight(screenHeight * 0.85); // Reset to 85% height
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
      setFormData({ title: "", contentURI: "", duration: "" });
      setErrors({});
      setVideoFile(null);
      setUploadedVideoData(null);
    });
  };

  const expandToFullScreen = () => {
    setIsFullScreen(true);
    setModalHeight(screenHeight - 30); // Almost full screen

    Animated.spring(slideValue, {
      toValue: -30, // Move up slightly
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

  const validateForm = () => {
    const newErrors = {};

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = "Section title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (formData.title.trim().length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    // Validate duration
    if (!formData.duration.trim()) {
      newErrors.duration = "Duration is required";
    } else {
      const durationNum = parseFloat(formData.duration);
      if (isNaN(durationNum) || durationNum <= 0) {
        newErrors.duration = "Duration must be a positive number";
      } else if (durationNum > 600) {
        newErrors.duration = "Duration cannot exceed 600 minutes (10 hours)";
      }
    }

    // Validate content URI (optional for now, but provide guidance)
    if (formData.contentURI.trim() && !isValidURI(formData.contentURI.trim())) {
      newErrors.contentURI = "Please enter a valid IPFS or Livepeer URI";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to validate URI format
  const isValidURI = (uri) => {
    const ipfsPattern = /^ipfs:\/\/[a-zA-Z0-9]+/;
    const livepeerPattern = /^https:\/\/.*livepeer.*/;
    const httpPattern = /^https?:\/\/.+/;
    return (
      ipfsPattern.test(uri) ||
      livepeerPattern.test(uri) ||
      httpPattern.test(uri)
    );
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const sectionData = {
      title: formData.title.trim(),
      contentURI:
        formData.contentURI.trim() ||
        (uploadedVideoData
          ? `ipfs://${uploadedVideoData.ipfsHash}`
          : "placeholder://video-content"),
      duration: Math.round(parseFloat(formData.duration) * 60),
      videoFile: videoFile,
      uploadedVideoData: uploadedVideoData, // Include upload metadata
    };

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

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  // Handle video upload completion
  const handleVideoUploadComplete = (uploadResult) => {
    console.log("Video upload completed:", uploadResult);
    setUploadedVideoData(uploadResult);
    setVideoFile({
      name: uploadResult.fileName || "uploaded_video.mp4",
      type: uploadResult.mimeType || "video/mp4",
      uri: uploadResult.ipfsUrl,
      ipfsHash: uploadResult.ipfsHash,
      size: uploadResult.fileSize,
    });

    // Auto-fill the content URI with IPFS URI
    setFormData((prev) => ({
      ...prev,
      contentURI: `ipfs://${uploadResult.ipfsHash}`,
    }));

    setUploadingVideo(false);
    setUploadProgress(0);
  };

  // Handle video upload start
  const handleVideoUploadStart = () => {
    console.log("Video upload started");
    setUploadingVideo(true);
    setUploadProgress(0);
  };

  // Handle video upload error
  const handleVideoUploadError = (error) => {
    console.error("Video upload error:", error);
    setUploadingVideo(false);
    setUploadProgress(0);
    Alert.alert(
      "Upload Error",
      `Failed to upload video: ${error.message || "Unknown error"}`
    );
  };

  // Handle video upload progress
  const handleVideoUploadProgress = (progress) => {
    setUploadProgress(progress);
  };

  const removeVideoFile = () => {
    setVideoFile(null);
    setUploadedVideoData(null);
    setFormData((prev) => ({ ...prev, contentURI: "" }));
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
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
              },
            ]}
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
                  {/* Expand/Collapse Button */}
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

                  {/* Close Button */}
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

              {/* Gesture Hint */}
              <Text style={styles.gestureHint}>
                Tap expand button to full screen • Tap close to exit
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
                  placeholder="Enter section title"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={100}
                  autoCorrect={true}
                  autoCapitalize="words"
                />
                {errors.title && (
                  <Text style={styles.errorText}>{errors.title}</Text>
                )}
              </View>

              {/* Video Content Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Video Content</Text>

                {/* Video Upload Component */}
                <VideoUploader
                  onUploadComplete={handleVideoUploadComplete}
                  onUploadStart={handleVideoUploadStart}
                  onUploadError={handleVideoUploadError}
                  onUploadProgress={handleVideoUploadProgress}
                  disabled={uploadingVideo}
                  showUsageInfo={true}
                  style={styles.videoUploader}
                />

                {/* Upload Progress */}
                {uploadingVideo && (
                  <View style={styles.uploadProgressContainer}>
                    <Text style={styles.uploadProgressText}>
                      Uploading video... {Math.round(uploadProgress)}%
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${uploadProgress}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Uploaded Video Info */}
                {videoFile && !uploadingVideo && (
                  <View style={styles.videoInfo}>
                    <View style={styles.videoPreview}>
                      <Ionicons
                        name="videocam"
                        size={24}
                        color={Colors.primary}
                      />
                      <Text style={styles.videoSelectedText}>
                        {videoFile.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeVideoButton}
                        onPress={removeVideoFile}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={Colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                    {uploadedVideoData && (
                      <Text style={styles.ipfsInfoText}>
                        IPFS: {uploadedVideoData.ipfsHash}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Content URI Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Content URI</Text>
                <TextInput
                  style={[styles.input, errors.contentURI && styles.inputError]}
                  value={formData.contentURI}
                  onChangeText={(value) =>
                    handleInputChange("contentURI", value)
                  }
                  placeholder="ipfs://... or https://livepeer..."
                  placeholderTextColor={Colors.textMuted}
                  autoCorrect={false}
                  autoCapitalize="none"
                  keyboardType="url"
                  multiline={true}
                  numberOfLines={2}
                />
                {errors.contentURI && (
                  <Text style={styles.errorText}>{errors.contentURI}</Text>
                )}
                <Text style={styles.helperText}>
                  Enter IPFS hash (ipfs://...) or Livepeer playback URL
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
                  placeholder="Enter duration in minutes"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={10}
                />
                {errors.duration && (
                  <Text style={styles.errorText}>{errors.duration}</Text>
                )}
                <Text style={styles.helperText}>
                  Duration will be converted to seconds for blockchain storage
                </Text>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={Colors.info}
                />
                <Text style={styles.infoText}>
                  <Text style={styles.infoTextBold}>
                    Smart Contract Requirements:
                  </Text>
                  {"\n"}• Title: Section name{"\n"}• Content URI: IPFS/Livepeer
                  link for video{"\n"}• Duration: Video length in seconds
                  (auto-converted)
                </Text>
              </View>

              {/* Extra spacing for better scrolling */}
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
    // Height is now dynamic based on state
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: -5,
    },
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
  // Video upload styles
  videoUploadArea: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    minHeight: 120,
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
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    marginTop: 8,
    textAlign: "center",
  },
  videoChangeText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
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
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  videoRequirements: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  videoUploader: {
    marginBottom: 8,
  },
  uploadProgressContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  uploadProgressText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  videoInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ipfsInfoText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
    fontFamily: "monospace",
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
