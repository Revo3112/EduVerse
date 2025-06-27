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

  // Form state - isolated from parent to prevent interference
  const [formData, setFormData] = useState({
    title: "",
    contentURI: "",
    duration: "",
  });

  const [errors, setErrors] = useState({});
  const [selectedVideoFile, setSelectedVideoFile] = useState(null); // CHANGED: Just store file info, don't upload
  const [isSelectingVideo, setIsSelectingVideo] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible) {
      if (isEditing && initialData) {
        setFormData({
          title: initialData.title || "",
          contentURI: initialData.contentURI || "",
          duration: initialData.duration
            ? Math.round(initialData.duration / 60).toString()
            : "",
        });
        setSelectedVideoFile(initialData.videoFile || null);
      } else {
        setFormData({
          title: "",
          contentURI: "",
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
      setFormData({ title: "", contentURI: "", duration: "" });
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

  // CHANGED: Video selection without upload
  const handleVideoSelection = async () => {
    if (isSelectingVideo) return;

    try {
      setIsSelectingVideo(true);

      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

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
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Create file object WITHOUT uploading
        const videoFile = {
          uri: asset.uri,
          type: asset.type || videoService.detectMimeType(asset.fileName || asset.uri),
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: asset.fileSize || 0,
          duration: asset.duration || 0, // Video duration in milliseconds
        };

        console.log("✅ Video file selected (not uploaded yet):", videoFile.name);

        // Validate video file
        const validation = videoService.validateVideo(videoFile);

        if (!validation.isValid) {
          if (validation.compressionRequired) {
            Alert.alert(
              "Video Too Large",
              `The selected video is too large (${validation.formattedSize || videoService.formatFileSize(videoFile.size)}).\n\n` +
              "Maximum recommended: 100MB for free plan.\n\n" +
              "Please compress the video first or select a smaller file.",
              [
                { text: "OK" },
                {
                  text: "Select Another",
                  onPress: () => setTimeout(handleVideoSelection, 500),
                },
              ]
            );
          } else {
            Alert.alert("Video Error", validation.error);
          }
          return;
        }

        // Check capacity (optional warning)
        try {
          const capacityCheck = await videoService.canUploadVideo(videoFile.size);
          if (!capacityCheck.possible) {
            Alert.alert(
              "Upload Capacity Warning",
              capacityCheck.warnings.join("\n") + "\n\nVideo will be uploaded when you create the course.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Continue Anyway",
                  onPress: () => setSelectedVideoFile(videoFile),
                },
              ]
            );
            return;
          }

          // Show warnings if any
          if (capacityCheck.warnings.length > 0 || validation.warnings.length > 0) {
            const allWarnings = [...capacityCheck.warnings, ...validation.warnings];
            Alert.alert(
              "Video Selected with Warnings",
              allWarnings.join("\n") + "\n\nVideo will be uploaded when you create the course.",
              [
                { text: "OK", onPress: () => setSelectedVideoFile(videoFile) },
              ]
            );
          } else {
            setSelectedVideoFile(videoFile);
            Alert.alert(
              "Video Selected! 📹",
              `Video "${videoFile.name}" selected successfully.\n\n` +
              `Size: ${videoService.formatFileSize(videoFile.size)}\n` +
              `Type: ${videoFile.type}\n\n` +
              "Video will be uploaded to IPFS when you create the course."
            );
          }
        } catch (capacityError) {
          console.warn("Could not check upload capacity:", capacityError);
          // Continue anyway - just store the file
          setSelectedVideoFile(videoFile);
          Alert.alert("Video Selected", `Video "${videoFile.name}" selected. It will be uploaded when you create the course.`);
        }

        // Auto-estimate duration if not available
        if (!formData.duration && asset.duration) {
          const estimatedMinutes = Math.ceil(asset.duration / 60000); // Convert ms to minutes
          setFormData(prev => ({
            ...prev,
            duration: estimatedMinutes.toString(),
          }));
        }
      }
    } catch (error) {
      console.error("Video selection error:", error);
      Alert.alert("Selection Error", `Failed to select video: ${error.message}`);
    } finally {
      setIsSelectingVideo(false);
    }
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
            setFormData(prev => ({ ...prev, contentURI: "" }));
          },
        },
      ]
    );
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

    // Validate content URI (optional)
    if (formData.contentURI.trim() && !isValidURI(formData.contentURI.trim())) {
      newErrors.contentURI = "Please enter a valid IPFS or HTTP URI";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidURI = (uri) => {
    const ipfsPattern = /^ipfs:\/\/[a-zA-Z0-9]+/;
    const httpPattern = /^https?:\/\/.+/;
    return ipfsPattern.test(uri) || httpPattern.test(uri);
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // CHANGED: Pass video file without uploading
    const sectionData = {
      title: formData.title.trim(),
      contentURI: formData.contentURI.trim() || "placeholder://video-content",
      duration: Math.round(parseFloat(formData.duration) * 60), // Convert minutes to seconds
      videoFile: selectedVideoFile, // Pass the video file for later upload
      uploadStatus: selectedVideoFile ? 'pending' : 'no-video',
    };

    console.log("✅ Section data prepared for save (video will upload later):", {
      title: sectionData.title,
      hasVideo: !!sectionData.videoFile,
      videoFileName: sectionData.videoFile?.name,
      durationSeconds: sectionData.duration,
      uploadStatus: sectionData.uploadStatus,
    });

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

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
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
            style={[
              styles.backdrop,
              { opacity: backdropOpacity },
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
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={isFullScreen ? collapseToNormal : expandToFullScreen}
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
                      <Ionicons name="videocam" size={48} color={Colors.primary} />
                      <Text style={styles.videoSelectedText}>
                        {selectedVideoFile.name}
                      </Text>
                      <Text style={styles.videoDetailsText}>
                        {videoService.formatFileSize(selectedVideoFile.size)} • {selectedVideoFile.type}
                      </Text>
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
                      <Ionicons name="videocam-outline" size={48} color={Colors.textMuted} />
                      <Text style={styles.videoPlaceholderText}>
                        {isSelectingVideo ? "Selecting video..." : "Tap to select video"}
                      </Text>
                      <Text style={styles.videoRequirements}>
                        Recommended: MP4, max 100MB for free plan
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.helperText}>
                  Select a video file that will be uploaded to IPFS when you create the course.
                  Video will be stored temporarily until upload.
                </Text>
              </View>

              {/* Content URI Input (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Content URI (Optional)</Text>
                <TextInput
                  style={[styles.input, errors.contentURI && styles.inputError]}
                  value={formData.contentURI}
                  onChangeText={(value) => handleInputChange("contentURI", value)}
                  placeholder="ipfs://... or https://..."
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
                  Leave empty to auto-generate from uploaded video, or enter custom IPFS/HTTP URI
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
                <Ionicons name="information-circle" size={20} color={Colors.info} />
                <Text style={styles.infoText}>
                  <Text style={styles.infoTextBold}>Upload Process:</Text>
                  {"\n"}• Video file is stored temporarily until course creation
                  {"\n"}• All videos upload to IPFS when you click "Create Course"
                  {"\n"}• IPFS URIs are automatically generated and stored on blockchain
                  {"\n"}• No manual upload required - everything happens automatically!
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
