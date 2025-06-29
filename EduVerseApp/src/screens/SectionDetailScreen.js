// src/screens/SectionDetailScreen.js - OPTIMIZED VERSION
import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useWeb3 } from "../contexts/Web3Context";
import { pinataService } from "../services/PinataService";

const { width: screenWidth } = Dimensions.get("window");

// Cache for video URLs to avoid regenerating
const videoUrlCache = new Map();

export default function SectionDetailScreen({ route, navigation }) {
  const { courseId, sectionId, sectionIndex, courseTitle, sectionData } =
    route.params;
  const { address } = useAccount();

  // ✅ Use Web3Context directly
  const web3Context = useWeb3();
  const { isInitialized } = web3Context;

  // ✅ OPTIMIZED STATE MANAGEMENT
  const [section, setSection] = useState(sectionData || null);
  const [loading, setLoading] = useState(!sectionData); // Don't load if we have data
  const [hasValidLicense, setHasValidLicense] = useState(false);
  const [progress, setProgress] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [videoStatus, setVideoStatus] = useState({});
  const [completingSection, setCompletingSection] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [licenseChecking, setLicenseChecking] = useState(false);

  const videoRef = useRef(null);
  const isMountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, []);

  // ✅ OPTIMIZED INITIALIZATION - Reduce redundant calls
  useEffect(() => {
    console.log("SectionDetailScreen initialized:", {
      courseId,
      sectionId,
      sectionIndex,
      address,
      isInitialized,
      hasSectionData: !!sectionData,
      initialLoadDone: initialLoadDone.current,
    });

    // Early return if already processed
    if (initialLoadDone.current) return;

    // If we have section data, use it immediately and generate video URL
    if (sectionData) {
      setSection(sectionData);
      if (
        sectionData.contentCID &&
        sectionData.contentCID !== "placeholder-video-content"
      ) {
        generateVideoUrl(sectionData.contentCID);
      } else {
        setFallbackVideoUrl();
      }
      setLoading(false);
    } else {
      // Only load section data if we don't have it
      loadSectionData();
    }

    // Check license and progress only once
    if (address && isInitialized && web3Context && !initialLoadDone.current) {
      checkLicenseAndProgress();
      initialLoadDone.current = true;
    }
  }, [courseId, sectionId, sectionIndex, address, isInitialized, web3Context]);

  // ✅ OPTIMIZED: Load section data only when necessary
  const loadSectionData = useCallback(async () => {
    if (!web3Context || !isInitialized) {
      setFallbackSectionData();
      return;
    }

    try {
      setLoading(true);
      console.log("Loading section data for:", { courseId, sectionIndex });

      const sections = await web3Context.getCourseSections(courseId);

      if (sections && sections[sectionIndex]) {
        const sectionData = sections[sectionIndex];
        console.log("✅ Section data loaded from CourseFactory:", sectionData);

        if (isMountedRef.current) {
          setSection(sectionData);

          if (
            sectionData.contentCID &&
            sectionData.contentCID !== "placeholder-video-content"
          ) {
            await generateVideoUrl(sectionData.contentCID);
          } else {
            setFallbackVideoUrl();
          }
        }
      } else {
        setFallbackSectionData();
      }
    } catch (error) {
      console.error("❌ Error loading section:", error);
      setFallbackSectionData();
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [courseId, sectionIndex, web3Context, isInitialized]);

  // ✅ OPTIMIZED: Single license and progress check
  const checkLicenseAndProgress = useCallback(async () => {
    if (!address || !web3Context) {
      console.log("Missing requirements for license check");
      return;
    }

    console.log(
      "Checking license and progress from smart contracts (OPTIMIZED):",
      {
        address,
        courseId,
      }
    );

    try {
      setLicenseChecking(true);

      // ✅ PARALLEL EXECUTION - Check both at the same time
      const [licenseValid, userProgress] = await Promise.all([
        web3Context.hasValidLicense(address, courseId),
        web3Context.getUserProgress(address, courseId),
      ]);

      console.log("✅ PARALLEL results:", { licenseValid, userProgress });

      if (isMountedRef.current) {
        setHasValidLicense(licenseValid);
        setProgress(userProgress);

        // Check if this specific section is completed
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
      }
    } catch (error) {
      console.error("❌ Error in checkLicenseAndProgress:", error);
      if (isMountedRef.current) {
        setHasValidLicense(false);
        setProgress({
          courseId: courseId.toString(),
          completedSections: 0,
          totalSections: 0,
          progressPercentage: 0,
          sectionsProgress: [],
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLicenseChecking(false);
      }
    }
  }, [address, courseId, sectionIndex, web3Context]);

  // ✅ OPTIMIZED VIDEO URL GENERATION
  const generateVideoUrl = useCallback(async (contentCID) => {
    try {
      setVideoLoading(true);
      setVideoError(null);

      // Check cache first
      if (videoUrlCache.has(contentCID)) {
        const cachedUrl = videoUrlCache.get(contentCID);
        console.log("✅ Using cached video URL");
        setVideoUrl(cachedUrl);
        setVideoLoading(false);
        return;
      }

      const cleanCID = contentCID.replace(/^ipfs:\/\//, "");

      if (!cleanCID || cleanCID === "placeholder-video-content") {
        setFallbackVideoUrl();
        return;
      }

      // Try PinataService first
      try {
        const optimizedUrl = await pinataService.getOptimizedFileUrl(cleanCID, {
          forcePublic: true,
          network: "public",
          fileType: "video",
          expires: 7200,
        });

        if (isMountedRef.current) {
          setVideoUrl(optimizedUrl);
          videoUrlCache.set(contentCID, optimizedUrl);
        }
      } catch (pinataError) {
        // Fallback to IPFS gateways
        const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${cleanCID}`;
        if (isMountedRef.current) {
          setVideoUrl(fallbackUrl);
          videoUrlCache.set(contentCID, fallbackUrl);
        }
      }
    } catch (error) {
      console.error("❌ Error generating video URL:", error);
      if (isMountedRef.current) {
        setVideoError("Failed to load video content");
        setFallbackVideoUrl();
      }
    } finally {
      if (isMountedRef.current) {
        setVideoLoading(false);
      }
    }
  }, []);

  const setFallbackSectionData = useCallback(() => {
    const fallbackSection = {
      id: sectionIndex.toString(),
      courseId: courseId.toString(),
      title: `Section ${sectionIndex + 1}`,
      contentCID: "sample-video",
      duration: 596,
      orderId: sectionIndex,
    };

    if (isMountedRef.current) {
      setSection(fallbackSection);
      setFallbackVideoUrl();
    }
  }, [courseId, sectionIndex]);

  const setFallbackVideoUrl = useCallback(() => {
    const fallbackUrl =
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    if (isMountedRef.current) {
      setVideoUrl(fallbackUrl);
    }
  }, []);

  // ✅ COMPLETE SECTION - Optimized with error handling
  const handleCompleteSection = useCallback(async () => {
    if (!hasValidLicense) {
      Alert.alert(
        "Access Denied",
        "You need a valid license to complete sections"
      );
      return;
    }

    if (!web3Context) {
      Alert.alert("Error", "Smart contract service not available");
      return;
    }

    if (isCompleted) {
      Alert.alert("Info", "Section already completed!");
      return;
    }

    try {
      setCompletingSection(true);
      console.log("🎯 Completing section:", { courseId, sectionIndex });

      const result = await web3Context.completeSection(courseId, sectionIndex);

      if (result.success) {
        if (isMountedRef.current) {
          setIsCompleted(true);
        }

        Alert.alert("Success! 🎉", "Section completed successfully!", [
          {
            text: "Continue",
            onPress: async () => {
              // Refresh progress
              await checkLicenseAndProgress();

              // Navigate to next section or show completion
              if (progress && sectionIndex < progress.totalSections - 1) {
                Alert.alert("Next Section", "Continue to next section?", [
                  { text: "Stay Here", style: "cancel" },
                  {
                    text: "Next Section",
                    onPress: () => {
                      navigation.replace("SectionDetail", {
                        courseId,
                        sectionId: sectionIndex + 1,
                        sectionIndex: sectionIndex + 1,
                        courseTitle,
                      });
                    },
                  },
                ]);
              }
            },
          },
        ]);
      }
    } catch (error) {
      console.error("❌ Error completing section:", error);
      Alert.alert("Error", "Failed to complete section. Please try again.");
    } finally {
      if (isMountedRef.current) {
        setCompletingSection(false);
      }
    }
  }, [
    hasValidLicense,
    web3Context,
    isCompleted,
    courseId,
    sectionIndex,
    progress,
    navigation,
    courseTitle,
    checkLicenseAndProgress,
  ]);

  // ✅ UTILITY FUNCTIONS
  const formatDuration = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }, []);

  const handleVideoStatusUpdate = useCallback(
    (status) => {
      setVideoStatus(status);

      if (status.didJustFinish && !isCompleted && hasValidLicense) {
        Alert.alert("Video Completed", "Mark this section as complete?", [
          { text: "Not Yet", style: "cancel" },
          { text: "Complete Section", onPress: handleCompleteSection },
        ]);
      }
    },
    [isCompleted, hasValidLicense, handleCompleteSection]
  );

  // ✅ OPTIMIZED MEDIA PLAYER
  const renderMediaPlayer = useCallback(() => {
    if (videoLoading) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoLoadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.videoLoadingText}>Loading video...</Text>
          </View>
        </View>
      );
    }

    if (videoError) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoErrorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
            <Text style={styles.videoErrorTitle}>Video Loading Error</Text>
            <Text style={styles.videoErrorText}>{videoError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                if (section?.contentCID) {
                  setVideoError(null);
                  generateVideoUrl(section.contentCID);
                }
              }}
            >
              <Ionicons name="refresh-outline" size={20} color="#fff" />
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

    return (
      <View style={styles.mediaContainer}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: videoUrl }}
          useNativeControls
          resizeMode="contain"
          shouldPlay={true}
          onPlaybackStatusUpdate={handleVideoStatusUpdate}
          onError={(error) => {
            console.error("❌ Video playback error:", error);
            Alert.alert(
              "Video Error",
              "Video tidak bisa diputar. Pastikan format MP4 (H.264/AAC) dan file dapat diakses publik."
            );
            setVideoError("Unable to play this video");
          }}
        />

        {/* IPFS indicator */}
        {section?.contentCID &&
          section.contentCID !== "sample-video" &&
          section.contentCID !== "placeholder-video-content" && (
            <View style={styles.ipfsIndicator}>
              <Ionicons name="cloud-done-outline" size={12} color="#fff" />
              <Text style={styles.ipfsText}>IPFS Content</Text>
            </View>
          )}
      </View>
    );
  }, [
    videoLoading,
    videoError,
    videoUrl,
    section,
    handleVideoStatusUpdate,
    generateVideoUrl,
  ]);

  // ✅ NAVIGATION HANDLERS
  const navigateToSection = useCallback(
    (newSectionIndex) => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }

      navigation.replace("SectionDetail", {
        courseId,
        sectionId: newSectionIndex,
        sectionIndex: newSectionIndex,
        courseTitle,
      });
    },
    [courseId, courseTitle, navigation]
  );

  // ✅ OPTIMIZED LOADING STATE
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading section...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ ACCESS DENIED STATE
  if (!hasValidLicense && !licenseChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Ionicons name="lock-closed" size={64} color="#ff6b6b" />
          <Text style={styles.accessDeniedTitle}>License Required</Text>
          <Text style={styles.accessDeniedText}>
            You need a valid course license to access this section.
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.getLicenseButton}
            onPress={() => navigation.getParent()?.navigate("Dashboard")}
          >
            <Ionicons name="card-outline" size={20} color="#fff" />
            <Text style={styles.getLicenseButtonText}>Get License</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ✅ REMOVED DOUBLE HEADER - Using only React Navigation header */}

        {/* Media Player */}
        {renderMediaPlayer()}

        {/* Section Info */}
        <View style={styles.sectionInfo}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section?.title}</Text>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.completedBadgeText}>Completed</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionDuration}>
            Duration: {formatDuration(section?.duration || 0)}
          </Text>

          {/* Section details */}
          <View style={styles.sectionDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="layers-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Section {sectionIndex + 1} of {progress?.totalSections || "?"}
              </Text>
            </View>
            {section?.contentCID &&
              section.contentCID !== "sample-video" &&
              section.contentCID !== "placeholder-video-content" && (
                <View style={styles.detailItem}>
                  <Ionicons name="cloud-done-outline" size={16} color="#666" />
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

          {/* Progress info */}
          {progress && (
            <View style={styles.progressInfo}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Course Progress</Text>
                <Text style={styles.progressPercentage}>
                  {progress.progressPercentage}%
                </Text>
              </View>
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
                sections completed
              </Text>
            </View>
          )}
        </View>

        {/* Action Container */}
        {hasValidLicense && (
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
                {completingSection
                  ? "Updating Progress..."
                  : isCompleted
                  ? "Completed ✓"
                  : "Mark as Complete"}
              </Text>
            </TouchableOpacity>

            {/* Navigation buttons */}
            <View style={styles.navigationButtons}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  sectionIndex === 0 && styles.navButtonDisabled,
                ]}
                disabled={sectionIndex === 0}
                onPress={() => navigateToSection(sectionIndex - 1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={sectionIndex === 0 ? "#ccc" : "#8b5cf6"}
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
                style={[
                  styles.navButton,
                  progress &&
                    sectionIndex >= progress.totalSections - 1 &&
                    styles.navButtonDisabled,
                ]}
                disabled={
                  progress && sectionIndex >= progress.totalSections - 1
                }
                onPress={() => navigateToSection(sectionIndex + 1)}
              >
                <Text
                  style={[
                    styles.navButtonText,
                    progress &&
                      sectionIndex >= progress.totalSections - 1 &&
                      styles.navButtonTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    progress && sectionIndex >= progress.totalSections - 1
                      ? "#ccc"
                      : "#8b5cf6"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    fontWeight: "500",
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
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#8b5cf6",
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
    fontWeight: "500",
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
    gap: 4,
  },
  ipfsText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500",
  },
  sectionInfo: {
    padding: 20,
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
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
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
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
    backgroundColor: "#8b5cf6",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  completeButtonDisabled: {
    backgroundColor: "#ccc",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
    borderColor: "#8b5cf6",
    backgroundColor: "#fff",
    gap: 4,
  },
  navButtonDisabled: {
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  navButtonText: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "500",
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
    backgroundColor: "#94a3b8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  goBackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  getLicenseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  getLicenseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
