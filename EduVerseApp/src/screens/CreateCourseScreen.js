// src/screens/CreateCourseScreen.js - Improved Create Course with IPFS and Smart Contract Integration
import React, { useState, useEffect, useCallback } from "react";
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
import { ethers } from "ethers";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { pinataService } from "../services/PinataService";
import { useBlockchain } from "../hooks/useBlockchain";

export default function CreateCourseScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { smartContractService, isInitialized } = useBlockchain();

  const [courseData, setCourseData] = useState({
    title: "",
    description: "",
    price: "",
    isPaid: false,
    thumbnailURI: "",
    thumbnailCID: "", // Store IPFS CID separately
    thumbnailUrl: "", // Store accessible URL separately
    thumbnailFile: null, // Store selected thumbnail file for later upload
  });

  const [sections, setSections] = useState([]);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSection, setNewSection] = useState({
    title: "",
    videoFile: null, // Store selected video file for later upload (dummy for now)
    duration: "", // Duration in minutes (will be converted to seconds for smart contract)
  });

  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentMaxPrice, setCurrentMaxPrice] = useState(null);
  const [priceValidationError, setPriceValidationError] = useState("");

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;
  const handleInputChange = (field, value) => {
    setCourseData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Function to handle thumbnail file selection (not upload yet)
  const handleThumbnailSelect = async () => {
    try {
      // Request permission for camera roll
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to select images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Check file size (max 5MB)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            "File Too Large",
            "Please select an image smaller than 5MB."
          );
          return;
        }

        // Store the selected file for later upload
        setCourseData((prev) => ({
          ...prev,
          thumbnailFile: {
            uri: asset.uri,
            type: asset.type || "image/jpeg",
            name: asset.fileName || `thumbnail_${Date.now()}.jpg`,
            size: asset.fileSize,
          },
          thumbnailUrl: asset.uri, // For preview
        }));

        console.log("Thumbnail file selected:", asset.fileName);
      }
    } catch (error) {
      console.error("Error selecting thumbnail:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  // Function to handle video file selection for sections (dummy for now)
  const handleVideoSelect = useCallback(async () => {
    try {
      Alert.alert(
        "Video Upload",
        "Video upload will be integrated with Livepeer in the next update. For now, you can create sections without video.",
        [
          {
            text: "OK",
            onPress: () => {
              // Dummy video file for now
              setNewSection((prev) => ({
                ...prev,
                videoFile: {
                  name: "dummy_video.mp4",
                  type: "video/mp4",
                  uri: "dummy://placeholder",
                },
              }));
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error selecting video:", error);
    }
  }, []);

  const handleSectionInputChange = useCallback((field, value) => {
    setNewSection((prevSection) => {
      // Prevent unnecessary updates if value hasn't changed
      if (prevSection[field] === value) {
        return prevSection;
      }
      return {
        ...prevSection,
        [field]: value,
      };
    });
  }, []);

  const addSection = useCallback(() => {
    if (!newSection.title.trim()) {
      Alert.alert("Error", "Please enter section title");
      return;
    }
    if (newSection.title.trim().length < 3) {
      Alert.alert("Error", "Section title must be at least 3 characters long");
      return;
    }
    if (newSection.title.trim().length > 100) {
      Alert.alert("Error", "Section title cannot exceed 100 characters");
      return;
    }
    if (!newSection.duration.trim()) {
      Alert.alert("Error", "Please enter section duration");
      return;
    }

    const durationValue = parseInt(newSection.duration);
    if (isNaN(durationValue) || durationValue <= 0) {
      Alert.alert("Error", "Please enter a valid duration greater than 0");
      return;
    }
    if (durationValue > 600) {
      Alert.alert(
        "Error",
        "Section duration cannot exceed 600 minutes (10 hours)"
      );
      return;
    }

    // Check for maximum sections limit
    if (sections.length >= 50) {
      Alert.alert("Error", "Maximum 50 sections allowed per course");
      return;
    }

    // Check for duplicate section titles
    const duplicateTitle = sections.find(
      (section) =>
        section.title.toLowerCase().trim() ===
        newSection.title.toLowerCase().trim()
    );
    if (duplicateTitle) {
      Alert.alert("Error", "A section with this title already exists");
      return;
    }

    const section = {
      id: Date.now() + Math.random(), // More unique ID to prevent collisions
      title: newSection.title.trim(),
      videoFile: newSection.videoFile, // Store video file for later upload
      contentURI: "", // Will be populated after video upload (dummy for now)
      duration: durationValue,
      orderId: sections.length,
      createdAt: new Date().toISOString(),
    };

    // Update sections and reset form in batch
    setSections((prevSections) => [...prevSections, section]);
    setNewSection({ title: "", videoFile: null, duration: "" });
    setShowAddSectionModal(false);
  }, [newSection, sections]);

  const removeSection = useCallback((sectionId) => {
    Alert.alert(
      "Remove Section",
      "Are you sure you want to remove this section?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setSections((prevSections) =>
              prevSections.filter((s) => s.id !== sectionId)
            );
          },
        },
      ]
    );
  }, []);

  const handleCreateCourse = async () => {
    // Enhanced validation dengan race condition prevention
    if (!courseData.title.trim()) {
      Alert.alert("Error", "Please enter a course title");
      return;
    }
    if (courseData.title.trim().length < 3) {
      Alert.alert("Error", "Course title must be at least 3 characters long");
      return;
    }
    if (courseData.title.trim().length > 100) {
      Alert.alert("Error", "Course title cannot exceed 100 characters");
      return;
    }
    if (!courseData.description.trim()) {
      Alert.alert("Error", "Please enter a course description");
      return;
    }
    if (courseData.description.trim().length < 10) {
      Alert.alert(
        "Error",
        "Course description must be at least 10 characters long"
      );
      return;
    }
    if (courseData.description.trim().length > 1000) {
      Alert.alert("Error", "Course description cannot exceed 1000 characters");
      return;
    }
    if (courseData.isPaid) {
      if (!courseData.price.trim()) {
        Alert.alert("Error", "Please enter a price for paid course");
        return;
      }
      const priceValue = parseFloat(courseData.price);
      if (isNaN(priceValue) || priceValue <= 0) {
        Alert.alert("Error", "Please enter a valid price greater than 0");
        return;
      }
      if (currentMaxPrice && priceValue > currentMaxPrice) {
        Alert.alert(
          "Error",
          `Price cannot exceed ${currentMaxPrice.toFixed(
            6
          )} ETH (equivalent to $2 USD)\n\nCurrent maximum allowed: ${currentMaxPrice.toFixed(
            6
          )} ETH`
        );
        return;
      }
    }
    if (!courseData.thumbnailFile) {
      Alert.alert("Error", "Please select a thumbnail image");
      return;
    }
    if (sections.length === 0) {
      Alert.alert("Error", "Please add at least one course section");
      return;
    }
    if (sections.length > 50) {
      Alert.alert("Error", "Maximum 50 sections allowed per course");
      return;
    }

    // Validate sections
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section.title.trim()) {
        Alert.alert("Error", `Section ${i + 1} must have a title`);
        return;
      }
      if (section.title.trim().length < 3) {
        Alert.alert(
          "Error",
          `Section ${i + 1} title must be at least 3 characters long`
        );
        return;
      }
      if (section.title.trim().length > 100) {
        Alert.alert(
          "Error",
          `Section ${i + 1} title cannot exceed 100 characters`
        );
        return;
      }
      if (!section.duration || section.duration <= 0) {
        Alert.alert("Error", `Section ${i + 1} must have a valid duration`);
        return;
      }
      if (section.duration > 600) {
        // 10 hours max per section
        Alert.alert(
          "Error",
          `Section ${i + 1} duration cannot exceed 600 minutes (10 hours)`
        );
        return;
      }
    }

    if (!isInitialized || !smartContractService) {
      Alert.alert(
        "Error",
        "Smart contract service not initialized. Please try again."
      );
      return;
    }

    // Check if we're already creating a course (prevent double submission)
    if (isCreatingCourse) {
      Alert.alert("Please wait", "Course creation is already in progress");
      return;
    }

    Alert.alert(
      "Create Course",
      `This will create a new course with ${sections.length} sections on the blockchain.\n\n` +
        `Title: ${courseData.title}\n` +
        `Price: ${courseData.isPaid ? `${courseData.price} ETH` : "Free"}\n` +
        `Sections: ${sections.length}\n\n` +
        `Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async () => {
            setIsCreatingCourse(true);
            setUploadProgress(0);

            try {
              console.log("Starting course creation process...");

              // Step 1: Upload thumbnail to IPFS
              console.log("Uploading thumbnail to IPFS...");
              setUploadProgress(10);

              const thumbnailResult = await uploadThumbnailToIPFS(
                courseData.thumbnailFile
              );
              if (!thumbnailResult.success) {
                throw new Error(
                  thumbnailResult.error || "Failed to upload thumbnail to IPFS"
                );
              }

              console.log("Thumbnail uploaded successfully:", thumbnailResult);
              setUploadProgress(30);

              // Create IPFS URI format for smart contract
              const thumbnailURI = `ipfs://${thumbnailResult.ipfsHash}`;

              // Step 2: Verify price limit again before blockchain transaction
              if (courseData.isPaid) {
                const priceValue = parseFloat(courseData.price);
                try {
                  // Get max price in wei from smart contract (getMaxPriceInETH returns wei despite the name)
                  const maxPriceInWei =
                    await smartContractService.getMaxPriceInWei();
                  const maxPriceInEth = parseFloat(
                    ethers.formatEther(maxPriceInWei)
                  );

                  if (priceValue > maxPriceInEth) {
                    throw new Error(
                      `Price ${priceValue} ETH exceeds current maximum allowed: ${maxPriceInEth.toFixed(
                        6
                      )} ETH (equivalent to $2 USD)`
                    );
                  }

                  console.log(
                    `Price validation passed: ${priceValue} ETH <= ${maxPriceInEth.toFixed(
                      6
                    )} ETH`
                  );
                } catch (priceCheckError) {
                  console.error("Error checking price limit:", priceCheckError);
                  throw new Error(
                    "Failed to verify price limit. Please try again."
                  );
                }
              }

              // Step 3: Create course on blockchain with atomic transaction
              console.log("Creating course on blockchain...");
              setUploadProgress(50);

              const createCourseParams = {
                title: courseData.title.trim(),
                description: courseData.description.trim(),
                thumbnailURI: thumbnailURI,
                // PRICE FLOW: User enters ETH → Convert to string → SmartContractService converts to wei → Smart contract
                // The smart contract expects pricePerMonth in wei (uint256)
                // SmartContractService.createCourse() calls ethers.parseEther() to convert ETH string to wei
                pricePerMonth: courseData.isPaid
                  ? courseData.price.toString() // ETH as string (e.g. "0.001")
                  : "0", // Free course
              };

              console.log("Course creation parameters:", {
                ...createCourseParams,
                priceInETH: createCourseParams.pricePerMonth,
                priceInWei: courseData.isPaid
                  ? ethers
                      .parseEther(createCourseParams.pricePerMonth)
                      .toString()
                  : "0",
              });

              const createCourseResult =
                await smartContractService.createCourse(createCourseParams);

              if (!createCourseResult.success) {
                throw new Error(
                  createCourseResult.error ||
                    "Failed to create course on blockchain"
                );
              }

              console.log("Course created successfully on blockchain:", {
                courseId: createCourseResult.courseId,
                transactionHash: createCourseResult.transactionHash,
              });

              setUploadProgress(70);
              const courseId = createCourseResult.courseId;

              // Step 4: Add course sections with proper error handling
              console.log(
                `Adding ${sections.length} sections to course ${courseId}...`
              );
              const sectionResults = [];
              let successfulSectionsCount = 0;

              for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                console.log(
                  `Adding section ${i + 1}/${sections.length}: "${
                    section.title
                  }"`
                );

                try {
                  // For now, use dummy content URI since video upload is not yet implemented
                  const contentURI = section.videoFile
                    ? "dummy://livepeer-placeholder"
                    : "";

                  const sectionParams = {
                    title: section.title.trim(),
                    contentURI: contentURI,
                    // DURATION CONVERSION: User enters minutes → Convert to seconds for smart contract
                    // Smart contract expects duration in seconds (uint256)
                    duration: section.duration * 60, // Convert minutes to seconds
                  };

                  console.log(`Section ${i + 1} parameters:`, {
                    ...sectionParams,
                    durationInMinutes: section.duration,
                    durationInSeconds: sectionParams.duration,
                  });

                  const sectionResult =
                    await smartContractService.addCourseSection(
                      courseId,
                      sectionParams
                    );

                  if (sectionResult.success) {
                    successfulSectionsCount++;
                    sectionResults.push({
                      index: i,
                      success: true,
                      sectionId: sectionResult.sectionId,
                      transactionHash: sectionResult.transactionHash,
                      title: section.title,
                    });
                    console.log(
                      `Section ${i + 1} "${
                        section.title
                      }" added successfully with ID:`,
                      sectionResult.sectionId
                    );
                  } else {
                    console.error(
                      `Failed to add section ${i + 1} "${section.title}":`,
                      sectionResult.error
                    );
                    sectionResults.push({
                      index: i,
                      success: false,
                      error: sectionResult.error,
                      title: section.title,
                    });
                  }
                } catch (sectionError) {
                  console.error(
                    `Error adding section ${i + 1} "${section.title}":`,
                    sectionError
                  );
                  sectionResults.push({
                    index: i,
                    success: false,
                    error: sectionError.message,
                    title: section.title,
                  });
                }

                // Update progress proportionally
                const sectionProgress = ((i + 1) / sections.length) * 25;
                setUploadProgress(70 + sectionProgress);

                // Small delay to prevent overwhelming the network
                if (i < sections.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 500));
                }
              }

              // Step 5: Final validation and results
              const failedSections = sectionResults.filter((r) => !r.success);

              console.log("Course creation completed:", {
                courseId,
                totalSections: sections.length,
                successfulSections: successfulSectionsCount,
                failedSections: failedSections.length,
                transactionHash: createCourseResult.transactionHash,
              });

              setUploadProgress(100);

              // Generate success message
              let successMessage = `✅ Course created successfully!\n\n`;
              successMessage += `📚 Course ID: ${courseId}\n`;
              successMessage += `📖 Sections: ${successfulSectionsCount}/${sections.length} added\n`;
              successMessage += `🖼️ Thumbnail: ${thumbnailResult.ipfsHash.substring(
                0,
                12
              )}...\n`;
              successMessage += `💰 Price: ${
                courseData.isPaid ? `${courseData.price} ETH/month` : "Free"
              }\n`;
              successMessage += `🔗 Transaction: ${createCourseResult.transactionHash.substring(
                0,
                12
              )}...`;

              if (failedSections.length > 0) {
                successMessage += `\n\n⚠️ Warning: ${failedSections.length} sections failed to be added:\n`;
                failedSections.slice(0, 3).forEach((failed, index) => {
                  successMessage += `• ${failed.title}\n`;
                });
                if (failedSections.length > 3) {
                  successMessage += `• ... and ${
                    failedSections.length - 3
                  } more\n`;
                }
                successMessage += `\nYou can add them later from the course management page.`;
              }

              Alert.alert("Success", successMessage);

              // Reset form only after successful creation
              setCourseData({
                title: "",
                description: "",
                price: "",
                isPaid: false,
                thumbnailURI: "",
                thumbnailCID: "",
                thumbnailUrl: "",
                thumbnailFile: null,
              });
              setSections([]);
              setUploadProgress(0);
              setPriceValidationError("");

              // Navigate to MyCourses
              navigation.navigate("MyCourses");
            } catch (error) {
              console.error("Error creating course:", error);

              // Enhanced error handling dengan kategorisasi error
              let errorMessage = "Failed to create course.";
              let errorCategory = "unknown";

              if (
                error.message.includes("user rejected") ||
                error.message.includes("User denied")
              ) {
                errorMessage = "Transaction was rejected by user.";
                errorCategory = "user_rejection";
              } else if (error.message.includes("insufficient funds")) {
                errorMessage =
                  "Insufficient funds to pay for transaction fees.";
                errorCategory = "insufficient_funds";
              } else if (
                error.message.includes("Price exceeds") ||
                error.message.includes("price")
              ) {
                errorMessage = `Price validation failed: ${error.message}`;
                errorCategory = "price_validation";
              } else if (
                error.message.includes("network") ||
                error.message.includes("timeout")
              ) {
                errorMessage =
                  "Network error. Please check your connection and try again.";
                errorCategory = "network";
              } else if (
                error.message.includes("IPFS") ||
                error.message.includes("upload")
              ) {
                errorMessage = `Failed to upload thumbnail: ${error.message}`;
                errorCategory = "ipfs_upload";
              } else if (error.message.includes("gas")) {
                errorMessage =
                  "Transaction failed due to gas issues. Please try again with higher gas limit.";
                errorCategory = "gas";
              } else if (error.message.includes("revert")) {
                errorMessage =
                  "Smart contract rejected the transaction. Please check your input values.";
                errorCategory = "contract_revert";
              } else {
                errorMessage = `Failed to create course: ${error.message}`;
                errorCategory = "general";
              }

              console.error("Error category:", errorCategory);
              Alert.alert("Error", errorMessage);
            } finally {
              setIsCreatingCourse(false);
              setUploadProgress(0);
            }
          },
        },
      ]
    );
  };

  // Helper function to upload thumbnail to IPFS with retry mechanism
  const uploadThumbnailToIPFS = async (thumbnailFile, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Uploading thumbnail attempt ${attempt}/${retries}...`);

        // Validate file before upload
        if (!thumbnailFile || !thumbnailFile.uri) {
          throw new Error("Invalid thumbnail file");
        }

        // Check file size again
        if (thumbnailFile.size && thumbnailFile.size > 5 * 1024 * 1024) {
          throw new Error("Thumbnail file too large (max 5MB)");
        }

        const formData = new FormData();
        formData.append("file", {
          uri: thumbnailFile.uri,
          type: thumbnailFile.type || "image/jpeg",
          name: thumbnailFile.name || `course_thumbnail_${Date.now()}.jpg`,
        });

        // Enhanced metadata with course information
        const metadata = {
          description: "Course thumbnail image",
          category: "thumbnail",
          app: "eduverse",
          source: "create-course",
          courseTitle: courseData.title.trim() || "untitled",
          creator: address || "unknown",
          uploadAttempt: attempt,
          fileSize: thumbnailFile.size || 0,
        };

        const keyValues = {
          category: "thumbnail",
          courseTitle: courseData.title.trim() || "untitled",
          app: "eduverse",
          creator: address || "unknown",
          uploadedAt: new Date().toISOString(),
          network: "manta-pacific-testnet",
          version: "1.0",
        };

        const result = await pinataService.uploadFile(formData, {
          metadata,
          keyValues,
          network: "private",
        });

        if (result.success && result.ipfsHash) {
          console.log(
            `Thumbnail uploaded successfully on attempt ${attempt}:`,
            result.ipfsHash
          );
          return result;
        } else {
          throw new Error(result.error || "Upload failed without error info");
        }
      } catch (error) {
        console.error(`Thumbnail upload attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          // Last attempt failed
          return {
            success: false,
            error: `Failed to upload thumbnail after ${retries} attempts: ${error.message}`,
          };
        }

        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        console.log(`Retrying upload in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  };

  const DifficultySelector = () => null; // Removed since smart contract doesn't support difficulty

  const SectionItem = React.memo(({ section, onRemove }) => (
    <View style={styles.sectionItem}>
      <View style={styles.sectionInfo}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionDuration}>{section.duration} minutes</Text>
        {section.videoFile && (
          <Text style={styles.sectionContent} numberOfLines={1}>
            🎥 {section.videoFile.name}
          </Text>
        )}
        {!section.videoFile && (
          <Text style={styles.sectionContentPlaceholder}>
            📹 Video will be integrated with Livepeer
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(section.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  ));

  const AddSectionModal = React.memo(() => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showAddSectionModal}
      onRequestClose={() => setShowAddSectionModal(false)}
      statusBarTranslucent={false}
      hardwareAccelerated={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Course Section</Text>
            <TouchableOpacity
              onPress={() => setShowAddSectionModal(false)}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Section Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter section title"
                value={newSection.title}
                onChangeText={(text) => handleSectionInputChange("title", text)}
                placeholderTextColor="#999"
                autoCorrect={false}
                autoCapitalize="words"
                blurOnSubmit={false}
                returnKeyType="next"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Video Content</Text>
              <TouchableOpacity
                style={[
                  styles.videoUploadArea,
                  newSection.videoFile && styles.videoSelected,
                ]}
                onPress={handleVideoSelect}
                activeOpacity={0.7}
              >
                {newSection.videoFile ? (
                  <View style={styles.videoPreview}>
                    <Ionicons name="videocam" size={32} color="#9747FF" />
                    <Text style={styles.videoSelectedText}>
                      {newSection.videoFile.name}
                    </Text>
                    <Text style={styles.videoChangeText}>Tap to change</Text>
                  </View>
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons
                      name="videocam-outline"
                      size={32}
                      color="#9e9e9e"
                    />
                    <Text style={styles.videoPlaceholderText}>
                      Add video content
                    </Text>
                    <Text style={styles.videoRequirements}>
                      Video upload via Livepeer coming soon
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={newSection.duration}
                onChangeText={(text) =>
                  handleSectionInputChange("duration", text)
                }
                keyboardType="numeric"
                placeholderTextColor="#999"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="done"
                maxLength={3}
              />
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={addSection}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Section</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  ));

  // Effect untuk fetch maximum price dari smart contract
  useEffect(() => {
    const fetchMaxPrice = async () => {
      if (smartContractService && isInitialized) {
        try {
          // Get max price in wei from smart contract (getMaxPriceInETH actually returns wei)
          const maxPriceInWei = await smartContractService.getMaxPriceInWei();
          if (maxPriceInWei) {
            const maxPriceInEth = parseFloat(ethers.formatEther(maxPriceInWei));
            setCurrentMaxPrice(maxPriceInEth);
            console.log(
              "Maximum price allowed:",
              maxPriceInEth,
              "ETH",
              "(",
              ethers.formatUnits(maxPriceInWei, "wei"),
              "wei )"
            );
          }
        } catch (error) {
          console.error("Error fetching max price:", error);
          setCurrentMaxPrice(0.001); // Fallback value
        }
      }
    };

    fetchMaxPrice();
  }, [smartContractService, isInitialized]);

  // Effect untuk validasi price real-time
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
          )} ETH (equivalent to $2 USD)`
        );
      } else {
        setPriceValidationError("");
      }
    } else {
      setPriceValidationError("");
    }
  }, [courseData.price, courseData.isPaid, currentMaxPrice]);

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
            Please switch to Manta Pacific Testnet to create courses
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create New Course</Text>
          <Text style={styles.subtitle}>
            Share your knowledge with the world
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
                placeholder="Enter course title"
                value={courseData.title}
                onChangeText={(text) => handleInputChange("title", text)}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what students will learn..."
                value={courseData.description}
                onChangeText={(text) => handleInputChange("description", text)}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
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
                        Image Selected
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
                      Tap to select thumbnail image
                    </Text>
                    <Text style={styles.thumbnailRequirements}>
                      Recommended: 16:9 aspect ratio, max 5MB
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.helpText}>
                Select a high-quality image that represents your course. It will
                be uploaded to IPFS when you create the course.
              </Text>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Pricing</Text>

            <View style={styles.switchGroup}>
              <View style={styles.switchInfo}>
                <Text style={styles.label}>Paid Course</Text>
                <Text style={styles.switchSubtext}>
                  Enable if you want to charge for this course
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
                <Text style={styles.label}>Price per Month (in ETH)</Text>
                <TextInput
                  style={[
                    styles.input,
                    priceValidationError && styles.inputError,
                  ]}
                  placeholder={
                    currentMaxPrice
                      ? `Max: ${currentMaxPrice.toFixed(6)} ETH`
                      : "0.01"
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
                    Maximum allowed: {currentMaxPrice.toFixed(6)} ETH
                    (equivalent to $2 USD)
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
                    onRemove={removeSection}
                  />
                ))}
                <Text style={styles.sectionsCount}>
                  {sections.length} section{sections.length !== 1 ? "s" : ""}{" "}
                  added
                </Text>
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
                  Creating Course... {uploadProgress}%
                </Text>
              </View>
            ) : (
              <View style={styles.createContent}>
                <Ionicons name="rocket-outline" size={20} color="white" />
                <Text style={styles.createButtonText}>Create Course</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Progress Bar */}
          {isCreatingCourse && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {uploadProgress < 10
                  ? "Preparing upload..."
                  : uploadProgress < 30
                  ? "Uploading thumbnail to IPFS..."
                  : uploadProgress < 50
                  ? "Validating price limit..."
                  : uploadProgress < 70
                  ? "Creating course on blockchain..."
                  : uploadProgress < 100
                  ? "Adding sections to course..."
                  : "Finalizing course creation..."}
              </Text>
              <Text style={styles.progressPercentage}>{uploadProgress}%</Text>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#9747FF"
            />
            <Text style={styles.infoText}>
              Your course will be deployed as a smart contract on Manta Pacific
              Testnet. The thumbnail image will be uploaded to IPFS and
              referenced in the smart contract. This action requires transaction
              fees. Note: Category and difficulty fields have been removed to
              match smart contract requirements.
            </Text>
          </View>

          {/* Requirements Card */}
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>📋 Requirements</Text>
            <Text style={styles.requirementsText}>
              • Course title (3-100 characters) and description (10-1000
              characters) are required{"\n"}• Thumbnail image must be selected
              (max 5MB, 16:9 recommended){"\n"}• At least 1 course section
              required (max 50 sections){"\n"}• Section duration: 1-600 minutes
              per section{"\n"}• Course price: 0 to{" "}
              {currentMaxPrice
                ? `${currentMaxPrice.toFixed(6)} ETH`
                : "2 USD equivalent"}
              {"\n"}• You need ETH for transaction fees{"\n"}• Video upload via
              Livepeer will be available in next update{"\n"}• Unique section
              titles within course required{"\n"}• Section durations are stored
              in seconds on blockchain
            </Text>
          </View>
        </View>
      </ScrollView>

      <AddSectionModal />
    </SafeAreaView>
  );
}

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
    marginBottom: 30,
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
    marginBottom: 4,
  },
  readOnlyInput: {
    backgroundColor: "#f8f9fa",
    color: "#666",
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
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  sectionDuration: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  sectionContent: {
    fontSize: 12,
    color: "#9747FF",
  },
  removeButton: {
    padding: 8,
  },
  sectionsCount: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
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
  progressBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#9747FF",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: "#9747FF",
    textAlign: "center",
    fontWeight: "600",
  },
  // Thumbnail upload styles
  thumbnailUploadArea: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
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
  // Video upload styles
  videoUploadArea: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  videoSelected: {
    borderColor: "#9747FF",
    borderStyle: "solid",
    backgroundColor: "#f3f0ff",
  },
  videoPreview: {
    alignItems: "center",
    padding: 16,
  },
  videoSelectedText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  videoChangeText: {
    fontSize: 12,
    color: "#9747FF",
    marginTop: 4,
  },
  videoPlaceholder: {
    alignItems: "center",
    padding: 16,
  },
  videoPlaceholderText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginTop: 8,
  },
  videoRequirements: {
    fontSize: 12,
    color: "#9e9e9e",
    marginTop: 4,
    textAlign: "center",
  },
  // Section content styles
  sectionContentPlaceholder: {
    fontSize: 12,
    color: "#9e9e9e",
    fontStyle: "italic",
  },
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
  requirementsCard: {
    backgroundColor: "#fff3e0",
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e65100",
    marginBottom: 8,
  },
  requirementsText: {
    fontSize: 13,
    color: "#ef6c00",
    lineHeight: 20,
  },
  // Modal styles - Updated for better stability
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 30,
    flex: 1,
  },
  addButton: {
    backgroundColor: "#9747FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 16,
  },
  priceError: {
    color: "#ff4444",
    fontSize: 12,
    marginTop: 4,
  },
});
