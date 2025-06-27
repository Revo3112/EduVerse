// src/screens/CreateCourseScreen.js - Improved Create Course with IPFS and Smart Contract Integration
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
import { ethers } from "ethers";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { pinataService } from "../services/PinataService";
import { videoService } from "../services/VideoService";
import { useBlockchain } from "../hooks/useBlockchain";
import AddSectionModal from "../components/AddSectionModal";

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

  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentMaxPrice, setCurrentMaxPrice] = useState(null);
  const [priceValidationError, setPriceValidationError] = useState("");
  const [progressMessage, setProgressMessage] = useState("");

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

        console.log(
          "✅ Thumbnail file selected (not uploaded yet):",
          asset.fileName
        );
      }
    } catch (error) {
      console.error("Error selecting thumbnail:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  // Function to handle adding a new section from the modal
  const handleAddSection = useCallback(
    (sectionData) => {
      // Check for maximum sections limit
      if (sections.length >= 50) {
        Alert.alert("Error", "Maximum 50 sections allowed per course");
        return;
      }

      // Check for duplicate section titles
      const duplicateTitle = sections.find(
        (section) =>
          section.title.toLowerCase().trim() === sectionData.title.toLowerCase()
      );
      if (duplicateTitle) {
        Alert.alert("Error", "A section with this title already exists");
        return;
      }

      // Create new section object - STORE VIDEO FILE FOR LATER UPLOAD
      const newSectionObj = {
        id: Date.now() + Math.random(),
        title: sectionData.title,
        contentURI: sectionData.contentURI, // Temporary URI until upload
        duration: sectionData.duration, // Duration in SECONDS
        videoFile: sectionData.videoFile, // Store video file for later upload
        uploadedVideoData: sectionData.uploadedVideoData, // Store upload metadata
        orderId: sections.length,
        createdAt: new Date().toISOString(),
        // Flag to track upload status
        uploadStatus: sectionData.videoFile ? "pending" : "no-video",
      };

      setSections((prevSections) => [...prevSections, newSectionObj]);

      console.log("✅ Section added (video stored for later upload):", {
        title: newSectionObj.title,
        hasVideo: !!newSectionObj.videoFile,
        videoFileName: newSectionObj.videoFile?.name,
        durationSeconds: newSectionObj.duration,
      });
    },
    [sections]
  );

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

  // Main function to create course - EXECUTE ALL UPLOADS HERE
  const handleCreateCourse = async () => {
    // Enhanced validation
    if (!validateCourseData()) {
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
        `Sections: ${sections.length}\n` +
        `Videos to upload: ${sections.filter((s) => s.videoFile).length}\n\n` +
        `Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: executeCreateCourse,
        },
      ]
    );
  };

  // Execute the actual course creation with proper upload sequence
  // ✅ Enhanced executeCreateCourse with retry mechanism
  const executeCreateCourse = async () => {
    setIsCreatingCourse(true);
    setUploadProgress(0);
    setProgressMessage("Starting course creation...");

    try {
      console.log("🚀 Starting course creation process...");

      // ✅ STEP 1: Upload semua file secara PARALLEL
      setProgressMessage("Uploading files to IPFS...");
      setUploadProgress(10);

      const uploadPromises = [];

      // Upload thumbnail
      if (courseData.thumbnailFile) {
        uploadPromises.push(
          uploadThumbnailToIPFS(courseData.thumbnailFile).then((result) => ({
            type: "thumbnail",
            result,
          }))
        );
      }

      // Upload videos secara parallel
      const sectionsWithVideos = sections.filter(
        (section) => section.videoFile
      );
      sectionsWithVideos.forEach((section, index) => {
        uploadPromises.push(
          videoService
            .uploadVideoPublic(section.videoFile, {
              courseId: "temp-course",
              sectionId: section.id.toString(),
              name: section.videoFile.name,
              metadata: {
                uploadSource: "CreateCourseScreen",
                sectionTitle: section.title,
                uploadedAt: new Date().toISOString(),
              },
            })
            .then((result) => ({
              type: "video",
              sectionId: section.id,
              result,
            }))
        );
      });

      console.log(
        `📤 Starting parallel upload of ${uploadPromises.length} files...`
      );

      // Upload semua file secara bersamaan
      const uploadResults = await Promise.allSettled(uploadPromises);

      let thumbnailResult = null;
      const videoResults = new Map();

      // Process upload results
      uploadResults.forEach((promiseResult, index) => {
        if (promiseResult.status === "fulfilled") {
          const { type, sectionId, result } = promiseResult.value;
          if (type === "thumbnail") {
            thumbnailResult = result;
          } else if (type === "video") {
            videoResults.set(sectionId, result);
          }
        } else {
          console.error(`Upload failed:`, promiseResult.reason);
        }
      });

      // Validate thumbnail upload
      if (!thumbnailResult || !thumbnailResult.success) {
        throw new Error("Failed to upload thumbnail to IPFS");
      }

      console.log("✅ All files uploaded successfully");
      setUploadProgress(40);

      // ✅ STEP 2: Prepare sections with uploaded CIDs
      const uploadedSections = sections.map((section) => {
        const finalSection = { ...section };

        if (section.videoFile && videoResults.has(section.id)) {
          const videoResult = videoResults.get(section.id);
          if (videoResult.success) {
            // ✅ Extract CID from IPFS hash (remove 'ipfs://' prefix if present)
            const contentCID = videoResult.ipfsHash.replace("ipfs://", "");
            finalSection.contentCID = contentCID;
            finalSection.uploadStatus = "uploaded";
          } else {
            finalSection.contentCID = "placeholder-video-content";
            finalSection.uploadStatus = "failed";
          }
        } else {
          finalSection.contentCID = "placeholder-video-content";
          finalSection.uploadStatus = "no-video";
        }

        return finalSection;
      });

      setUploadProgress(50);

      // ✅ STEP 3: Create course on blockchain
      setProgressMessage("Creating course on blockchain...");

      const createCourseParams = {
        title: courseData.title.trim(),
        description: courseData.description.trim(),
        thumbnailCID: thumbnailResult.ipfsHash.replace("ipfs://", ""), // ✅ Extract CID only
        pricePerMonth: courseData.isPaid ? courseData.price.toString() : "0",
      };

      console.log("📝 Creating course with params:", createCourseParams);

      const createCourseResult = await smartContractService.createCourse(
        createCourseParams,
        {
          gasLimit: "300000",
          timeout: 60000,
        }
      );

      if (!createCourseResult.success) {
        throw new Error(createCourseResult.error || "Failed to create course");
      }

      console.log(
        "✅ Course created successfully:",
        createCourseResult.courseId
      );
      setUploadProgress(60);

      // ✅ STEP 4: Add sections ONE BY ONE dengan proper MetaMask handling
      const courseId = createCourseResult.courseId;
      setProgressMessage("Adding sections to course...");

      // ✅ PERBAIKAN UTAMA: Sequential section addition dengan user confirmation
      const sectionResults = [];
      let userWantsToSkip = false;

      for (let i = 0; i < uploadedSections.length; i++) {
        const section = uploadedSections[i];
        const sectionNumber = i + 1;
        const totalSections = uploadedSections.length;

        try {
          setProgressMessage(
            `Adding section ${sectionNumber}/${totalSections}: "${section.title}"`
          );

          // ✅ Show confirmation dialog for each section (except first)
          if (i > 0 && !userWantsToSkip) {
            const userChoice = await new Promise((resolve) => {
              Alert.alert(
                "Add Next Section",
                `Ready to add section ${sectionNumber}/${totalSections}:\n"${section.title}"\n\nThis will require MetaMask approval.`,
                [
                  {
                    text: "Skip Remaining",
                    style: "destructive",
                    onPress: () => resolve("skip"),
                  },
                  {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => resolve("cancel"),
                  },
                  {
                    text: "Continue",
                    onPress: () => resolve("continue"),
                  },
                ]
              );
            });

            if (userChoice === "cancel") {
              throw new Error("Section addition cancelled by user");
            } else if (userChoice === "skip") {
              userWantsToSkip = true;
              console.log("User chose to skip remaining sections");
              break;
            }
          }

          console.log(`📖 Adding section ${sectionNumber}: ${section.title}`);
          console.log(`Content CID: ${section.contentCID}`);

          // ✅ Add section dengan CID parameter yang benar
          const sectionResult = await smartContractService.addCourseSection(
            courseId,
            {
              title: section.title.trim(),
              contentCID: section.contentCID, // ✅ Use CID instead of URI
              duration: section.duration,
            },
            {
              gasLimit: "200000",
              timeout: 45000,
            }
          );

          if (sectionResult.success) {
            sectionResults.push({
              index: i,
              success: true,
              sectionId: sectionResult.sectionId,
              title: section.title,
              transactionHash: sectionResult.transactionHash,
            });
            console.log(`✅ Section ${sectionNumber} added successfully`);
          } else {
            console.error(
              `❌ Failed to add section ${sectionNumber}:`,
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
            `❌ Failed to add section ${sectionNumber}:`,
            sectionError
          );

          // ✅ Handle user rejection gracefully
          if (
            sectionError.message.includes("user rejected") ||
            sectionError.message.includes("User denied") ||
            sectionError.message.includes("cancelled")
          ) {
            sectionResults.push({
              index: i,
              success: false,
              error: "User cancelled transaction",
              title: section.title,
            });

            // Ask if user wants to continue with remaining sections
            const continueChoice = await new Promise((resolve) => {
              Alert.alert(
                "Transaction Rejected",
                `Section "${section.title}" was not added because the transaction was rejected.\n\nDo you want to continue adding the remaining sections?`,
                [
                  {
                    text: "Stop Adding",
                    style: "destructive",
                    onPress: () => resolve(false),
                  },
                  {
                    text: "Continue",
                    onPress: () => resolve(true),
                  },
                ]
              );
            });

            if (!continueChoice) {
              console.log("User chose to stop adding sections after rejection");
              break;
            }
          } else {
            // Other errors
            sectionResults.push({
              index: i,
              success: false,
              error: sectionError.message,
              title: section.title,
            });
          }
        }

        // Update progress
        const progressIncrement = 35 / uploadedSections.length;
        setUploadProgress(60 + (i + 1) * progressIncrement);
      }

      setUploadProgress(100);
      setProgressMessage("Course creation completed!");

      // ✅ PERBAIKAN: Generate success message dengan parameter yang benar
      const successfulSections = sectionResults.filter((r) => r.success).length;
      const failedSections = sectionResults.filter((r) => !r.success);
      const videosUploaded = sections.filter((s) => s.videoFile).length;
      const videosFailed = sections.filter(
        (s) => s.videoFile && videoResults.get(s.id)?.success !== true
      ).length;

      const successMessage = generateSuccessMessage({
        courseId,
        successfulSections: successfulSections, // ✅ Fixed: menggunakan successfulSections
        totalSections: uploadedSections.length,
        thumbnailHash: thumbnailResult.ipfsHash,
        price: courseData.isPaid ? `${courseData.price} ETH/month` : "Free",
        transactionHash: createCourseResult.transactionHash,
        videosUploaded,
        videosFailed,
        failedSections,
      });

      Alert.alert("Success! 🎉", successMessage);
      resetForm();
      navigation.navigate("MyCourses");
    } catch (error) {
      console.error("❌ Error creating course:", error);
      handleCreateCourseError(error);
    } finally {
      setIsCreatingCourse(false);
      setUploadProgress(0);
      setProgressMessage("");
    }
  };

  // Helper function to validate course data
  const validateCourseData = () => {
    // Title validation - sesuai smart contract (max 200 chars)
    if (!courseData.title.trim()) {
      Alert.alert("Error", "Please enter a course title");
      return false;
    }
    if (courseData.title.trim().length < 3) {
      Alert.alert("Error", "Course title must be at least 3 characters long");
      return false;
    }
    if (courseData.title.trim().length > 200) {
      // ✅ Fixed: sesuai smart contract limit
      Alert.alert("Error", "Course title cannot exceed 200 characters");
      return false;
    }

    // Description validation - sesuai smart contract (max 1000 chars)
    if (!courseData.description.trim()) {
      Alert.alert("Error", "Please enter a course description");
      return false;
    }
    if (courseData.description.trim().length < 10) {
      Alert.alert(
        "Error",
        "Course description must be at least 10 characters long"
      );
      return false;
    }
    if (courseData.description.trim().length > 1000) {
      // ✅ Already correct
      Alert.alert("Error", "Course description cannot exceed 1000 characters");
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
        Alert.alert("Error", "Please enter a valid price greater than 0");
        return false;
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
        return false;
      }
    }

    // Thumbnail validation
    if (!courseData.thumbnailFile) {
      Alert.alert("Error", "Please select a thumbnail image");
      return false;
    }

    // Sections validation
    if (sections.length === 0) {
      Alert.alert("Error", "Please add at least one course section");
      return false;
    }
    if (sections.length > 50) {
      Alert.alert("Error", "Maximum 50 sections allowed per course");
      return false;
    }

    // ✅ PERBAIKAN: Validate sections sesuai smart contract limits
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      // Section title validation - sesuai smart contract (max 200 chars)
      if (!section.title.trim()) {
        Alert.alert("Error", `Section ${i + 1} must have a title`);
        return false;
      }
      if (section.title.trim().length < 3) {
        Alert.alert(
          "Error",
          `Section ${i + 1} title must be at least 3 characters long`
        );
        return false;
      }
      if (section.title.trim().length > 200) {
        // ✅ Fixed: sesuai smart contract limit
        Alert.alert(
          "Error",
          `Section ${i + 1} title cannot exceed 200 characters`
        );
        return false;
      }

      // Duration validation - sesuai smart contract (max 86400 seconds = 24 hours)
      if (!section.duration || section.duration <= 0) {
        Alert.alert("Error", `Section ${i + 1} must have a valid duration`);
        return false;
      }
      if (section.duration > 86400) {
        // ✅ Fixed: sesuai smart contract limit (24 hours)
        Alert.alert(
          "Error",
          `Section ${i + 1} duration cannot exceed 24 hours (86400 seconds)`
        );
        return false;
      }
    }

    if (!isInitialized || !smartContractService) {
      Alert.alert(
        "Error",
        "Smart contract service not initialized. Please try again."
      );
      return false;
    }

    return true;
  };

  // Helper function to upload thumbnail using working pattern from IPFSTestScreen
  const uploadThumbnailToIPFS = async (thumbnailFile, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📸 Uploading thumbnail attempt ${attempt}/${retries}...`);

        if (!thumbnailFile || !thumbnailFile.uri) {
          throw new Error("Invalid thumbnail file");
        }

        if (thumbnailFile.size && thumbnailFile.size > 5 * 1024 * 1024) {
          throw new Error("Thumbnail file too large (max 5MB)");
        }

        // Use the working pattern from IPFSTestScreen
        const uploadResult = await pinataService.uploadFile(thumbnailFile, {
          name: thumbnailFile.name || `course_thumbnail_${Date.now()}.jpg`,
          network: "public", // Use public network for easy access
          keyvalues: {
            category: "thumbnail",
            courseTitle: courseData.title.trim() || "untitled",
            app: "eduverse",
            creator: address || "unknown",
            uploadedAt: new Date().toISOString(),
            network: "manta-pacific-testnet",
            version: "1.0",
            uploadSource: "CreateCourseScreen",
          },
        });

        if (uploadResult.success && uploadResult.ipfsHash) {
          console.log(
            `✅ Thumbnail uploaded successfully on attempt ${attempt}:`,
            uploadResult.ipfsHash
          );
          return {
            success: true,
            ipfsHash: uploadResult.ipfsHash,
            publicUrl: uploadResult.publicUrl, // Untuk preview
          };
        } else {
          throw new Error(
            uploadResult.error || "Upload failed without error info"
          );
        }
      } catch (error) {
        console.error(`❌ Thumbnail upload attempt ${attempt} failed:`, error);

        if (attempt === retries) {
          return {
            success: false,
            error: `Failed to upload thumbnail after ${retries} attempts: ${error.message}`,
          };
        }

        // Wait before retry
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying upload in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  };

  // Helper function to verify price limit
  const verifyPriceLimit = async (priceValue) => {
    try {
      const maxPriceInWei = await smartContractService.getMaxPriceInWei();
      const maxPriceInEth = parseFloat(ethers.formatEther(maxPriceInWei));

      if (priceValue > maxPriceInEth) {
        throw new Error(
          `Price ${priceValue} ETH exceeds current maximum allowed: ${maxPriceInEth.toFixed(
            6
          )} ETH (equivalent to $2 USD)`
        );
      }

      console.log(
        `✅ Price validation passed: ${priceValue} ETH <= ${maxPriceInEth.toFixed(
          6
        )} ETH`
      );
    } catch (priceCheckError) {
      console.error("❌ Error checking price limit:", priceCheckError);
      throw new Error("Failed to verify price limit. Please try again.");
    }
  };

  // Helper function to generate success message
  const generateSuccessMessage = ({
    courseId,
    successfulSections, // ✅ Fixed: changed from successfulSectionsCount
    totalSections,
    thumbnailHash,
    price,
    transactionHash,
    videosUploaded,
    videosFailed,
    failedSections,
  }) => {
    let message = `✅ Course created successfully!\n\n`;
    message += `📚 Course ID: ${courseId}\n`;
    message += `📖 Sections: ${successfulSections}/${totalSections} added\n`; // ✅ Fixed
    message += `🖼️ Thumbnail: ${thumbnailHash.substring(0, 12)}...\n`;
    message += `🎬 Videos: ${videosUploaded} uploaded`;
    if (videosFailed > 0) {
      message += `, ${videosFailed} failed`;
    }
    message += `\n💰 Price: ${price}\n`;
    message += `🔗 Transaction: ${transactionHash.substring(0, 12)}...`;

    if (failedSections.length > 0) {
      message += `\n\n⚠️ Warning: ${failedSections.length} sections failed to be added:\n`;
      failedSections.slice(0, 3).forEach((failed) => {
        message += `• ${failed.title}\n`;
      });
      if (failedSections.length > 3) {
        message += `• ... and ${failedSections.length - 3} more\n`;
      }
      message += `\nYou can add them later from the course management page.`;
    }

    return message;
  };

  // Helper function to handle create course errors
  const handleCreateCourseError = (error) => {
    let errorMessage = "Failed to create course.";
    let errorCategory = "unknown";

    if (
      error.message.includes("user rejected") ||
      error.message.includes("User denied")
    ) {
      errorMessage = "Transaction was rejected by user.";
      errorCategory = "user_rejection";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage = "Insufficient funds to pay for transaction fees.";
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
      errorMessage = `Failed to upload files: ${error.message}`;
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

    console.error("❌ Error category:", errorCategory);
    Alert.alert("Error", errorMessage);
  };

  // Helper function to reset form
  const resetForm = () => {
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
    setProgressMessage("");
  };

  // Section Item component with upload status indicator
  const SectionItem = React.memo(({ section, onRemove }) => (
    <View style={styles.sectionItem}>
      <View style={styles.sectionInfo}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.videoFile && (
            <View style={styles.videoStatusBadge}>
              <Ionicons
                name={
                  section.uploadStatus === "uploaded"
                    ? "checkmark-circle"
                    : "videocam"
                }
                size={16}
                color={
                  section.uploadStatus === "uploaded" ? "#4caf50" : "#9747FF"
                }
              />
              <Text style={styles.videoStatusText}>
                {section.uploadStatus === "uploaded" ? "Ready" : "Will Upload"}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.sectionDuration}>
          {Math.round(section.duration / 60)} minutes ({section.duration}{" "}
          seconds)
        </Text>
        {section.videoFile && (
          <Text style={styles.sectionVideoFile}>
            📹 Video: {section.videoFile.name}
          </Text>
        )}
        {section.contentURI &&
          section.contentURI !== "placeholder://video-content" && (
            <Text style={styles.sectionContent} numberOfLines={1}>
              🔗{" "}
              {section.contentURI.startsWith("ipfs://")
                ? "IPFS Content"
                : "Video Content"}
            </Text>
          )}
        {(!section.contentURI ||
          section.contentURI === "placeholder://video-content") &&
          !section.videoFile && (
            <Text style={styles.sectionContentPlaceholder}>
              📹 No video content
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

  // Effect untuk fetch maximum price dari smart contract
  useEffect(() => {
    const fetchMaxPrice = async () => {
      if (smartContractService && isInitialized) {
        try {
          const maxPriceInWei = await smartContractService.getMaxPriceInWei();
          if (maxPriceInWei) {
            const maxPriceInEth = parseFloat(ethers.formatEther(maxPriceInWei));
            setCurrentMaxPrice(maxPriceInEth);
            console.log("📊 Maximum price allowed:", maxPriceInEth, "ETH");
          }
        } catch (error) {
          console.error("❌ Error fetching max price:", error);
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

  // Calculate summary for create button
  const videosToUpload = sections.filter((s) => s.videoFile).length;
  const totalFiles = videosToUpload + (courseData.thumbnailFile ? 1 : 0);

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
                        Ready to Upload
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
                <View style={styles.sectionsSummary}>
                  <Text style={styles.sectionsCount}>
                    {sections.length} section{sections.length !== 1 ? "s" : ""}{" "}
                    added
                  </Text>
                  {videosToUpload > 0 && (
                    <Text style={styles.videosSummary}>
                      📹 {videosToUpload} video{videosToUpload !== 1 ? "s" : ""}{" "}
                      ready for upload
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
              <Text style={styles.uploadSummaryTitle}>📤 Upload Summary</Text>
              <Text style={styles.uploadSummaryText}>
                When you create the course, the following will be uploaded to
                IPFS:
              </Text>
              <View style={styles.uploadList}>
                {courseData.thumbnailFile && (
                  <Text style={styles.uploadItem}>
                    🖼️ Thumbnail image (
                    {(courseData.thumbnailFile.size / 1024).toFixed(1)} KB)
                  </Text>
                )}
                {sections
                  .filter((s) => s.videoFile)
                  .map((section, index) => (
                    <Text key={section.id} style={styles.uploadItem}>
                      🎬 Video: {section.videoFile.name} (
                      {videoService.formatFileSize(section.videoFile.size)})
                    </Text>
                  ))}
              </View>
              <Text style={styles.uploadSummaryNote}>
                💡 All files will be uploaded to IPFS with public access for
                easy sharing and playback.
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
                  Creating Course... {uploadProgress}%
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

          {/* Progress Bar */}
          {isCreatingCourse && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{progressMessage}</Text>
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
              Testnet. All files (thumbnails and videos) will be uploaded to
              IPFS when you click "Create Course". This ensures data integrity
              and decentralized storage.
            </Text>
          </View>

          {/* Requirements Card */}
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>📋 Upload Process</Text>
            <Text style={styles.requirementsText}>
              When you create the course:{"\n"}
              1. 🖼️ Thumbnail will be uploaded to IPFS{"\n"}
              2. 🎬 Section videos will be uploaded to IPFS{"\n"}
              3. 🔗 Course will be created on blockchain{"\n"}
              4. 📚 Sections will be added to the course{"\n\n"}
              All uploads happen automatically when you click "Create Course".
              No manual upload required!
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
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionInfo: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
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
    marginBottom: 2,
  },
  sectionVideoFile: {
    fontSize: 12,
    color: "#9747FF",
    marginBottom: 2,
  },
  sectionContent: {
    fontSize: 12,
    color: "#9747FF",
  },
  sectionContentPlaceholder: {
    fontSize: 12,
    color: "#9e9e9e",
    fontStyle: "italic",
  },
  removeButton: {
    padding: 8,
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
  uploadList: {
    marginBottom: 12,
  },
  uploadItem: {
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
  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 16,
  },
});
