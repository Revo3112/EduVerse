// src/screens/CreateCourseScreen.js - Fixed Layout Version
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
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { pinataService } from "../services/PinataService";
import { videoService } from "../services/VideoService";
import { useWeb3 } from "../contexts/Web3Context";
import AddSectionModal from "../components/AddSectionModal";

// Constants
const TRANSACTION_DELAY_MS = 3000;
const MAX_RETRIES_SECTIONS = 2;
const { width: screenWidth } = Dimensions.get("window");

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
};

export default function CreateCourseScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const {
    isInitialized,
    modalPreventionActive,
    createCourse,
    addCourseSection,
    getMaxPriceETH,
  } = useWeb3();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

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
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  // Upload state
  const [uploadProgress, setUploadProgress] = useState({
    phase: 0,
    percentage: 0,
    message: "",
    completedFiles: 0,
    totalFiles: 0,
  });

  // Validation state
  const [currentMaxPrice, setCurrentMaxPrice] = useState(null);
  const [priceValidationError, setPriceValidationError] = useState("");

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 12,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fetch max price from contract
  useEffect(() => {
    const fetchMaxPrice = async () => {
      if (isInitialized && getMaxPriceETH) {
        try {
          const maxPrice = await getMaxPriceETH();
          setCurrentMaxPrice(parseFloat(maxPrice));
          console.log("📊 Maximum price allowed:", maxPrice, "ETH");
        } catch (error) {
          console.error("Failed to get max price:", error);
          setCurrentMaxPrice(0.002);
        }
      }
    };
    fetchMaxPrice();
  }, [isInitialized, getMaxPriceETH]);

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

  // Validation
  const validateCourseData = () => {
    if (!courseData.title.trim()) {
      Alert.alert("Error", "Course title is required");
      return false;
    }
    if (courseData.title.trim().length > 200) {
      Alert.alert("Error", "Title cannot exceed 200 characters");
      return false;
    }
    if (!courseData.description.trim()) {
      Alert.alert("Error", "Course description is required");
      return false;
    }
    if (courseData.description.trim().length > 1000) {
      Alert.alert("Error", "Description cannot exceed 1000 characters");
      return false;
    }
    if (!courseData.thumbnailFile) {
      Alert.alert("Error", "Please select a thumbnail image");
      return false;
    }
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
    if (sections.length === 0) {
      Alert.alert("Error", "Please add at least one section");
      return false;
    }
    return true;
  };

  // Upload files to IPFS with retry logic
  const uploadFilesToIPFS = async () => {
    console.log("🚀 Starting file uploads to IPFS");
    setCurrentStep("Uploading files to IPFS");

    const filesToUpload = [];

    if (courseData.thumbnailFile) {
      filesToUpload.push({
        type: "thumbnail",
        file: courseData.thumbnailFile,
        id: "thumbnail",
      });
    }

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
    setUploadProgress({
      phase: 1,
      percentage: 0,
      message: "Uploading files to IPFS...",
      completedFiles: 0,
      totalFiles,
    });

    const results = {
      thumbnailCID: null,
      videoCIDs: new Map(),
    };

    let completedFiles = 0;

    for (const fileItem of filesToUpload) {
      let retries = 0;
      const maxRetries = 2;
      let uploadSuccess = false;

      while (retries <= maxRetries && !uploadSuccess) {
        try {
          setUploadProgress((prev) => ({
            ...prev,
            message: `Uploading ${fileItem.type}: ${
              fileItem.file.name
            } (attempt ${retries + 1})`,
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
              results.thumbnailCID = uploadResult.ipfsHash.replace(
                "ipfs://",
                ""
              );
              console.log(`✅ Thumbnail uploaded: ${results.thumbnailCID}`);
              uploadSuccess = true;
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
              uploadSuccess = true;
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

          setCreateProgress(Math.round((completedFiles / totalFiles) * 40));
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(
            `❌ Upload attempt ${retries + 1} failed for ${fileItem.type}:`,
            error
          );
          retries++;
          if (retries > maxRetries) {
            throw new Error(
              `Failed to upload ${fileItem.type} after ${
                maxRetries + 1
              } attempts: ${error.message}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    console.log("✅ All files uploaded to IPFS");
    return results;
  };

  // Add sections with retry logic
  const addSectionsWithRetry = async (
    courseId,
    sectionsToAdd,
    uploadedVideoCIDs
  ) => {
    const sectionsAdded = [];
    const sectionErrors = [];
    let totalAdded = 0;

    for (let i = 0; i < sectionsToAdd.length; i++) {
      const section = sectionsToAdd[i];
      let retries = 0;
      let sectionAdded = false;

      while (retries <= MAX_RETRIES_SECTIONS && !sectionAdded) {
        try {
          console.log(
            `📝 Adding section ${i + 1}/${sectionsToAdd.length}: ${
              section.title
            } (attempt ${retries + 1})`
          );

          const sectionResult = await addCourseSection(courseId, {
            title: section.title,
            contentCID:
              uploadedVideoCIDs.get(section.id) || "placeholder-video-content",
            duration: section.duration,
          });

          if (sectionResult.success) {
            totalAdded++;
            sectionsAdded.push({
              ...section,
              transactionHash: sectionResult.transactionHash,
            });
            sectionAdded = true;
            console.log(
              `✅ Section ${i + 1}/${sectionsToAdd.length} added successfully`
            );
          } else {
            throw new Error(sectionResult.error || "Failed to add section");
          }

          const sectionProgress = 70 + ((i + 1) / sectionsToAdd.length) * 30;
          setCreateProgress(Math.round(sectionProgress));

          setUploadProgress((prev) => ({
            ...prev,
            message: `Added section ${totalAdded} of ${sectionsToAdd.length}...`,
          }));

          if (i < sectionsToAdd.length - 1) {
            console.log(
              `⏳ Waiting ${TRANSACTION_DELAY_MS}ms before next section...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, TRANSACTION_DELAY_MS)
            );
          }
        } catch (error) {
          console.error(`❌ Section attempt ${retries + 1} failed:`, error);

          if (
            error.message?.includes("cancelled by user") ||
            error.message?.includes("user rejected")
          ) {
            sectionErrors.push({
              section: section.title,
              error: "Transaction cancelled by user",
            });
            break;
          }

          retries++;
          if (retries > MAX_RETRIES_SECTIONS) {
            sectionErrors.push({
              section: section.title,
              error: error.message,
            });
            console.error(
              `Failed to add section "${section.title}" after ${
                MAX_RETRIES_SECTIONS + 1
              } attempts`
            );
          } else {
            console.log(`⏳ Waiting 5s before retry...`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    }

    return {
      sectionsAdded: totalAdded,
      totalSections: sectionsToAdd.length,
      errors: sectionErrors,
    };
  };

  // Main course creation
  const handleCreateCourse = async () => {
    if (!validateCourseData()) return;

    if (!isInitialized) {
      Alert.alert("Not Ready", "Smart contracts are still initializing.");
      return;
    }

    if (modalPreventionActive) {
      Alert.alert(
        "Please Wait",
        "System is initializing. Try again in a moment."
      );
      return;
    }

    if (isCreatingCourse) {
      Alert.alert("Please wait", "Course creation already in progress");
      return;
    }

    if (!isConnected) {
      Alert.alert(
        "Wallet Disconnected",
        "Please reconnect your wallet and try again."
      );
      return;
    }

    if (!isOnMantaNetwork) {
      Alert.alert(
        "Wrong Network",
        "Please switch to Manta Pacific Testnet before creating course."
      );
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
        `⚠️ Important:\n` +
        `• Make sure your wallet is connected\n` +
        `• Have enough ETH for gas fees\n` +
        `• Each section adds a 3s delay for network safety\n\n` +
        `Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create Course",
          onPress: executeCreateCourse,
        },
      ]
    );
  };

  const executeCreateCourse = async () => {
    try {
      console.log(
        "🚀 Starting course creation process on Manta Pacific Sepolia"
      );
      console.log("📊 Course data:", {
        title: courseData.title,
        description: courseData.description.substring(0, 50) + "...",
        price: courseData.isPaid ? courseData.price : "0",
        sectionsCount: sections.length,
        network: "Manta Pacific Sepolia",
      });

      setIsCreatingCourse(true);
      setCreateProgress(0);
      setCurrentStep("Starting...");

      // Phase 1: Upload files to IPFS
      const uploadedFiles = await uploadFilesToIPFS();

      // Phase 2: Create course on blockchain
      setUploadProgress((prev) => ({
        ...prev,
        phase: 2,
        message: "Creating course on blockchain...",
      }));
      setCreateProgress(50);
      setCurrentStep("Creating course on blockchain");

      console.log("📤 Calling createCourse with:", {
        title: courseData.title.trim(),
        description: courseData.description.trim(),
        thumbnailCID: uploadedFiles.thumbnailCID,
        pricePerMonth: courseData.isPaid ? courseData.price : "0",
      });

      const courseResult = await createCourse({
        title: courseData.title.trim(),
        description: courseData.description.trim(),
        thumbnailCID: uploadedFiles.thumbnailCID,
        pricePerMonth: courseData.isPaid ? courseData.price : "0",
      });

      console.log("📥 createCourse result:", courseResult);

      if (!courseResult.success) {
        throw new Error(courseResult.error || "Failed to create course");
      }

      const courseId = courseResult.courseId;
      console.log("✅ Course created with ID:", courseId);
      setCreateProgress(70);

      if (courseId === "unknown") {
        console.warn(
          "⚠️ CourseId could not be determined from transaction. Sections may need to be added manually."
        );
        Alert.alert(
          "Course Created",
          "Course was created but we couldn't retrieve the course ID. You may need to add sections manually.",
          [
            {
              text: "View My Courses",
              onPress: () => navigation.navigate("MyCourses"),
            },
          ]
        );
        return;
      }

      // Phase 3: Add sections to blockchain
      setUploadProgress((prev) => ({
        ...prev,
        phase: 3,
        message: "Adding sections to course (this may take a while)...",
      }));
      setCurrentStep("Adding sections to blockchain");

      const sectionResults = await addSectionsWithRetry(
        courseId,
        sections,
        uploadedFiles.videoCIDs
      );

      setCreateProgress(100);
      setCurrentStep("Complete!");

      let successMessage =
        `Course created successfully! 🎉\n\n` +
        `Course ID: ${courseId}\n` +
        `Sections added: ${sectionResults.sectionsAdded}/${sectionResults.totalSections}`;

      if (sectionResults.errors.length > 0) {
        successMessage += `\n\n⚠️ Some sections failed to add:\n${sectionResults.errors
          .map((e) => `• ${e.section}: ${e.error}`)
          .join(
            "\n"
          )}\n\nYou can add these sections later from the course edit page.`;
      }

      Alert.alert("Success!", successMessage, [
        {
          text: "View My Courses",
          onPress: () => navigation.navigate("MyCourses"),
        },
        { text: "OK", style: "default" },
      ]);

      resetForm();
    } catch (error) {
      console.error("❌ Course creation failed:", error);
      console.error("Error details:", {
        message: error.message,
        cause: error.cause,
        stack: error.stack,
      });

      let errorMessage = "Failed to create course.";
      let errorTitle = "Error";

      if (
        error.message?.includes("rejected by user") ||
        error.message?.includes("cancelled by user") ||
        error.message?.includes("User rejected") ||
        error.message?.includes("user rejected")
      ) {
        errorTitle = "Transaction Cancelled";
        errorMessage =
          "You cancelled the transaction. Please try again when ready.";
      } else if (error.message?.includes("insufficient funds")) {
        errorTitle = "Insufficient Funds";
        errorMessage =
          "You don't have enough ETH for gas fees. Please add funds to your wallet.";
      } else if (
        error.message?.includes("Wallet disconnected") ||
        error.message?.includes("Wallet not connected") ||
        error.message?.includes("Wallet not properly connected")
      ) {
        errorTitle = "Wallet Issue";
        errorMessage =
          "Your wallet was disconnected or not properly connected. Please reconnect and try again.";
      } else if (error.message?.includes("Price exceeds maximum")) {
        errorTitle = "Price Error";
        errorMessage = `The course price exceeds the maximum allowed (${
          currentMaxPrice?.toFixed(6) || "0.002"
        } ETH).`;
      } else if (error.message?.includes("reverted")) {
        errorTitle = "Transaction Reverted";
        errorMessage =
          "The transaction was reverted by the smart contract. This could be due to:\n\n" +
          "• Invalid input data\n" +
          "• Contract state issues\n" +
          "• Network problems\n\n" +
          "Please check your inputs and try again.";
      } else if (error.message?.includes("timeout")) {
        errorTitle = "Transaction Timeout";
        errorMessage =
          "Transaction took too long. It may still be processing. Check 'My Courses' in a few minutes.";
      } else if (error.message?.includes("nonce")) {
        errorTitle = "Transaction Conflict";
        errorMessage =
          "There was a transaction conflict. Please wait a moment and try again.";
      } else {
        errorMessage = `Failed to create course: ${error.message}`;
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsCreatingCourse(false);
      setCreateProgress(0);
      setCurrentStep("");
      setUploadProgress({
        phase: 0,
        percentage: 0,
        message: "",
        completedFiles: 0,
        totalFiles: 0,
      });
    }
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
    setUploadProgress({
      phase: 0,
      percentage: 0,
      message: "",
      completedFiles: 0,
      totalFiles: 0,
    });
  };

  // Price validation
  useEffect(() => {
    if (courseData.isPaid && courseData.price && currentMaxPrice) {
      const priceValue = parseFloat(courseData.price);
      if (isNaN(priceValue)) {
        setPriceValidationError("Please enter a valid number");
      } else if (priceValue <= 0) {
        setPriceValidationError("Price must be greater than 0");
      } else if (priceValue > currentMaxPrice) {
        setPriceValidationError(
          `Price cannot exceed ${currentMaxPrice.toFixed(
            6
          )} ETH (contract limit)`
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
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            style={styles.iconGradient}
          >
            <Ionicons name="wallet-outline" size={64} color="#fff" />
          </LinearGradient>
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
          <View style={styles.warningIcon}>
            <Ionicons name="warning-outline" size={64} color={COLORS.warning} />
          </View>
          <Text style={styles.warningTitle}>Wrong Network</Text>
          <Text style={styles.warningSubtitle}>
            Please switch to Manta Pacific Testnet
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const videosToUpload = sections.filter((s) => s.videoFile).length;
  const totalFiles = videosToUpload + (courseData.thumbnailFile ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create New Course</Text>
              <Text style={styles.subtitle}>
                Share your knowledge on blockchain
              </Text>
            </View>

            <View style={styles.form}>
              {/* Basic Course Information */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="book" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Course Information</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Course Title *</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter course title (max 200 chars)"
                      value={courseData.title}
                      onChangeText={(text) => handleInputChange("title", text)}
                      placeholderTextColor={COLORS.textMuted}
                      maxLength={200}
                    />
                    <View style={styles.inputIcon}>
                      <Ionicons
                        name="create-outline"
                        size={20}
                        color={COLORS.textMuted}
                      />
                    </View>
                  </View>
                  <Text style={styles.helperText}>
                    {courseData.title.length}/200 characters
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description *</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe what students will learn (max 1000 chars)"
                      value={courseData.description}
                      onChangeText={(text) =>
                        handleInputChange("description", text)
                      }
                      multiline={true}
                      numberOfLines={4}
                      textAlignVertical="top"
                      placeholderTextColor={COLORS.textMuted}
                      maxLength={1000}
                    />
                  </View>
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
                    activeOpacity={0.8}
                  >
                    {courseData.thumbnailFile ? (
                      <View style={styles.thumbnailPreview}>
                        <Image
                          source={{ uri: courseData.thumbnailUrl }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.8)"]}
                          style={styles.thumbnailOverlay}
                        >
                          <View style={styles.thumbnailCheckmark}>
                            <Ionicons
                              name="checkmark-circle"
                              size={40}
                              color={COLORS.success}
                            />
                          </View>
                          <Text style={styles.thumbnailSelectedText}>
                            Ready for Upload
                          </Text>
                          <Text style={styles.thumbnailChangeText}>
                            Tap to change
                          </Text>
                        </LinearGradient>
                      </View>
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <View style={styles.thumbnailIconWrapper}>
                          <Ionicons
                            name="image-outline"
                            size={48}
                            color={COLORS.primary}
                          />
                        </View>
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
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="cash" size={20} color={COLORS.secondary} />
                  </View>
                  <Text style={styles.sectionTitle}>Pricing</Text>
                </View>

                <View style={styles.switchGroup}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.label}>Paid Course</Text>
                    <Text style={styles.switchSubtext}>
                      Enable to charge for this course
                    </Text>
                  </View>
                  <Switch
                    value={courseData.isPaid}
                    onValueChange={(value) =>
                      handleInputChange("isPaid", value)
                    }
                    trackColor={{
                      false: COLORS.border,
                      true: COLORS.primaryLight,
                    }}
                    thumbColor={courseData.isPaid ? COLORS.primary : "#f4f3f4"}
                    ios_backgroundColor={COLORS.border}
                  />
                </View>

                {courseData.isPaid && (
                  <Animated.View
                    style={{
                      opacity: courseData.isPaid ? 1 : 0,
                      transform: [
                        {
                          translateY: courseData.isPaid ? 0 : -20,
                        },
                      ],
                    }}
                  >
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Price per Month (ETH)</Text>
                      <View style={styles.inputWrapper}>
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
                          onChangeText={(text) =>
                            handleInputChange("price", text)
                          }
                          keyboardType="decimal-pad"
                          placeholderTextColor={COLORS.textMuted}
                        />
                        <View style={styles.inputIcon}>
                          <Text style={styles.ethSymbol}>ETH</Text>
                        </View>
                      </View>
                      {priceValidationError ? (
                        <Text style={styles.errorText}>
                          {priceValidationError}
                        </Text>
                      ) : currentMaxPrice ? (
                        <Text style={styles.helpText}>
                          Maximum: {currentMaxPrice.toFixed(6)} ETH (contract
                          limit)
                        </Text>
                      ) : null}
                    </View>
                  </Animated.View>
                )}
              </View>

              {/* Course Sections */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name="list" size={20} color={COLORS.tertiary} />
                  </View>
                  <Text style={styles.sectionTitle}>Course Sections</Text>
                </View>

                <TouchableOpacity
                  style={styles.addSectionButton}
                  onPress={() => setShowAddSectionModal(true)}
                  disabled={isCreatingCourse}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.addSectionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addSectionText}>Add New Section</Text>
                  </LinearGradient>
                </TouchableOpacity>

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
                      <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                          <Ionicons
                            name="documents"
                            size={16}
                            color={COLORS.primary}
                          />
                          <Text style={styles.summaryText}>
                            {sections.length} section
                            {sections.length !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        {videosToUpload > 0 && (
                          <View style={styles.summaryItem}>
                            <Ionicons
                              name="videocam"
                              size={16}
                              color={COLORS.secondary}
                            />
                            <Text style={styles.summaryText}>
                              {videosToUpload} video
                              {videosToUpload !== 1 ? "s" : ""}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptySections}>
                    <View style={styles.emptySectionsIcon}>
                      <Ionicons
                        name="document-outline"
                        size={48}
                        color={COLORS.textMuted}
                      />
                    </View>
                    <Text style={styles.emptySectionsText}>
                      No sections added yet. Add your first section to get
                      started.
                    </Text>
                  </View>
                )}
              </View>

              {/* Network Info */}
              <View style={styles.networkInfo}>
                <LinearGradient
                  colors={["#f3f0ff", "#f8f6ff"]}
                  style={styles.networkInfoGradient}
                >
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.networkInfoText}>
                    Creating on Manta Pacific Sepolia. Each section requires a
                    separate transaction with 3s delay for network stability.
                  </Text>
                </LinearGradient>
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={[
                  styles.createButton,
                  (sections.length === 0 ||
                    isCreatingCourse ||
                    !courseData.thumbnailFile ||
                    !isInitialized ||
                    modalPreventionActive ||
                    priceValidationError) &&
                    styles.disabledButton,
                ]}
                onPress={handleCreateCourse}
                disabled={
                  sections.length === 0 ||
                  isCreatingCourse ||
                  !courseData.thumbnailFile ||
                  !isInitialized ||
                  modalPreventionActive ||
                  !!priceValidationError
                }
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    sections.length === 0 ||
                    isCreatingCourse ||
                    !courseData.thumbnailFile ||
                    !isInitialized ||
                    modalPreventionActive ||
                    priceValidationError
                      ? [COLORS.border, COLORS.textMuted]
                      : [COLORS.primary, COLORS.primaryDark]
                  }
                  style={styles.createButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isCreatingCourse ? (
                    <View style={styles.creatingContent}>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={styles.createButtonText}>
                        {currentStep ||
                          uploadProgress.message ||
                          "Creating Course..."}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.createContent}>
                      <Ionicons name="rocket-outline" size={24} color="white" />
                      <Text style={styles.createButtonText}>
                        Create Course{" "}
                        {totalFiles > 0 && `(${totalFiles} files)`}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Progress Display */}
              {isCreatingCourse && uploadProgress.phase > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>
                      Creating Your Course
                    </Text>
                    <Text style={styles.progressPercentage}>
                      {createProgress}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: `${createProgress}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {uploadProgress.message}
                  </Text>
                  <View style={styles.progressStats}>
                    {uploadProgress.phase === 1 && (
                      <View style={styles.progressStatItem}>
                        <Ionicons
                          name="cloud-upload"
                          size={16}
                          color={COLORS.primary}
                        />
                        <Text style={styles.progressStat}>
                          Files: {uploadProgress.completedFiles}/
                          {uploadProgress.totalFiles}
                        </Text>
                      </View>
                    )}
                    {uploadProgress.phase === 2 && (
                      <View style={styles.progressStatItem}>
                        <Ionicons
                          name="cube"
                          size={16}
                          color={COLORS.primary}
                        />
                        <Text style={styles.progressStat}>
                          Creating on blockchain...
                        </Text>
                      </View>
                    )}
                    {uploadProgress.phase === 3 && (
                      <View style={styles.progressStatItem}>
                        <Ionicons
                          name="layers"
                          size={16}
                          color={COLORS.primary}
                        />
                        <Text style={styles.progressStat}>
                          Adding sections...
                        </Text>
                      </View>
                    )}
                  </View>
                  {currentStep && (
                    <Text style={styles.currentStepText}>
                      Current step: {currentStep}
                    </Text>
                  )}
                </View>
              )}

              {/* Safety padding */}
              <View style={styles.safeBottomPadding} />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

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

// Enhanced Section Item Component
const SectionItem = React.memo(({ section, index, onRemove, disabled }) => {
  const scaleAnim = useState(new Animated.Value(0))[0];

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sectionItem,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{index + 1}</Text>
      </View>

      <View style={styles.sectionContent}>
        <View style={styles.sectionMainInfo}>
          <Text style={styles.sectionItemTitle} numberOfLines={2}>
            {section.title}
          </Text>
          <View style={styles.sectionMetaRow}>
            <View style={styles.sectionMetaItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.sectionDuration}>
                {Math.round(section.duration / 60)} min
              </Text>
            </View>
            {section.videoFile && (
              <View style={styles.sectionMetaItem}>
                <Ionicons name="videocam" size={14} color={COLORS.success} />
                <Text style={styles.videoStatusText}>Video ready</Text>
              </View>
            )}
          </View>
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
            color={disabled ? COLORS.textMuted : COLORS.error}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  warningIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  notConnectedSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.warning,
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Header - Fixed: removed gradient
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  // Form
  form: {
    padding: 20,
    paddingTop: 10,
  },
  section: {
    marginBottom: 32,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionHeaderWithButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },

  // Inputs
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "transparent",
    color: COLORS.text,
  },
  inputIcon: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -10 }],
  },
  ethSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    textAlignVertical: "top",
    paddingRight: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 6,
    marginLeft: 4,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
    marginLeft: 4,
  },

  // Switch
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  switchInfo: {
    flex: 1,
  },
  switchSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Thumbnail
  thumbnailUploadArea: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  thumbnailSelected: {
    borderColor: COLORS.primary,
    borderStyle: "solid",
  },
  thumbnailPreview: {
    width: "100%",
    height: 220,
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
  thumbnailCheckmark: {
    marginBottom: 8,
  },
  thumbnailSelectedText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  thumbnailChangeText: {
    color: "white",
    fontSize: 14,
    opacity: 0.9,
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    padding: 20,
  },
  thumbnailIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  thumbnailPlaceholderText: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  thumbnailRequirements: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },

  // Sections
  addSectionButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addSectionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  addSectionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  sectionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  sectionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionMainInfo: {
    flex: 1,
    paddingRight: 8,
  },
  sectionItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  sectionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sectionMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionDuration: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  videoStatusText: {
    fontSize: 13,
    color: COLORS.success,
    marginLeft: 4,
    fontWeight: "500",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.error + "10",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  disabledRemoveButton: {
    backgroundColor: COLORS.border,
  },
  sectionsSummary: {
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontWeight: "500",
  },
  emptySections: {
    alignItems: "center",
    paddingVertical: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  emptySectionsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptySectionsText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 22,
  },

  // Network info
  networkInfo: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  networkInfoGradient: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },
  networkInfoText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },

  // Create button
  createButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  disabledButton: {
    shadowOpacity: 0.1,
  },
  createButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "700",
    marginLeft: 8,
  },

  // Progress
  progressContainer: {
    marginBottom: 20,
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 12,
    fontWeight: "500",
  },
  progressStats: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  progressStatItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressStat: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontWeight: "500",
  },
  currentStepText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },

  safeBottomPadding: {
    height: 40,
  },
});
