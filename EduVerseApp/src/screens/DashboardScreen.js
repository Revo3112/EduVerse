// src/screens/DashboardScreen.js - Final Integrated Dashboard with Blockchain
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  Alert,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";
import CourseCard from "../components/CourseCard";
import CourseDetailModal from "../components/CourseDetailModal";
import {
  useCourses,
  useMintLicense,
  useUserCourses,
} from "../hooks/useBlockchain";

export default function DashboardScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [showCourseDetailModal, setShowCourseDetailModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Blockchain hooks
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses,
  } = useCourses();
  const { mintLicense, loading: mintLoading } = useMintLicense();
  const { refetch: refetchUserCourses } = useUserCourses();

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  const handleCourseDetail = (course) => {
    setSelectedCourse(course);
    setShowCourseDetailModal(true);
  };

  const handleMintLicense = async (course) => {
    if (!isOnMantaNetwork) {
      Alert.alert(
        "Network Error",
        "Please switch to Manta Pacific Testnet to mint license",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const result = await mintLicense(course.id, 1); // Mint for 1 month

      if (result.success) {
        Alert.alert(
          "Success!",
          `License minted successfully for "${course.title}"`,
          [
            {
              text: "View My Courses",
              onPress: () => navigation.navigate("MyCourses"),
            },
            { text: "OK" },
          ]
        );

        // Refresh user courses
        refetchUserCourses();
      } else {
        Alert.alert("Error", result.error || "Failed to mint license");
      }
    } catch (error) {
      console.error("Error minting license:", error);
      Alert.alert("Error", "Failed to mint license. Please try again.");
    }
  };

  const handleRefresh = async () => {
    await refetchCourses();
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="school-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>
        {!isConnected
          ? "Wallet Not Connected"
          : !isOnMantaNetwork
          ? "Wrong Network"
          : coursesError
          ? "Error Loading Courses"
          : "No Courses Available"}
      </Text>
      <Text style={styles.emptyStateText}>
        {!isConnected
          ? "Connect your wallet to explore courses"
          : !isOnMantaNetwork
          ? "Switch to Manta Pacific Testnet to view courses"
          : coursesError
          ? coursesError
          : "No courses found. Check back later!"}
      </Text>
      {coursesError && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back! 👋</Text>
        {address && (
          <Text style={styles.addressText}>
            {`${address.slice(0, 8)}...${address.slice(-6)}`}
          </Text>
        )}
      </View>

      {isConnected && !isOnMantaNetwork && (
        <View style={styles.networkWarning}>
          <Ionicons name="warning" size={16} color="#fff" />
          <Text style={styles.warningText}>
            Switch to Manta Pacific Testnet
          </Text>
        </View>
      )}
    </View>
  );

  const renderQuickStats = () => {
    if (!isConnected || !isOnMantaNetwork) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{courses.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {courses.filter((c) => c.isActive).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {courses.filter((c) => parseFloat(c.pricePerMonth) === 0).length}
          </Text>
          <Text style={styles.statLabel}>Free</Text>
        </View>
      </View>
    );
  };

  const renderCoursesList = () => {
    if (coursesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color="#9747FF" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      );
    }

    if (
      !isConnected ||
      !isOnMantaNetwork ||
      coursesError ||
      courses.length === 0
    ) {
      return renderEmptyState();
    }

    return (
      <View style={styles.coursesContainer}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={{
              ...course,
              // Format data for CourseCard component
              price: parseFloat(course.pricePerMonth),
              creatorName: `${course.creator.slice(
                0,
                8
              )}...${course.creator.slice(-6)}`,
              students: Math.floor(Math.random() * 1000), // Mock data
              rating: (4 + Math.random()).toFixed(1), // Mock data
              duration: "8 weeks", // Mock data
              category: "Blockchain", // Mock data
            }}
            onDetailPress={handleCourseDetail}
            onMintPress={handleMintLicense}
            type="default"
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#9747FF"
        translucent={false}
      />

      {renderHeader()}
      {renderQuickStats()}

      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={coursesLoading}
            onRefresh={handleRefresh}
            colors={["#9747FF"]}
            tintColor="#9747FF"
          />
        }
      >
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Courses</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color="#9747FF" />
          </TouchableOpacity>
        </View>

        {/* Courses List */}
        {renderCoursesList()}
      </ScrollView>

      {/* Course Detail Modal */}
      <CourseDetailModal
        visible={showCourseDetailModal}
        course={selectedCourse}
        onClose={() => setShowCourseDetailModal(false)}
        onMintLicense={handleMintLicense}
        isOnMantaNetwork={isOnMantaNetwork}
      />

      {/* Mint Loading Overlay */}
      {mintLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingModal}>
            <Ionicons name="refresh" size={32} color="#9747FF" />
            <Text style={styles.loadingModalText}>Minting License...</Text>
            <Text style={styles.loadingModalSubtext}>
              Please confirm the transaction in your wallet
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#9747FF",
    padding: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  welcomeSection: {
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  addressText: {
    fontSize: 14,
    color: "#E8D8FF",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  networkWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  warningText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: -15,
  },
  statCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#9747FF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  coursesContainer: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingModal: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 40,
  },
  loadingModalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  loadingModalSubtext: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
});
