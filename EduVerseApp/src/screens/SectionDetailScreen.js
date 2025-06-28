// src/screens/SectionDetailScreen.js - Enhanced with Pinata IPFS video support and aligned with SmartContract
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
import { useSmartContract } from "../hooks/useBlockchain";
import { pinataService } from "../services/PinataService";

const { width: screenWidth } = Dimensions.get("window");

// Cache for video URLs to avoid regenerating
const videoUrlCache = new Map();

export default function SectionDetailScreen({ route, navigation }) {
  const { courseId, sectionId, sectionIndex, courseTitle, sectionData } =
    route.params;
  const { address } = useAccount();
  const { smartContractService, isInitialized } = useSmartContract();

  const [section, setSection] = useState(sectionData || null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up video when unmounting
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, []);

  // ✅ ENHANCED: Main initialization effect
  useEffect(() => {
    console.log("SectionDetailScreen initialized:", {
      courseId,
      sectionId,
      sectionIndex,
      address,
      isInitialized,
      hasSectionData: !!sectionData,
    });

    // If we have section data from navigation, use it immediately
    if (sectionData && !section) {
      setSection(sectionData);
      if (
        sectionData.contentCID &&
        sectionData.contentCID !== "placeholder-video-content"
      ) {
        generateVideoUrl(sectionData.contentCID);
      }
      setLoading(false);
    } else if (!section) {
      // Load section data if not provided
      loadSectionData();
    }

    // Check license and progress
    if (address && isInitialized && smartContractService) {
      checkLicenseAndProgress();
    }
  }, [
    courseId,
    sectionId,
    sectionIndex,
    address,
    isInitialized,
    smartContractService,
  ]);

  // ✅ FIXED: Load section data using sections array
  const loadSectionData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Loading section data for:", { courseId, sectionIndex });

      if (!smartContractService || !isInitialized) {
        setFallbackSectionData();
        return;
      }

      // ✅ FIXED: Get all sections and pick by index
      try {
        const sections = await smartContractService.getCourseSections(courseId);
        console.log(
          `Found ${sections?.length || 0} sections for course ${courseId}`
        );

        if (sections && sections[sectionIndex]) {
          const sectionData = sections[sectionIndex];
          console.log("✅ Section data loaded:", sectionData);

          if (isMountedRef.current) {
            setSection(sectionData);

            // Generate video URL from contentCID
            if (
              sectionData.contentCID &&
              sectionData.contentCID !== "placeholder-video-content"
            ) {
              await generateVideoUrl(sectionData.contentCID);
            } else {
              console.log("⚠️ No valid contentCID found, using fallback video");
              setFallbackVideoUrl();
            }
          }
        } else {
          console.log("⚠️ Section not found at index:", sectionIndex);
          setFallbackSectionData();
        }
      } catch (sectionError) {
        console.error(
          "❌ Error fetching sections from contract:",
          sectionError
        );
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
  }, [courseId, sectionIndex, smartContractService, isInitialized]);

  // ✅ ENHANCED: Generate video URL with caching
  const generateVideoUrl = useCallback(async (contentCID) => {
    try {
      setVideoLoading(true);
      setVideoError(null);
      console.log("🎥 Generating video URL for CID:", contentCID);

      // Check cache first
      if (videoUrlCache.has(contentCID)) {
        const cachedUrl = videoUrlCache.get(contentCID);
        console.log("✅ Using cached video URL");
        setVideoUrl(cachedUrl);
        setVideoLoading(false);
        return;
      }

      // Clean CID (remove ipfs:// prefix if present)
      const cleanCID = contentCID.replace(/^ipfs:\/\//, "");

      if (!cleanCID || cleanCID === "placeholder-video-content") {
        console.log("⚠️ Invalid CID, using fallback video");
        setFallbackVideoUrl();
        return;
      }

      // Try to get optimized URL from PinataService for video streaming
      try {
        const optimizedUrl = await pinataService.getOptimizedFileUrl(cleanCID, {
          forcePublic: true,
          network: "public",
          fileType: "video",
          expires: 7200, // 2 hours for video streaming
        });

        console.log("✅ Optimized video URL generated:", optimizedUrl);

        if (isMountedRef.current) {
          setVideoUrl(optimizedUrl);
          // Cache the URL
          videoUrlCache.set(contentCID, optimizedUrl);
        }
      } catch (pinataError) {
        console.warn(
          "⚠️ PinataService failed, trying fallback gateways:",
          pinataError.message
        );

        // Try multiple IPFS gateways for better reliability
        const fallbackGateways = [
          `https://gateway.pinata.cloud/ipfs/${cleanCID}`,
          `https://ipfs.io/ipfs/${cleanCID}`,
          `https://cloudflare-ipfs.com/ipfs/${cleanCID}`,
          `https://dweb.link/ipfs/${cleanCID}`,
        ];

        // Test gateways sequentially
        let workingUrl = null;
        for (const gateway of fallbackGateways) {
          try {
            console.log(`Testing gateway: ${gateway}`);
            const response = await fetch(gateway, {
              method: "HEAD",
              signal: AbortSignal.timeout(5000), // 5 second timeout
            });

            if (response.ok) {
              workingUrl = gateway;
              break;
            }
          } catch (error) {
            console.log(`Gateway failed: ${gateway}`);
          }
        }

        if (workingUrl && isMountedRef.current) {
          console.log("✅ Using fallback gateway:", workingUrl);
          setVideoUrl(workingUrl);
          videoUrlCache.set(contentCID, workingUrl);
        } else {
          throw new Error("All gateways failed");
        }
      }
    } catch (error) {
      console.error("❌ Error generating video URL:", error);
      if (isMountedRef.current) {
        setVideoError("Failed to load video content from IPFS");
        setFallbackVideoUrl();
      }
    } finally {
      if (isMountedRef.current) {
        setVideoLoading(false);
      }
    }
  }, []);

  // ✅ Fallback section data
  const setFallbackSectionData = useCallback(() => {
    const fallbackSection = {
      id: sectionIndex.toString(),
      courseId: courseId.toString(),
      title: `Section ${sectionIndex + 1}`,
      contentCID: "sample-video",
      duration: 596, // ~10 minutes
    };

    if (isMountedRef.current) {
      setSection(fallbackSection);
      setFallbackVideoUrl();
    }
  }, [courseId, sectionIndex]);

  // ✅ Set fallback video URL
  const setFallbackVideoUrl = useCallback(() => {
    const fallbackUrl =
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    if (isMountedRef.current) {
      setVideoUrl(fallbackUrl);
    }
  }, []);

  // ✅ ENHANCED: Check license and progress with better error handling
  const checkLicenseAndProgress = useCallback(async () => {
    try {
      console.log("Checking license and progress:", {
        address,
        courseId,
        smartContractServiceAvailable: !!smartContractService,
      });

      if (!address || !smartContractService) {
        console.log("Missing requirements for license check");
        return;
      }

      // Check license with retry
      setLicenseChecking(true);
      try {
        const licenseValid = await smartContractService.hasValidLicense(
          address,
          courseId
        );
        console.log("✅ License check result:", licenseValid);

        if (isMountedRef.current) {
          setHasValidLicense(licenseValid);
        }

        // Retry once if not valid (cache might be stale)
        if (!licenseValid) {
          console.log("⚠️ License not valid, retrying after delay...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const retryResult = await smartContractService.hasValidLicense(
            address,
            courseId
          );
          console.log("🔄 License retry result:", retryResult);

          if (isMountedRef.current) {
            setHasValidLicense(retryResult);
          }
        }
      } catch (licenseError) {
        console.error("❌ Error checking license:", licenseError);
        if (isMountedRef.current) {
          setHasValidLicense(false);
        }
      } finally {
        if (isMountedRef.current) {
          setLicenseChecking(false);
        }
      }

      // Get user progress
      try {
        const userProgress = await smartContractService.getUserProgress(
          address,
          courseId
        );
        console.log("✅ User progress:", userProgress);

        if (isMountedRef.current) {
          setProgress(userProgress);

          // Check if this specific section is completed
          if (
            userProgress.sectionsProgress &&
            sectionIndex < userProgress.sectionsProgress.length
          ) {
            const sectionCompleted =
              userProgress.sectionsProgress[sectionIndex];
            setIsCompleted(sectionCompleted);
            console.log(
              `📊 Section ${sectionIndex} completion status:`,
              sectionCompleted
            );
          }
        }
      } catch (progressError) {
        console.error("❌ Error getting user progress:", progressError);
        if (isMountedRef.current) {
          setProgress({
            courseId: courseId.toString(),
            completedSections: 0,
            totalSections: 0,
            progressPercentage: 0,
            sectionsProgress: [],
          });
        }
      }
    } catch (error) {
      console.error("❌ Error in checkLicenseAndProgress:", error);
    }
  }, [address, courseId, sectionIndex, smartContractService]);

  // ✅ ENHANCED: Complete section with better error handling
  const handleCompleteSection = useCallback(async () => {
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

      if (isCompleted) {
        Alert.alert("Info", "Section already completed!");
        return;
      }

      setCompletingSection(true);
      console.log("🎯 Completing section:", { courseId, sectionIndex });

      // Call smart contract to complete section
      const result = await smartContractService.completeSection(
        courseId,
        sectionIndex // Using sectionIndex as per ProgressTracker contract
      );

      if (result.success) {
        if (isMountedRef.current) {
          setIsCompleted(true);
        }

        console.log("✅ Section completed successfully!");

        Alert.alert("Success! 🎉", "Section completed successfully!", [
          {
            text: "Continue",
            onPress: async () => {
              // Refresh progress
              await checkLicenseAndProgress();

              // Check if there's a next section
              if (progress && sectionIndex < progress.totalSections - 1) {
                Alert.alert(
                  "Next Section",
                  "Would you like to continue to the next section?",
                  [
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
                  ]
                );
              }
            },
          },
        ]);
      } else {
        throw new Error(result.error || "Failed to complete section");
      }
    } catch (error) {
      console.error("❌ Error completing section:", error);
      Alert.alert(
        "Error",
        error.message?.includes("already completed")
          ? "This section is already completed."
          : "Failed to complete section. Please try again."
      );
    } finally {
      if (isMountedRef.current) {
        setCompletingSection(false);
      }
    }
  }, [
    hasValidLicense,
    smartContractService,
    isCompleted,
    courseId,
    sectionIndex,
    courseTitle,
    progress,
    navigation,
    checkLicenseAndProgress,
  ]);

  // ✅ Utility functions
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

  // ✅ Video playback handlers
  const handleVideoStatusUpdate = useCallback(
    (status) => {
      setVideoStatus(status);

      // Auto-complete section when video finishes (optional feature)
      if (status.didJustFinish && !isCompleted && hasValidLicense) {
        Alert.alert(
          "Video Completed",
          "Would you like to mark this section as complete?",
          [
            { text: "Not Yet", style: "cancel" },
            { text: "Complete Section", onPress: handleCompleteSection },
          ]
        );
      }
    },
    [isCompleted, hasValidLicense, handleCompleteSection]
  );

  // ✅ ENHANCED: Media player component with better error handling
  const renderMediaPlayer = useCallback(() => {
    if (videoLoading) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoLoadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.videoLoadingText}>Loading video...</Text>
            <Text style={styles.videoLoadingSubtext}>
              Fetching from IPFS network...
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
            <Text style={styles.noVideoSubtext}>
              This section may only contain text content
            </Text>
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
          shouldPlay={false}
          onPlaybackStatusUpdate={handleVideoStatusUpdate}
          onError={(error) => {
            console.error("❌ Video playback error:", error);
            setVideoError(
              "Unable to play this video. The content might be corrupted or in an unsupported format."
            );
          }}
          onLoad={(status) => {
            console.log("✅ Video loaded successfully:", {
              duration: status.durationMillis,
              isLoaded: status.isLoaded,
            });
          }}
          onLoadStart={() => {
            console.log("🎬 Video loading started...");
          }}
        />

        {/* IPFS indicator */}
        {section?.contentCID && section.contentCID !== "sample-video" && (
          <View style={styles.ipfsIndicator}>
            <Ionicons name="cloud-done-outline" size={12} color="#fff" />
            <Text style={styles.ipfsText}>IPFS Content</Text>
          </View>
        )}

        {/* Video controls overlay */}
        {videoStatus.isLoaded && !videoStatus.isPlaying && (
          <View style={styles.videoOverlay}>
            <View style={styles.videoInfo}>
              <Text style={styles.videoInfoText}>
                {formatDuration(
                  Math.floor((videoStatus.positionMillis || 0) / 1000)
                )}{" "}
                /{" "}
                {formatDuration(
                  Math.floor((videoStatus.durationMillis || 0) / 1000)
                )}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }, [
    videoLoading,
    videoError,
    videoUrl,
    section,
    videoStatus,
    handleVideoStatusUpdate,
    formatDuration,
    generateVideoUrl,
  ]);

  // ✅ Navigation handlers
  const navigateToSection = useCallback(
    (newSectionIndex) => {
      // Clear video URL cache for smooth transition
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

  // ✅ Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading Section...</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading section content...</Text>
          <Text style={styles.loadingSubtext}>Fetching from blockchain...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Access denied state
  if (!hasValidLicense && !licenseChecking) {
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
          <View style={styles.headerSpacer} />
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
            {courseTitle} • Section {sectionIndex + 1}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            {section?.contentCID && section.contentCID !== "sample-video" && (
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

          {/* Enhanced progress info */}
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

        {/* Completion Button */}
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
                  ? "Processing..."
                  : isCompleted
                  ? "Completed ✓"
                  : "Mark as Complete"}
              </Text>
            </TouchableOpacity>

            {/* Section navigation */}
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

            {/* Course completion message */}
            {progress &&
              progress.completedSections === progress.totalSections - 1 &&
              !isCompleted && (
                <View style={styles.completionMessage}>
                  <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
                  <Text style={styles.completionMessageText}>
                    Complete this section to finish the course!
                  </Text>
                </View>
              )}
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
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#94a3b8",
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
  headerSpacer: {
    width: 40,
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
  noVideoSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
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
  videoOverlay: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
  },
  videoInfo: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  videoInfoText: {
    color: "#fff",
    fontSize: 12,
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
  completionMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
  },
  completionMessageText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#92400e",
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
