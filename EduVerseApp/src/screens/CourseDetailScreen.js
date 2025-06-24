import React, { useState, useEffect } from "react";
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
  // useEffect dengan dependency yang lebih spesifik dan logging
  useEffect(() => {
    console.log("CourseDetailScreen useEffect triggered:", {
      courseId,
      address,
      isInitialized,
      smartContractServiceAvailable: !!smartContractService,
    });

    // Hanya load data jika semua kondisi terpenuhi
    if (courseId && address && isInitialized && smartContractService) {
      loadCourseData();
    } else {
      console.log("Skipping loadCourseData - conditions not met");
    }
  }, [courseId, address, isInitialized, smartContractService]);

  const loadCourseData = async () => {
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

      // Load course details dengan error handling yang lebih baik
      const courseData = await smartContractService.getCourse(courseId);
      console.log("Course data loaded:", courseData?.title || "No title");
      setCourse(courseData);

      // Load course sections
      const sectionsData = await smartContractService.getCourseSections(
        courseId
      );
      console.log("Sections loaded:", sectionsData?.length || 0, "sections");
      setSections(sectionsData);

      if (address) {
        // Check license validity dengan retry logic untuk ethers v6
        console.log(
          "Checking license validity for address:",
          address,
          "courseId:",
          courseId
        );

        try {
          // Tambahkan delay kecil untuk memastikan blockchain state consistency
          await new Promise((resolve) => setTimeout(resolve, 500));

          const licenseValid = await smartContractService.hasValidLicense(
            address,
            courseId
          );
          console.log("License check result:", licenseValid);
          setHasValidLicense(licenseValid);

          // Jika license tidak valid, coba check sekali lagi setelah delay
          if (!licenseValid) {
            console.log("License not valid, retrying after 1 second...");
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const licenseRetryResult =
              await smartContractService.hasValidLicense(address, courseId);
            console.log("License retry result:", licenseRetryResult);
            setHasValidLicense(licenseRetryResult);
          }
        } catch (licenseError) {
          console.error("Error checking license:", licenseError);
          // Set false sebagai fallback tapi tidak throw error
          setHasValidLicense(false);
        }

        // Get user progress
        try {
          const userProgress = await smartContractService.getUserProgress(
            address,
            courseId
          );
          console.log("User progress loaded:", userProgress);
          setProgress(userProgress);
        } catch (progressError) {
          console.error("Error loading user progress:", progressError);
          // Set default progress jika error
          setProgress({
            courseId: courseId.toString(),
            completedSections: 0,
            totalSections: 0,
            progressPercentage: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error loading course data:", error);
      Alert.alert("Error", "Failed to load course data: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = async () => {
    console.log("Manual refresh triggered");
    setRefreshing(true);

    // Reset license state before reload untuk memastikan fresh check
    setHasValidLicense(false);

    await loadCourseData();
    setRefreshing(false);
  };

  const handleSectionPress = (section, index) => {
    console.log("Section pressed:", {
      sectionId: section.id,
      hasValidLicense,
      address,
    });

    // Double check license sebelum navigasi untuk memastikan akses
    if (!hasValidLicense) {
      // Coba check license sekali lagi secara real-time
      checkLicenseRealTime(section, index);
      return;
    }

    // Jika license valid, navigasi ke section detail
    navigation.navigate("SectionDetail", {
      courseId: courseId,
      sectionId: section.id,
      sectionIndex: index,
      courseTitle: course?.title || courseTitle,
    });
  };

  // Fungsi untuk check license secara real-time sebelum akses section
  const checkLicenseRealTime = async (section, index) => {
    try {
      if (!address || !smartContractService) {
        Alert.alert("Error", "Wallet not connected or service not available");
        return;
      }
      console.log("Real-time license check for section access...");

      // Set loading state instead of alert
      setLoading(true);

      // Wait a moment for blockchain state consistency
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const licenseValid = await smartContractService.hasValidLicense(
        address,
        courseId
      );
      console.log("Real-time license check result:", licenseValid);

      setLoading(false);

      if (licenseValid) {
        // Update state dan navigasi
        setHasValidLicense(true);
        navigation.navigate("SectionDetail", {
          courseId: courseId,
          sectionId: section.id,
          sectionIndex: index,
          courseTitle: course?.title || courseTitle,
        });
      } else {
        Alert.alert(
          "Access Denied",
          "You need a valid license for this course to access sections.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Refresh",
              onPress: () => handleRefresh(),
            },
            {
              text: "Get License",
              onPress: () => navigation.navigate("Dashboard"),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error in real-time license check:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to verify license. Please try refreshing.");
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const renderSectionItem = ({ item, index }) => {
    const isCompleted = false; // You would implement logic to check if this specific section is completed

    return (
      <TouchableOpacity
        style={[
          styles.sectionItem,
          !hasValidLicense && styles.sectionItemLocked,
        ]}
        onPress={() => handleSectionPress(item, index)}
        disabled={!hasValidLicense}
      >
        <View style={styles.sectionLeft}>
          <View
            style={[
              styles.sectionNumber,
              isCompleted && styles.sectionNumberCompleted,
              !hasValidLicense && styles.sectionNumberLocked,
            ]}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text
                style={[
                  styles.sectionNumberText,
                  !hasValidLicense && styles.sectionNumberTextLocked,
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
                !hasValidLicense && styles.sectionTitleLocked,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.sectionDuration,
                !hasValidLicense && styles.sectionDurationLocked,
              ]}
            >
              {formatDuration(item.duration)}
            </Text>
          </View>
        </View>

        <View style={styles.sectionRight}>
          {!hasValidLicense ? (
            <Ionicons name="lock-closed" size={20} color="#ccc" />
          ) : (
            <Ionicons name="play-circle" size={24} color="#9747FF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Course Info */}
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle}>{course?.title || courseTitle}</Text>
        <Text style={styles.courseDescription}>{course?.description}</Text>

        <View style={styles.courseStats}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.statText}>
              {sections.reduce((total, section) => total + section.duration, 0)}{" "}
              min total
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="list-outline" size={16} color="#666" />
            <Text style={styles.statText}>{sections.length} sections</Text>
          </View>
        </View>
      </View>

      {/* Progress Card */}
      {hasValidLicense && progress && (
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Your Progress</Text>
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
            completed ({progress.progressPercentage}%)
          </Text>
        </View>
      )}

      {/* License Status */}
      <View
        style={[
          styles.licenseCard,
          hasValidLicense ? styles.licenseCardValid : styles.licenseCardInvalid,
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
      </View>

      {/* Sections Header */}
      <View style={styles.sectionsHeader}>
        <Text style={styles.sectionsTitle}>Course Sections</Text>
        <Text style={styles.sectionsSubtitle}>
          {hasValidLicense
            ? "Tap to start learning"
            : "Get a license to unlock"}
        </Text>
      </View>
    </View>
  );

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
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9747FF" />
          <Text style={styles.loadingText}>Loading course...</Text>
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
            colors={["#9747FF"]}
            tintColor="#9747FF"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Sections Available</Text>
            <Text style={styles.emptySubtitle}>
              This course doesn't have any sections yet.
            </Text>
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
  },
  licenseTextValid: {
    color: "#4CAF50",
  },
  licenseTextInvalid: {
    color: "#ff6b6b",
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
  sectionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#9747FF",
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
  sectionDuration: {
    fontSize: 14,
    color: "#666",
  },
  sectionDurationLocked: {
    color: "#ccc",
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
  },
});
