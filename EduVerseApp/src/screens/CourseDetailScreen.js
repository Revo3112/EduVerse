// src/screens/CourseDetailScreen.js - Enhanced with latest SmartContract integration
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAccount } from "wagmi";
import { useSmartContract } from "../hooks/useBlockchain";

// Cache for section data to improve performance
const sectionCache = new Map();

export default function CourseDetailScreen({ route, navigation }) {
  const { courseId, courseTitle } = route.params;
  const { address } = useAccount();
  const { smartContractService, isInitialized } = useSmartContract();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState(null);
  const [hasValidLicense, setHasValidLicense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [licenseChecking, setLicenseChecking] = useState(false);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ ENHANCED: Enhanced useEffect sesuai dengan pattern initialization terbaru
  useEffect(() => {
    console.log("CourseDetailScreen useEffect triggered:", {
      courseId,
      address,
      isInitialized,
      smartContractServiceAvailable: !!smartContractService,
    });

    // Load data hanya jika semua kondisi terpenuhi
    if (courseId && address && isInitialized && smartContractService) {
      loadCourseData();
    } else {
      console.log("Skipping loadCourseData - conditions not met");
      setLoading(false);
    }
  }, [courseId, address, isInitialized, smartContractService]);

  // ✅ ENHANCED: Load course data dengan SmartContractService terbaru
  const loadCourseData = useCallback(async () => {
    try {
      setLoading(true);
      console.log(
        "Loading course data for courseId:",
        courseId,
        "address:",
        address
      );

      if (!smartContractService || !isInitialized) {
        console.error("SmartContractService not ready:", {
          serviceAvailable: !!smartContractService,
          isInitialized,
        });
        Alert.alert(
          "Error",
          "Smart contract service not ready. Please try again."
        );
        return;
      }

      // ✅ Load course details menggunakan method terbaru
      const courseData = await smartContractService.getCourse(courseId);
      console.log("Course data loaded:", courseData?.title || "No title");

      if (isMountedRef.current) {
        setCourse(courseData);
      }

      // ✅ Load course sections dengan URL support
      const sectionsData = await smartContractService.getCourseSections(
        courseId
      );
      console.log("Sections loaded:", sectionsData?.length || 0, "sections");

      if (isMountedRef.current) {
        setSections(sectionsData || []);
        // Cache sections for faster navigation
        sectionCache.set(courseId, sectionsData);
      }

      if (address) {
        // ✅ Check license validity dengan caching mechanism
        console.log(
          "Checking license validity for address:",
          address,
          "courseId:",
          courseId
        );

        setLicenseChecking(true);
        try {
          const licenseValid = await smartContractService.hasValidLicense(
            address,
            courseId
          );
          console.log("License check result:", licenseValid);

          if (isMountedRef.current) {
            setHasValidLicense(licenseValid);
          }
        } catch (licenseError) {
          console.error("Error checking license:", licenseError);
          if (isMountedRef.current) {
            setHasValidLicense(false);
          }
        } finally {
          if (isMountedRef.current) {
            setLicenseChecking(false);
          }
        }

        // ✅ Get user progress dengan enhanced structure
        try {
          const userProgress = await smartContractService.getUserProgress(
            address,
            courseId
          );
          console.log("User progress loaded:", userProgress);

          if (isMountedRef.current) {
            setProgress(userProgress);
          }
        } catch (progressError) {
          console.error("Error loading user progress:", progressError);
          if (isMountedRef.current) {
            setProgress({
              courseId: courseId.toString(),
              completedSections: 0,
              totalSections: sectionsData?.length || 0,
              progressPercentage: 0,
              sectionsProgress: [],
            });
          }
        }
      }
    } catch (error) {
      console.error("Error loading course data:", error);
      if (isMountedRef.current) {
        Alert.alert("Error", "Failed to load course data: " + error.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [courseId, address, smartContractService, isInitialized]);

  // ✅ ENHANCED: Refresh handler
  const handleRefresh = useCallback(async () => {
    console.log("Manual refresh triggered");
    setRefreshing(true);

    // Clear cache for this course
    sectionCache.delete(courseId);

    await loadCourseData();

    if (isMountedRef.current) {
      setRefreshing(false);
    }
  }, [courseId, loadCourseData]);

  // ✅ ENHANCED: Section press handler dengan real-time license check
  const handleSectionPress = useCallback(
    async (section, index) => {
      console.log("Section pressed:", {
        sectionId: section.id,
        sectionIndex: index,
        hasValidLicense,
        address,
      });

      if (!hasValidLicense) {
        await checkLicenseRealTime(section, index);
        return;
      }

      // Navigate to section detail
      navigation.navigate("SectionDetail", {
        courseId: courseId,
        sectionId: section.id,
        sectionIndex: index,
        courseTitle: course?.title || courseTitle,
        sectionData: section, // Pass section data for faster loading
      });
    },
    [hasValidLicense, courseId, course, courseTitle, navigation, address]
  );

  // ✅ ENHANCED: Real-time license check with better UX
  const checkLicenseRealTime = useCallback(
    async (section, index) => {
      try {
        if (!address || !smartContractService) {
          Alert.alert("Error", "Wallet not connected or service not available");
          return;
        }

        console.log("Real-time license check for section access...");
        setLicenseChecking(true);

        const licenseValid = await smartContractService.hasValidLicense(
          address,
          courseId
        );
        console.log("Real-time license check result:", licenseValid);

        if (isMountedRef.current) {
          setLicenseChecking(false);
          setHasValidLicense(licenseValid);
        }

        if (licenseValid) {
          // License is valid, navigate to section
          navigation.navigate("SectionDetail", {
            courseId: courseId,
            sectionId: section.id,
            sectionIndex: index,
            courseTitle: course?.title || courseTitle,
            sectionData: section,
          });
        } else {
          Alert.alert(
            "Access Denied",
            "You need a valid license for this course to access sections.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Refresh", onPress: handleRefresh },
              {
                text: "Get License",
                onPress: () => navigation.getParent()?.navigate("Dashboard"),
              },
            ]
          );
        }
      } catch (error) {
        console.error("Error in real-time license check:", error);
        if (isMountedRef.current) {
          setLicenseChecking(false);
        }
        Alert.alert(
          "Error",
          "Failed to verify license. Please try refreshing."
        );
      }
    },
    [
      address,
      smartContractService,
      courseId,
      course,
      courseTitle,
      navigation,
      handleRefresh,
    ]
  );

  // ✅ Utility functions
  const formatDuration = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }, []);

  // ✅ ENHANCED: Check if section is completed using progress data
  const isSectionCompleted = useCallback(
    (sectionIndex) => {
      if (!progress || !progress.sectionsProgress) return false;
      return progress.sectionsProgress[sectionIndex] === true;
    },
    [progress]
  );

  // ✅ Calculate total duration
  const getTotalDuration = useCallback(() => {
    if (!sections || sections.length === 0) return 0;
    return sections.reduce(
      (total, section) => total + (section.duration || 0),
      0
    );
  }, [sections]);

  // ✅ ENHANCED: Render section item dengan completion status
  const renderSectionItem = useCallback(
    ({ item, index }) => {
      const isCompleted = isSectionCompleted(index);
      const isLocked = !hasValidLicense;

      return (
        <TouchableOpacity
          style={[
            styles.sectionItem,
            isLocked && styles.sectionItemLocked,
            isCompleted && styles.sectionItemCompleted,
          ]}
          onPress={() => handleSectionPress(item, index)}
          disabled={licenseChecking}
          activeOpacity={0.7}
        >
          <View style={styles.sectionLeft}>
            <View
              style={[
                styles.sectionNumber,
                isCompleted && styles.sectionNumberCompleted,
                isLocked && styles.sectionNumberLocked,
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.sectionNumberText,
                    isLocked && styles.sectionNumberTextLocked,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>

            <View style={styles.sectionInfo}>
              <Text
                style={[
                  styles.sectionTitle,
                  isLocked && styles.sectionTitleLocked,
                  isCompleted && styles.sectionTitleCompleted,
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <View style={styles.sectionMeta}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={isLocked ? "#ccc" : "#94a3b8"}
                />
                <Text
                  style={[
                    styles.sectionDuration,
                    isLocked && styles.sectionDurationLocked,
                  ]}
                >
                  {formatDuration(item.duration || 0)}
                </Text>
                {item.contentCID &&
                  item.contentCID !== "placeholder-video-content" && (
                    <>
                      <Text style={styles.metaSeparator}>•</Text>
                      <Ionicons
                        name="cloud-done-outline"
                        size={12}
                        color={isLocked ? "#ccc" : "#8b5cf6"}
                      />
                      <Text
                        style={[
                          styles.sectionMeta,
                          isLocked && styles.sectionDurationLocked,
                        ]}
                      >
                        IPFS
                      </Text>
                    </>
                  )}
              </View>
            </View>
          </View>

          <View style={styles.sectionRight}>
            {licenseChecking ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : isLocked ? (
              <Ionicons name="lock-closed" size={20} color="#ccc" />
            ) : (
              <Ionicons
                name={isCompleted ? "checkmark-circle" : "play-circle"}
                size={24}
                color={isCompleted ? "#4CAF50" : "#8b5cf6"}
              />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [
      hasValidLicense,
      licenseChecking,
      formatDuration,
      handleSectionPress,
      isSectionCompleted,
    ]
  );

  // ✅ ENHANCED: Header dengan course information
  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContent}>
        {/* Course Info */}
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{course?.title || courseTitle}</Text>
          {course?.description && (
            <Text style={styles.courseDescription}>{course.description}</Text>
          )}

          <View style={styles.courseStats}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.statText}>
                {formatDuration(getTotalDuration())} total
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="list-outline" size={16} color="#666" />
              <Text style={styles.statText}>{sections.length} sections</Text>
            </View>
            {course?.creator && (
              <View style={styles.statItem}>
                <Ionicons name="person-outline" size={16} color="#666" />
                <Text style={styles.statText}>
                  {`${course.creator.slice(0, 6)}...${course.creator.slice(
                    -4
                  )}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress Card */}
        {hasValidLicense && progress && progress.totalSections > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Your Progress</Text>
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
              {progress.completedSections} of {progress.totalSections} sections
              completed
            </Text>
          </View>
        )}

        {/* License Status */}
        <View
          style={[
            styles.licenseCard,
            hasValidLicense
              ? styles.licenseCardValid
              : styles.licenseCardInvalid,
          ]}
        >
          <Ionicons
            name={hasValidLicense ? "shield-checkmark" : "shield-outline"}
            size={20}
            color={hasValidLicense ? "#4CAF50" : "#ff6b6b"}
          />
          <Text
            style={[
              styles.licenseText,
              hasValidLicense
                ? styles.licenseTextValid
                : styles.licenseTextInvalid,
            ]}
          >
            {hasValidLicense ? "Licensed - Full Access" : "No Valid License"}
          </Text>
          {licenseChecking && (
            <ActivityIndicator
              size="small"
              color={hasValidLicense ? "#4CAF50" : "#ff6b6b"}
              style={styles.licenseLoader}
            />
          )}
        </View>

        {/* Sections Header */}
        <View style={styles.sectionsHeader}>
          <Text style={styles.sectionsTitle}>Course Sections</Text>
          <Text style={styles.sectionsSubtitle}>
            {hasValidLicense
              ? "Tap any section to start learning"
              : "Get a license to unlock all content"}
          </Text>
        </View>
      </View>
    ),
    [
      course,
      courseTitle,
      sections,
      progress,
      hasValidLicense,
      licenseChecking,
      formatDuration,
      getTotalDuration,
    ]
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
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading course details...</Text>
          <Text style={styles.loadingSubtext}>Fetching from blockchain...</Text>
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
        <Text style={styles.headerTitle}>Course Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <FlatList
        data={sections}
        renderItem={renderSectionItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#8b5cf6"]}
            tintColor="#8b5cf6"
            title="Pull to refresh"
            titleColor="#8b5cf6"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Sections Available</Text>
            <Text style={styles.emptySubtitle}>
              This course doesn't have any sections yet.
            </Text>
            {course?.creator === address && (
              <TouchableOpacity
                style={styles.addSectionButton}
                onPress={() =>
                  navigation.getParent()?.navigate("Create Course")
                }
              >
                <Ionicons name="add-circle-outline" size={20} color="#8b5cf6" />
                <Text style={styles.addSectionText}>Add Sections</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
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
  listContent: {
    paddingBottom: 20,
  },
  headerContent: {
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  courseInfo: {
    padding: 20,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 16,
  },
  courseStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: "#666",
  },
  progressCard: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
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
  licenseCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  licenseCardValid: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4CAF50",
    borderWidth: 1,
  },
  licenseCardInvalid: {
    backgroundColor: "#fff0f0",
    borderColor: "#ff6b6b",
    borderWidth: 1,
  },
  licenseText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  licenseTextValid: {
    color: "#4CAF50",
  },
  licenseTextInvalid: {
    color: "#ff6b6b",
  },
  licenseLoader: {
    marginLeft: "auto",
  },
  sectionsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  sectionsSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionItemLocked: {
    backgroundColor: "#f9f9f9",
    borderColor: "#e8e8e8",
  },
  sectionItemCompleted: {
    borderColor: "#4CAF50",
    borderWidth: 1,
  },
  sectionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionNumberCompleted: {
    backgroundColor: "#4CAF50",
  },
  sectionNumberLocked: {
    backgroundColor: "#ccc",
  },
  sectionNumberText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionNumberTextLocked: {
    color: "#999",
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  sectionTitleLocked: {
    color: "#999",
  },
  sectionTitleCompleted: {
    color: "#4CAF50",
  },
  sectionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionDuration: {
    fontSize: 12,
    color: "#94a3b8",
  },
  sectionDurationLocked: {
    color: "#ccc",
  },
  metaSeparator: {
    fontSize: 12,
    color: "#94a3b8",
    marginHorizontal: 4,
  },
  sectionRight: {
    marginLeft: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  addSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ede9fe",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addSectionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8b5cf6",
  },
});
