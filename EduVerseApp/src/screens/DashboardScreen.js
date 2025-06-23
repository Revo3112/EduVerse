// src/screens/DashboardScreen.js - Updated Dashboard with Course Cards
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { mantaPacificTestnet } from "../constants/blockchain";

// Mock data for courses
const courses = [
  {
    id: 1,
    title: "How to become master in fullstack developer",
    description:
      "Kursus komprehensif tentang pengembangan fullstack. Mulai dari dasar hingga mahir dalam React, Node.js, dan database. Cocok untuk pemula yang ingin menjadi developer profesional.",
    thumbnailURI: "https://picsum.photos/400/250?random=1",
    creatorName: "Dr. Talking Tom, Developer and...",
    price: 150000,
    category: "Development",
    duration: "12 weeks",
    students: 1250,
    rating: 4.8,
  },
  {
    id: 2,
    title: "Advanced Solidity and Smart Contract Security",
    description:
      "Pelajari teknik keamanan smart contract terkini dan cara mengoptimalkan kode Solidity. Kursus ini mencakup audit keamanan, penanganan vulnerability, dan implementasi pattern terbaik.",
    thumbnailURI: "https://picsum.photos/400/250?random=2",
    creatorName: "Jane Doe, Blockchain Expert",
    price: 200000,
    category: "Blockchain",
    duration: "8 weeks",
    students: 850,
    rating: 4.9,
  },
  {
    id: 3,
    title: "Building a Decentralized Exchange (DEX)",
    description:
      "Bangun DEX Anda sendiri dari awal dengan Solidity dan Web3. Memahami mekanisme AMM, likuiditas, swap token, dan integrasi frontend dengan kontrak pintar.",
    thumbnailURI: "https://picsum.photos/400/250?random=3",
    creatorName: "John Smith, DeFi Architect",
    price: 180000,
    category: "DeFi",
    duration: "10 weeks",
    students: 650,
    rating: 4.7,
  },
  {
    id: 4,
    title: "React Native Mobile Development",
    description:
      "Kursus komprehensif tentang pengembangan aplikasi mobile dengan React Native. Belajar membuat UI yang menarik, state management, integrasi API, dan publikasi ke app store.",
    thumbnailURI: "https://picsum.photos/400/250?random=4",
    creatorName: "Sarah Johnson, Mobile Expert",
    price: 120000,
    category: "Mobile",
    duration: "14 weeks",
    students: 920,
    rating: 4.6,
  },
];

const formatPriceInRupiah = (price) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
};

const CourseCard = ({ course, onDetailPress }) => {
  return (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => onDetailPress(course)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: course.thumbnailURI }}
        style={styles.courseImage}
        resizeMode="cover"
      />
      <View style={styles.courseInfo}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{course.category}</Text>
        </View>

        <Text style={styles.courseTitle} numberOfLines={2}>
          {course.title}
        </Text>

        <Text style={styles.creatorName} numberOfLines={1}>
          👨‍🏫 {course.creatorName}
        </Text>

        <View style={styles.courseStats}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statText}>{course.students}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statText}>{course.rating}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statText}>{course.duration}</Text>
          </View>
        </View>

        <View style={styles.courseCardFooter}>
          <Text style={styles.coursePrice}>
            {formatPriceInRupiah(course.price)}
          </Text>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => onDetailPress(course)}
          >
            <Text style={styles.detailButtonText}>Detail</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function DashboardScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [showCourseDetailModal, setShowCourseDetailModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  const handleCourseDetail = (course) => {
    setSelectedCourse(course);
    setShowCourseDetailModal(true);
  };

  const handleMintLicense = () => {
    if (selectedCourse) {
      alert(`Minting license for: ${selectedCourse.title}`);
      setShowCourseDetailModal(false);
    }
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔌</Text>
          <Text style={styles.emptyStateTitle}>Wallet Not Connected</Text>
          <Text style={styles.emptyStateText}>
            Please connect your wallet to explore courses
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back! 👋</Text>
          <Text style={styles.addressText}>
            {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ""}
          </Text>
        </View>

        {!isOnMantaNetwork && (
          <View style={styles.networkWarning}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Switch to Manta Pacific Testnet
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Enrolled</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>4</Text>
          <Text style={styles.statLabel}>Certificates</Text>
        </View>
      </View>

      {/* Courses Section */}
      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Courses</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={courses}
          renderItem={({ item }) => (
            <CourseCard course={item} onDetailPress={handleCourseDetail} />
          )}
          keyExtractor={(item) => item.id.toString()}
          numColumns={1}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.coursesContainer}
        />
      </ScrollView>

      {/* Course Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCourseDetailModal}
        onRequestClose={() => setShowCourseDetailModal(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.courseDetailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Course Details</Text>
              <TouchableOpacity
                onPress={() => setShowCourseDetailModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {selectedCourse && (
              <ScrollView
                style={styles.courseDetailScrollView}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: selectedCourse.thumbnailURI }}
                  style={styles.courseDetailImage}
                  resizeMode="cover"
                />

                <View style={styles.courseDetailContent}>
                  <View style={styles.courseDetailHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>
                        {selectedCourse.category}
                      </Text>
                    </View>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingIcon}>⭐</Text>
                      <Text style={styles.ratingText}>
                        {selectedCourse.rating}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.courseDetailTitle}>
                    {selectedCourse.title}
                  </Text>

                  <Text style={styles.courseDetailCreator}>
                    👨‍🏫 {selectedCourse.creatorName}
                  </Text>

                  <View style={styles.courseStatsRow}>
                    <View style={styles.statDetailItem}>
                      <Text style={styles.statDetailIcon}>👥</Text>
                      <Text style={styles.statDetailText}>
                        {selectedCourse.students} students
                      </Text>
                    </View>
                    <View style={styles.statDetailItem}>
                      <Text style={styles.statDetailIcon}>⏱️</Text>
                      <Text style={styles.statDetailText}>
                        {selectedCourse.duration}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.courseDetailSection}>
                    <Text style={styles.courseDetailSectionTitle}>
                      📄 Description
                    </Text>
                    <Text style={styles.courseDetailDescription}>
                      {selectedCourse.description}
                    </Text>
                  </View>

                  <View style={styles.courseDetailInfoBox}>
                    <View style={styles.courseDetailInfoItem}>
                      <Text style={styles.courseDetailInfoLabel}>💰 Price</Text>
                      <Text style={styles.courseDetailInfoValue}>
                        {formatPriceInRupiah(selectedCourse.price)}
                      </Text>
                    </View>

                    <View style={styles.courseDetailInfoItem}>
                      <Text style={styles.courseDetailInfoLabel}>
                        🆔 Course ID
                      </Text>
                      <Text style={styles.courseDetailInfoValue}>
                        #{selectedCourse.id}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.mintLicenseButton,
                      !isOnMantaNetwork && styles.disabledButton,
                    ]}
                    onPress={handleMintLicense}
                    disabled={!isOnMantaNetwork}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mintLicenseButtonText}>
                      🎫 Mint License
                    </Text>
                  </TouchableOpacity>

                  {!isOnMantaNetwork && (
                    <Text style={styles.networkHint}>
                      Switch to Manta Pacific Testnet to mint license
                    </Text>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
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
    paddingBottom: 100, // Space for bottom tab
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  seeAllText: {
    fontSize: 14,
    color: "#9747FF",
    fontWeight: "600",
  },
  coursesContainer: {
    paddingHorizontal: 20,
  },
  courseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  courseImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#e2e8f0",
  },
  courseInfo: {
    padding: 16,
  },
  categoryBadge: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 22,
  },
  creatorName: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
  },
  courseStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  courseCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  coursePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  detailButton: {
    backgroundColor: "#9747FF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  detailButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  courseDetailModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fafafb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#64748b",
    lineHeight: 20,
    textAlign: "center",
  },
  courseDetailScrollView: {
    maxHeight: "90%",
  },
  courseDetailImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#e2e8f0",
  },
  courseDetailContent: {
    padding: 20,
  },
  courseDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  courseDetailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 26,
  },
  courseDetailCreator: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  courseStatsRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  statDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  statDetailIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  statDetailText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  courseDetailSection: {
    marginBottom: 20,
  },
  courseDetailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 10,
  },
  courseDetailDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
  courseDetailInfoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  courseDetailInfoItem: {
    marginBottom: 12,
  },
  courseDetailInfoLabel: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "500",
  },
  courseDetailInfoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  mintLicenseButton: {
    backgroundColor: "#9747FF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#9747FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
    elevation: 0,
  },
  mintLicenseButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  networkHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#ef4444",
    marginTop: 8,
    fontStyle: "italic",
  },
});
