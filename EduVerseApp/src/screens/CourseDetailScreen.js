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

  useEffect(() => {
    loadCourseData();
  }, [courseId, address]);
  const loadCourseData = async () => {
    try {
      setLoading(true);

      if (!smartContractService) {
        Alert.alert("Error", "Smart contract service not available");
        return;
      }

      // Load course details
      const courseData = await smartContractService.getCourse(courseId);
      setCourse(courseData);

      // Load course sections
      const sectionsData = await smartContractService.getCourseSections(
        courseId
      );
      setSections(sectionsData);

      if (address) {
        // Check license validity
        const licenseValid = await smartContractService.hasValidLicense(
          address,
          courseId
        );
        setHasValidLicense(licenseValid);

        // Get user progress
        const userProgress = await smartContractService.getUserProgress(
          address,
          courseId
        );
        setProgress(userProgress);
      }
    } catch (error) {
      console.error("Error loading course data:", error);
      Alert.alert("Error", "Failed to load course data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCourseData();
    setRefreshing(false);
  };

  const handleSectionPress = (section, index) => {
    if (!hasValidLicense) {
      Alert.alert(
        "Access Denied",
        "You need a valid license for this course to access sections.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Get License",
            onPress: () => navigation.navigate("Dashboard"),
          },
        ]
      );
      return;
    }

    navigation.navigate("SectionDetail", {
      courseId: courseId,
      sectionId: section.id,
      sectionIndex: index,
      courseTitle: course?.title || courseTitle,
    });
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
