// src/components/AddSectionModal.js - Enhanced UI/UX with Auto Duration
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
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { videoService } from "../services/VideoService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Enhanced color palette
const COLORS = {
  primary: "#9747FF",
  primaryLight: "#B47FFF",
  primaryDark: "#7A37CC",
  secondary: "#FF6B6B",
  tertiary: "#4ECDC4",
  quaternary: "#FFD93D",
  success: "#4CAF50",
  error: "#FF5252",
  warning: "#FF9800",
  info: "#2196F3",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  border: "#E0E0E0",
  text: "#333333",
  textSecondary: "#666666",
  textMuted: "#999999",
  gradientStart: "#667eea",
  gradientEnd: "#764ba2",
  backdrop: "rgba(0, 0, 0, 0.5)",
};

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
  const scaleValue = useRef(new Animated.Value(0.9)).current;

  // Modal height states
  const [modalHeight, setModalHeight] = useState(screenHeight * 0.85);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    duration: "",
  });

  // Enhanced states
  const [isDurationAutoFilled, setIsDurationAutoFilled] = useState(false);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(null);

  const [errors, setErrors] = useState({});
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [isSelectingVideo, setIsSelectingVideo] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (visible) {
      if (isEditing && initialData) {
        setFormData({
          title: initialData.title || "",
          duration: initialData.duration
            ? Math.round(initialData.duration / 60).toString()
            : "",
        });
        setSelectedVideoFile(initialData.videoFile || null);
      } else {
        setFormData({
          title: "",
          duration: "",
        });
        setSelectedVideoFile(null);
        setIsDurationAutoFilled(false);
        setVideoDurationSeconds(null);
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
        toValue: 1,
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
      Animated.spring(scaleValue, {
        toValue: 1,
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
      Animated.spring(scaleValue, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start(() => {
      setFormData({ title: "", duration: "" });
      setErrors({});
      setSelectedVideoFile(null);
      setIsDurationAutoFilled(false);
      setVideoDurationSeconds(null);
      setIsAnalyzingVideo(false);
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

  // Enhanced video selection with auto-duration detection
  const handleVideoSelection = async () => {
    if (isSelectingVideo) return;

    try {
      setIsSelectingVideo(true);

      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "We need access to your media library to select videos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1.0,
        videoMaxDuration: 3600,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsAnalyzingVideo(true);

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

        const validationResult = await validateVideoFile(videoFile);

        if (!validationResult.isValid) {
          Alert.alert("Video Validation Error", validationResult.error);
          setIsAnalyzingVideo(false);
          return;
        }

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
      setIsAnalyzingVideo(false);
    }
  };

  const processVideoSelection = (videoFile, asset) => {
    setSelectedVideoFile(videoFile);

    // Auto-fill duration from video metadata
    if (asset.duration && asset.duration > 0) {
      const durationInSeconds = Math.round(asset.duration / 1000); // Convert ms to seconds
      const durationInMinutes = (durationInSeconds / 60).toFixed(2);

      setFormData((prev) => ({
        ...prev,
        duration: durationInMinutes.toString(),
      }));
      setVideoDurationSeconds(durationInSeconds);
      setIsDurationAutoFilled(true);

      console.log(
        `✅ Duration auto-filled: ${durationInMinutes} minutes (${durationInSeconds} seconds)`
      );
    }

    const successMessage =
      `Video "${videoFile.name}" selected successfully! 🎬\n\n` +
      `📊 Details:\n` +
      `• Size: ${
        videoService.formatFileSize
          ? videoService.formatFileSize(videoFile.size)
          : `${(videoFile.size / 1024 / 1024).toFixed(1)} MB`
      }\n` +
      `• Type: ${videoFile.type}\n` +
      `${
        asset.duration
          ? `• Duration: ${Math.round(asset.duration / 60000)} minutes\n`
          : ""
      }` +
      `${
        asset.duration ? "\n✨ Duration automatically filled in the form!" : ""
      }\n\n` +
      `Video will be uploaded to IPFS when you create the course.`;

    Alert.alert("Video Selected! 🎉", successMessage);
    setIsAnalyzingVideo(false);
  };

  const validateVideoFile = async (videoFile) => {
    const warnings = [];
    let isValid = true;
    let error = "";

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

    if (videoFile.duration > 0) {
      const durationMinutes = videoFile.duration / 60000;
      if (durationMinutes > 600) {
        isValid = false;
        error = `Video duration is too long (${Math.round(
          durationMinutes
        )} minutes). Maximum allowed: 600 minutes (10 hours).`;
        return { isValid, error, warnings };
      }

      if (durationMinutes > 120) {
        warnings.push(
          `Video is quite long (${Math.round(
            durationMinutes
          )} minutes). Consider splitting into smaller sections for better user experience.`
        );
      }
    }

    if (videoFile.size > 50 * 1024 * 1024) {
      warnings.push(
        `Video file is large (${
          videoService.formatFileSize
            ? videoService.formatFileSize(videoFile.size)
            : `${(videoFile.size / 1024 / 1024).toFixed(1)} MB`
        }). Upload may take longer.`
      );
    }

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
    }

    return { isValid, error, warnings };
  };

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
            setIsDurationAutoFilled(false);
            setVideoDurationSeconds(null);
            if (isDurationAutoFilled) {
              setFormData((prev) => ({ ...prev, duration: "" }));
            }
          },
        },
      ]
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Section title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (formData.title.trim().length > 200) {
      newErrors.title =
        "Title cannot exceed 200 characters (smart contract limit)";
    }

    if (!formData.duration.trim()) {
      newErrors.duration = "Duration is required";
    } else {
      const durationMinutes = parseFloat(formData.duration);
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        newErrors.duration = "Duration must be a positive number";
      } else if (durationMinutes > 1440) {
        newErrors.duration = "Duration cannot exceed 1440 minutes (24 hours)";
      } else if (durationMinutes < 0.5) {
        newErrors.duration =
          "Duration must be at least 0.5 minutes (30 seconds)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const durationInSeconds = Math.round(parseFloat(formData.duration) * 60);

    const sectionData = {
      title: formData.title.trim(),
      duration: durationInSeconds,
      videoFile: selectedVideoFile,
      id: Date.now() + Math.random(),
      orderId: 0,
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
      autoFilled: isDurationAutoFilled,
    });

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

    if (field === "duration") {
      setIsDurationAutoFilled(false);
    }

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const formatDurationDisplay = () => {
    if (!formData.duration) return "";

    const minutes = parseFloat(formData.duration);
    const seconds = Math.round(minutes * 60);

    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins} minutes ${secs > 0 ? `${secs} seconds` : ""}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hours ${
        remainingMinutes > 0 ? `${remainingMinutes} minutes` : ""
      }`;
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
              transform: [{ translateY: slideValue }, { scale: scaleValue }],
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
                      color={COLORS.textSecondary}
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
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.gestureHint}>
                All data validated for smart contract • Video duration
                auto-detected
              </Text>
            </View>

            {/* Scrollable Form Content */}
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.formContainer}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Section Title Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>
                    Section Title <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.labelIcon}>
                    <Ionicons
                      name="text-outline"
                      size={16}
                      color={COLORS.primary}
                    />
                  </View>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, errors.title && styles.inputError]}
                    value={formData.title}
                    onChangeText={(value) => handleInputChange("title", value)}
                    placeholder="Enter section title (max 200 characters)"
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={200}
                    autoCorrect={true}
                    autoCapitalize="words"
                  />
                  {formData.title.length > 0 && (
                    <View style={styles.inputCounter}>
                      <Text style={styles.counterText}>
                        {formData.title.length}/200
                      </Text>
                    </View>
                  )}
                </View>
                {errors.title && (
                  <Text style={styles.errorText}>
                    <Ionicons name="alert-circle" size={14} /> {errors.title}
                  </Text>
                )}
              </View>

              {/* Duration Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>
                    Duration (minutes) <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.labelIcon}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={COLORS.secondary}
                    />
                  </View>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      errors.duration && styles.inputError,
                      isDurationAutoFilled && styles.inputAutoFilled,
                    ]}
                    value={formData.duration}
                    onChangeText={(value) =>
                      handleInputChange("duration", value)
                    }
                    placeholder="Enter duration in minutes (max 1440)"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={10}
                  />
                  {isDurationAutoFilled && (
                    <View style={styles.autoFilledBadge}>
                      <Ionicons
                        name="sparkles"
                        size={14}
                        color={COLORS.success}
                      />
                      <Text style={styles.autoFilledText}>Auto</Text>
                    </View>
                  )}
                </View>
                {errors.duration && (
                  <Text style={styles.errorText}>
                    <Ionicons name="alert-circle" size={14} /> {errors.duration}
                  </Text>
                )}
                {formData.duration && !errors.duration && (
                  <View style={styles.durationInfo}>
                    <Ionicons
                      name="information-circle"
                      size={14}
                      color={COLORS.info}
                    />
                    <Text style={styles.durationInfoText}>
                      {formatDurationDisplay()}
                      {isDurationAutoFilled && " • Auto-detected from video"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Video Content Section */}
              <View style={styles.inputGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Video Content</Text>
                  <View style={styles.labelIcon}>
                    <Ionicons
                      name="videocam-outline"
                      size={16}
                      color={COLORS.tertiary}
                    />
                  </View>
                </View>

                {/* Video Selection Area */}
                <TouchableOpacity
                  style={[
                    styles.videoUploadArea,
                    selectedVideoFile && styles.videoSelected,
                    isAnalyzingVideo && styles.videoAnalyzing,
                  ]}
                  onPress={handleVideoSelection}
                  disabled={isSelectingVideo || isAnalyzingVideo}
                  activeOpacity={0.8}
                >
                  {isAnalyzingVideo ? (
                    <View style={styles.videoAnalyzingContent}>
                      <ActivityIndicator size="large" color={COLORS.primary} />
                      <Text style={styles.analyzingText}>
                        Analyzing video...
                      </Text>
                      <Text style={styles.analyzingSubtext}>
                        Extracting duration information
                      </Text>
                    </View>
                  ) : selectedVideoFile ? (
                    <View style={styles.videoPreview}>
                      <LinearGradient
                        colors={[
                          COLORS.primary + "20",
                          COLORS.primaryLight + "20",
                        ]}
                        style={styles.videoIconGradient}
                      >
                        <Ionicons
                          name="videocam"
                          size={48}
                          color={COLORS.primary}
                        />
                      </LinearGradient>
                      <Text style={styles.videoSelectedText} numberOfLines={2}>
                        {selectedVideoFile.name}
                      </Text>
                      <View style={styles.videoDetails}>
                        <View style={styles.videoDetailItem}>
                          <Ionicons
                            name="folder-outline"
                            size={14}
                            color={COLORS.textSecondary}
                          />
                          <Text style={styles.videoDetailsText}>
                            {videoService.formatFileSize
                              ? videoService.formatFileSize(
                                  selectedVideoFile.size
                                )
                              : `${(
                                  selectedVideoFile.size /
                                  1024 /
                                  1024
                                ).toFixed(1)} MB`}
                          </Text>
                        </View>
                        <View style={styles.videoDetailItem}>
                          <Ionicons
                            name="film-outline"
                            size={14}
                            color={COLORS.textSecondary}
                          />
                          <Text style={styles.videoDetailsText}>
                            {selectedVideoFile.type}
                          </Text>
                        </View>
                      </View>
                      {selectedVideoFile.duration > 0 && (
                        <View style={styles.videoDurationBadge}>
                          <Ionicons
                            name="time"
                            size={14}
                            color={COLORS.success}
                          />
                          <Text style={styles.videoDurationText}>
                            {Math.round(selectedVideoFile.duration / 60000)}{" "}
                            minutes detected
                          </Text>
                        </View>
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
                          size={28}
                          color={COLORS.error}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.videoPlaceholder}>
                      <View style={styles.videoPlaceholderIcon}>
                        <Ionicons
                          name="cloud-upload-outline"
                          size={48}
                          color={COLORS.primary}
                        />
                      </View>
                      <Text style={styles.videoPlaceholderText}>
                        {isSelectingVideo
                          ? "Selecting video..."
                          : "Tap to select video"}
                      </Text>
                      <Text style={styles.videoRequirements}>
                        Max: 100MB, 600 minutes • MP4 recommended
                      </Text>
                      <View style={styles.videoFeatureBadge}>
                        <Ionicons
                          name="sparkles"
                          size={14}
                          color={COLORS.quaternary}
                        />
                        <Text style={styles.videoFeatureText}>
                          Auto-duration detection
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.helperText}>
                  <Ionicons name="cloud-outline" size={12} /> Video will be
                  uploaded to IPFS when course is created
                </Text>
              </View>

              {/* Smart Contract Info Box */}
              <View style={styles.smartContractInfoBox}>
                <LinearGradient
                  colors={["#f0f9ff", "#e0f2fe"]}
                  style={styles.infoBoxGradient}
                >
                  <View style={styles.infoBoxHeader}>
                    <Ionicons
                      name="shield-checkmark"
                      size={20}
                      color={COLORS.info}
                    />
                    <Text style={styles.infoBoxTitle}>
                      Smart Contract Integration
                    </Text>
                  </View>
                  <View style={styles.infoBoxContent}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoBullet}>•</Text>
                      <Text style={styles.infoText}>
                        Title: string (max 200 chars)
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoBullet}>•</Text>
                      <Text style={styles.infoText}>
                        Duration: uint256 in seconds (max 86400)
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoBullet}>•</Text>
                      <Text style={styles.infoText}>
                        Content: Video → IPFS → CID string
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoBullet}>•</Text>
                      <Text style={styles.infoText}>
                        All validation ensures blockchain compatibility
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Enhanced Features Box */}
              <View style={styles.featuresBox}>
                <LinearGradient
                  colors={["#fef3c7", "#fde68a"]}
                  style={styles.featuresGradient}
                >
                  <View style={styles.featuresHeader}>
                    <Ionicons
                      name="sparkles"
                      size={20}
                      color={COLORS.quaternary}
                    />
                    <Text style={styles.featuresTitle}>Enhanced Features</Text>
                  </View>
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#f59e0b"
                      />
                      <Text style={styles.featureText}>
                        Auto-detect video duration on selection
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#f59e0b"
                      />
                      <Text style={styles.featureText}>
                        Smart contract validation built-in
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#f59e0b"
                      />
                      <Text style={styles.featureText}>
                        IPFS upload integration ready
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Fixed Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.saveButtonText}>
                    {isEditing ? "Update Section" : "Add Section"}
                  </Text>
                </LinearGradient>
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
    backgroundColor: COLORS.backdrop,
  },
  modalContainer: {
    // Height is dynamic
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },

  // Header
  header: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
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
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  gestureHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Form
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
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  labelIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  required: {
    color: COLORS.error,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    minHeight: 52,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: "#FFF5F5",
  },
  inputAutoFilled: {
    borderColor: COLORS.success,
    backgroundColor: "#F0FFF4",
  },
  inputCounter: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  counterText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  autoFilledBadge: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -12 }],
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autoFilledText: {
    fontSize: 12,
    color: COLORS.success,
    marginLeft: 4,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 6,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    marginLeft: 4,
    lineHeight: 18,
  },
  durationInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginLeft: 4,
  },
  durationInfoText: {
    fontSize: 13,
    color: COLORS.info,
    marginLeft: 6,
  },

  // Video selection
  videoUploadArea: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    minHeight: 180,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  videoSelected: {
    borderColor: COLORS.primary,
    borderStyle: "solid",
    backgroundColor: COLORS.primary + "05",
  },
  videoAnalyzing: {
    borderColor: COLORS.primary,
    borderStyle: "solid",
    backgroundColor: COLORS.primary + "10",
  },
  videoAnalyzingContent: {
    alignItems: "center",
    padding: 20,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
  },
  analyzingSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  videoPreview: {
    alignItems: "center",
    padding: 20,
    position: "relative",
    width: "100%",
  },
  videoIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  videoSelectedText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  videoDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 16,
  },
  videoDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  videoDetailsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  videoDurationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  videoDurationText: {
    fontSize: 13,
    color: COLORS.success,
    marginLeft: 6,
    fontWeight: "600",
  },
  videoChangeText: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 12,
    fontWeight: "500",
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
  videoPlaceholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  videoPlaceholderText: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  videoRequirements: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  videoFeatureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.quaternary + "20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  videoFeatureText: {
    fontSize: 12,
    color: "#f59e0b",
    marginLeft: 4,
    fontWeight: "600",
  },

  // Info boxes
  smartContractInfoBox: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  infoBoxGradient: {
    padding: 16,
  },
  infoBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.info,
    marginLeft: 8,
  },
  infoBoxContent: {
    marginLeft: 28,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  infoBullet: {
    fontSize: 14,
    color: "#0369a1",
    marginRight: 8,
    fontWeight: "600",
  },
  infoText: {
    fontSize: 14,
    color: "#0369a1",
    flex: 1,
    lineHeight: 20,
  },

  // Features box
  featuresBox: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  featuresGradient: {
    padding: 16,
  },
  featuresHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f59e0b",
    marginLeft: 8,
  },
  featuresList: {
    marginLeft: 28,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#92400e",
    marginLeft: 8,
    flex: 1,
  },

  // Action buttons
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
    backgroundColor: COLORS.background,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default AddSectionModal;
