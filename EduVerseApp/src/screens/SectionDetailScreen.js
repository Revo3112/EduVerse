// src/screens/SectionDetailScreen.js - Enhanced with Pinata IPFS video support and aligned with SmartContract
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useAccount } from "wagmi";
import { useSmartContract } from "../hooks/useBlockchain";
import { pinataService } from "../services/PinataService";

const { width: screenWidth } = Dimensions.get("window");

export default function SectionDetailScreen({ route, navigation }) {
  const { courseId, sectionId, sectionIndex, courseTitle } = route.params;
  const { address } = useAccount();
  const { smartContractService, isInitialized } = useSmartContract();

  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasValidLicense, setHasValidLicense] = useState(false);
  const [progress, setProgress] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [videoStatus, setVideoStatus] = useState({});
  const [completingSection, setCompletingSection] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);

  const videoRef = useRef(null);

  // ✅ ENHANCED: useEffect dengan initialization pattern terbaru
  useEffect(() => {
    console.log("SectionDetailScreen useEffect triggered:", {
      courseId,
      sectionId,
      sectionIndex,
      address,
      isInitialized,
      smartContractServiceAvailable: !!smartContractService,
    });

    // Load section data terlebih dahulu
    loadSectionData();

    // Check license hanya jika requirement terpenuhi
    if (address && isInitialized && smartContractService) {
      checkLicenseAndProgress();
    } else {
      console.log("Skipping license check - requirements not met");
    }
  }, [
    courseId,
    sectionId,
    sectionIndex,
    address,
    isInitialized,
    smartContractService,
  ]);

  // ✅ ENHANCED: Load section data menggunakan SmartContractService terbaru
  const loadSectionData = async () => {
    try {
      setLoading(true);
      console.log("Loading section data for:", { courseId, sectionIndex });

      if (!smartContractService || !isInitialized) {
        // Fallback ke sample content
        setFallbackSectionData();
        return;
      }

      // ✅ FIXED: Get section data menggunakan method getCourseSection dengan orderIndex
      try {
        const sectionData = await smartContractService.getCourseSection(
          courseId,
          sectionIndex
        );

        if (sectionData) {
          console.log("✅ Section data loaded:", sectionData);
          setSection(sectionData);

          // ✅ Generate video URL dari contentCID menggunakan PinataService
          if (
            sectionData.contentCID &&
            sectionData.contentCID !== "placeholder-video-content"
          ) {
            await generateVideoUrl(sectionData.contentCID);
          } else {
            console.log("⚠️ No valid contentCID found, using fallback video");
            setFallbackVideoUrl();
          }
        } else {
          console.log("⚠️ Section not found, using fallback");
          setFallbackSectionData();
        }
      } catch (sectionError) {
        console.error("❌ Error fetching section from contract:", sectionError);
        setFallbackSectionData();
      }
    } catch (error) {
      console.error("❌ Error loading section:", error);
      setFallbackSectionData();
    } finally {
      setLoading(false);
    }
  };

  // ✅ ENHANCED: Generate video URL dari IPFS CID menggunakan PinataService
  const generateVideoUrl = async (contentCID) => {
    try {
      setVideoLoading(true);
      setVideoError(null);
      console.log("🎥 Generating video URL for CID:", contentCID);

      // ✅ Clean CID (remove ipfs:// prefix if present)
      const cleanCID = contentCID.replace(/^ipfs:\/\//, "");

      if (!cleanCID || cleanCID === "placeholder-video-content") {
        console.log("⚠️ Invalid CID, using fallback video");
        setFallbackVideoUrl();
        return;
      }

      // ✅ Try to get optimized URL dari PinataService untuk video streaming
      try {
        const optimizedUrl = await pinataService.getOptimizedFileUrl(cleanCID, {
          forcePublic: true,
          network: "public",
          fileType: "video", // ✅ Specify that this is a video file
        });

        console.log("✅ Optimized video URL generated:", optimizedUrl);
        setVideoUrl(optimizedUrl);
      } catch (pinataError) {
        console.warn(
          "⚠️ PinataService failed, trying fallback gateways:",
          pinataError.message
        );

        // ✅ Try multiple IPFS gateways for better reliability
        const fallbackGateways = [
          `https://gateway.pinata.cloud/ipfs/${cleanCID}`,
          `https://ipfs.io/ipfs/${cleanCID}`,
          `https://cloudflare-ipfs.com/ipfs/${cleanCID}`,
          `https://dweb.link/ipfs/${cleanCID}`,
        ];

        // ✅ Test first gateway
        const fallbackUrl = fallbackGateways[0];
        console.log("🆘 Using fallback gateway:", fallbackUrl);
        setVideoUrl(fallbackUrl);
      }
    } catch (error) {
      console.error("❌ Error generating video URL:", error);
      setVideoError("Failed to load video content from IPFS");
      setFallbackVideoUrl();
    } finally {
      setVideoLoading(false);
    }
  };

  // ✅ Fallback section data
  const setFallbackSectionData = () => {
    const fallbackSection = {
      id: sectionIndex.toString(),
      courseId: courseId.toString(),
      title: `Sample Section ${sectionIndex + 1}`,
      contentCID: "sample-video",
      duration: 596, // ~10 minutes
    };

    setSection(fallbackSection);
    setFallbackVideoUrl();
  };

  // ✅ Set fallback video URL
  const setFallbackVideoUrl = () => {
    // Use sample video for demonstration
    setVideoUrl(
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    );
  };

  // ✅ ENHANCED: Check license and progress dengan retry mechanism
  const checkLicenseAndProgress = async () => {
    try {
      console.log("SectionDetailScreen - Checking license and progress:", {
        address,
        courseId,
        smartContractServiceAvailable: !!smartContractService,
      });

      if (!address || !smartContractService) {
        console.log("Missing address or smart contract service");
        return;
      }

      // ✅ Check license dengan caching dan retry mechanism
      try {
        const licenseValid = await smartContractService.hasValidLicense(
          address,
          courseId
        );
        console.log("✅ Section screen license check result:", licenseValid);
        setHasValidLicense(licenseValid);

        // ✅ Retry mechanism untuk license check jika gagal pertama kali
        if (!licenseValid) {
          console.log("⚠️ License not valid, retrying...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const retryResult = await smartContractService.hasValidLicense(
            address,
            courseId
          );
          console.log("🔄 Section screen license retry result:", retryResult);
          setHasValidLicense(retryResult);
        }
      } catch (licenseError) {
        console.error("❌ Error checking license:", licenseError);
        setHasValidLicense(false);
      }

      // ✅ Get user progress dengan enhanced error handling
      try {
        const userProgress = await smartContractService.getUserProgress(
          address,
          courseId
        );
        console.log("✅ Section screen user progress:", userProgress);
        setProgress(userProgress);

        // ✅ Check if this specific section is completed using sectionIndex
        if (
          userProgress.sectionsProgress &&
          sectionIndex < userProgress.sectionsProgress.length
        ) {
          const sectionCompleted = userProgress.sectionsProgress[sectionIndex];
          setIsCompleted(sectionCompleted);
          console.log(
            `📊 Section ${sectionIndex} completion status:`,
            sectionCompleted
          );
        }
      } catch (progressError) {
        console.error("❌ Error getting user progress:", progressError);
        setProgress({
          courseId: courseId.toString(),
          completedSections: 0,
          totalSections: 0,
          progressPercentage: 0,
          sectionsProgress: [],
        });
      }
    } catch (error) {
      console.error("❌ Error checking license and progress:", error);
    }
  };

  // ✅ ENHANCED: Complete section menggunakan SmartContractService dengan sectionIndex
  const handleCompleteSection = async () => {
    try {
      if (!hasValidLicense) {
        Alert.alert(
          "Access Denied",
          "You need a valid license to complete sections"
        );
        return;
      }

      if (!smartContractService) {
        Alert.alert("Error", "Smart contract service not available");
        return;
      }

      setCompletingSection(true);
      console.log("🎯 Completing section:", { courseId, sectionIndex });

      // ✅ FIXED: Use sectionIndex instead of sectionId for smart contract
      // According to ProgressTracker.sol, completeSection expects (courseId, sectionId)
      // where sectionId is actually the section index (0-based)
      const result = await smartContractService.completeSection(
        courseId,
        sectionIndex
      );

      if (result.success) {
        setIsCompleted(true);
        console.log("✅ Section completed successfully!");

        Alert.alert("Success! 🎉", "Section completed successfully!", [
          {
            text: "Continue",
            onPress: () => {
              // ✅ Refresh progress after completion
              checkLicenseAndProgress();
            },
          },
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to complete section");
      }
    } catch (error) {
      console.error("❌ Error completing section:", error);
      Alert.alert("Error", "Failed to complete section. Please try again.");
    } finally {
      setCompletingSection(false);
    }
  };

  // ✅ Utility functions
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const isVideoContent = (url) => {
    if (!url) return false;
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];
    return (
      videoExtensions.some((ext) => url.toLowerCase().includes(ext)) ||
      url.includes("video") ||
      url.includes("gtv-videos-bucket") || // For sample video
      url.includes("ipfs")
    ); // IPFS URLs are likely video
  };

  const isAudioContent = (url) => {
    if (!url) return false;
    const audioExtensions = [".mp3", ".wav", ".aac", ".m4a", ".ogg"];
    return audioExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  // ✅ ENHANCED: Media player component dengan better error handling
  const renderMediaPlayer = () => {
    if (videoLoading) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoLoadingContainer}>
            <ActivityIndicator size="large" color="#9747FF" />
            <Text style={styles.videoLoadingText}>Loading video...</Text>
            <Text style={styles.videoLoadingSubtext}>
              Fetching from IPFS...
            </Text>
          </View>
        </View>
      );
    }

    if (videoError) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoErrorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
            <Text style={styles.videoErrorTitle}>Video Error</Text>
            <Text style={styles.videoErrorText}>{videoError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                if (section?.contentCID) {
                  generateVideoUrl(section.contentCID);
                }
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!videoUrl) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.noVideoContainer}>
            <Ionicons name="videocam-off-outline" size={64} color="#666" />
            <Text style={styles.noVideoText}>No video content available</Text>
          </View>
        </View>
      );
    }

    if (isVideoContent(videoUrl)) {
      return (
        <View style={styles.mediaContainer}>
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: videoUrl }}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
            onPlaybackStatusUpdate={setVideoStatus}
            onError={(error) => {
              console.error("❌ Video playback error:", error);
              setVideoError(
                "Unable to play this video. Please check your connection."
              );
            }}
            onLoad={(status) => {
              console.log("✅ Video loaded successfully:", status);
            }}
            onLoadStart={() => {
              console.log("🎬 Video loading started...");
            }}
          />

          {/* ✅ IPFS indicator untuk video dari IPFS */}
          {section?.contentCID && section.contentCID !== "sample-video" && (
            <View style={styles.ipfsIndicator}>
              <Ionicons name="globe-outline" size={12} color="#fff" />
              <Text style={styles.ipfsText}>Playing from IPFS</Text>
            </View>
          )}

          {/* ✅ Video controls overlay jika diperlukan */}
          {videoStatus.isLoaded && (
            <View style={styles.videoOverlay}>
              <View style={styles.videoInfo}>
                <Text style={styles.videoInfoText}>
                  {Math.floor((videoStatus.positionMillis || 0) / 1000)}s /{" "}
                  {Math.floor((videoStatus.durationMillis || 0) / 1000)}s
                </Text>
              </View>
            </View>
          )}
        </View>
      );
    } else if (isAudioContent(videoUrl)) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.audioPlayer}>
            <Ionicons name="musical-notes" size={64} color="#9747FF" />
            <Text style={styles.audioTitle}>{section?.title}</Text>
            <Text style={styles.audioDuration}>
              Duration: {formatDuration(section?.duration || 0)}
            </Text>
            {/* ✅ Audio dari IPFS indicator */}
            {section?.contentCID && section.contentCID !== "sample-video" && (
              <View style={styles.audioIPFSIndicator}>
                <Ionicons name="globe-outline" size={16} color="#9747FF" />
                <Text style={styles.audioIPFSText}>Audio from IPFS</Text>
              </View>
            )}
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.unsupportedMedia}>
            <Ionicons name="document-outline" size={64} color="#666" />
            <Text style={styles.unsupportedText}>Unsupported media format</Text>
            <Text style={styles.unsupportedSubtext}>
              This content type is not supported for playback
            </Text>
          </View>
        </View>
      );
    }
  };

  // ✅ Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9747FF" />
          <Text style={styles.loadingText}>Loading section...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Access denied state
  if (!hasValidLicense) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
        </View>

        <View style={styles.accessDeniedContainer}>
          <Ionicons name="lock-closed" size={64} color="#ff6b6b" />
          <Text style={styles.accessDeniedTitle}>License Required</Text>
          <Text style={styles.accessDeniedText}>
            You need a valid license for this course to access this section.
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {section?.title || "Loading..."}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {courseTitle}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Media Player */}
        {renderMediaPlayer()}

        {/* Section Info */}
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionTitle}>{section?.title}</Text>
          <Text style={styles.sectionDuration}>
            Duration: {formatDuration(section?.duration || 0)}
          </Text>

          {/* ✅ ENHANCED: Show section details */}
          <View style={styles.sectionDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="layers-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Section {sectionIndex + 1}</Text>
            </View>
            {section?.contentCID && section.contentCID !== "sample-video" && (
              <View style={styles.detailItem}>
                <Ionicons name="globe-outline" size={16} color="#666" />
                <Text style={styles.detailText}>Stored on IPFS</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Ionicons
                name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={isCompleted ? "#4CAF50" : "#666"}
              />
              <Text
                style={[styles.detailText, isCompleted && styles.completedText]}
              >
                {isCompleted ? "Completed" : "Not completed"}
              </Text>
            </View>
          </View>

          {/* ✅ Enhanced progress info */}
          {progress && (
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Course Progress</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress.progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progress.completedSections} of {progress.totalSections}{" "}
                sections completed ({progress.progressPercentage}%)
              </Text>
            </View>
          )}
        </View>

        {/* Completion Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              (isCompleted || completingSection) &&
                styles.completeButtonDisabled,
            ]}
            onPress={handleCompleteSection}
            disabled={isCompleted || completingSection}
          >
            {completingSection ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={isCompleted ? "checkmark-circle" : "checkmark"}
                size={20}
                color="#fff"
              />
            )}
            <Text style={styles.completeButtonText}>
              {isCompleted ? "Completed ✓" : "Mark as Complete"}
            </Text>
          </TouchableOpacity>

          {/* ✅ ENHANCED: Additional section navigation */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[
                styles.navButton,
                sectionIndex === 0 && styles.navButtonDisabled,
              ]}
              disabled={sectionIndex === 0}
              onPress={() => {
                navigation.replace("SectionDetail", {
                  courseId,
                  sectionId: sectionIndex - 1,
                  sectionIndex: sectionIndex - 1,
                  courseTitle,
                });
              }}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={sectionIndex === 0 ? "#ccc" : "#9747FF"}
              />
              <Text
                style={[
                  styles.navButtonText,
                  sectionIndex === 0 && styles.navButtonTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                navigation.replace("SectionDetail", {
                  courseId,
                  sectionId: sectionIndex + 1,
                  sectionIndex: sectionIndex + 1,
                  courseTitle,
                });
              }}
            >
              <Text style={styles.navButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color="#9747FF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  mediaContainer: {
    backgroundColor: "#000",
    aspectRatio: 16 / 9,
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  videoLoadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  videoLoadingSubtext: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 4,
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  videoErrorTitle: {
    color: "#ff6b6b",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  videoErrorText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  noVideoText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  audioPlayer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 20,
  },
  audioTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  audioDuration: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 8,
  },
  audioIPFSIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(151, 71, 255, 0.2)",
    borderRadius: 12,
  },
  audioIPFSText: {
    color: "#9747FF",
    fontSize: 12,
    marginLeft: 6,
  },
  unsupportedMedia: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  unsupportedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  unsupportedSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  ipfsIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ipfsText: {
    color: "#fff",
    fontSize: 10,
    marginLeft: 4,
  },
  videoOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
  },
  videoInfo: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  videoInfoText: {
    color: "#fff",
    fontSize: 12,
  },
  sectionInfo: {
    padding: 20,
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  sectionDuration: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  sectionDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
  },
  completedText: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  progressInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
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
  },
  actionContainer: {
    padding: 20,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9747FF",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  completeButtonDisabled: {
    backgroundColor: "#ccc",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9747FF",
    backgroundColor: "#fff",
  },
  navButtonDisabled: {
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  navButtonText: {
    color: "#9747FF",
    fontSize: 14,
    fontWeight: "500",
    marginHorizontal: 4,
  },
  navButtonTextDisabled: {
    color: "#ccc",
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#ff6b6b",
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  goBackButton: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
