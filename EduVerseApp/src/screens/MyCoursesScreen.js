// src/screens/MyCoursesScreen.js - Fixed Text Component Issues
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { useFocusEffect } from "@react-navigation/native";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";
import CourseCard from "../components/CourseCard";
import {
  useSmartContract,
  useUserCourses,
  useCreatorCourses,
} from "../hooks/useBlockchain";

// Mock data sebagai fallback jika terjadi error blockchain
const mockEnrolledCourses = [
  {
    id: 1,
    title: "Introduction to Blockchain",
    description: "Learn the fundamentals of blockchain technology",
    instructor: "John Doe",
    progress: 75,
    totalLessons: 20,
    completedLessons: 15,
    thumbnailURI: "https://picsum.photos/400/250?random=1",
    thumbnail: "https://picsum.photos/400/250?random=1",
    category: "Blockchain",
    enrolled: "2024-01-15",
    creator: "0x1234567890abcdef1234567890abcdef12345678",
    pricePerMonth: "0.01",
    isActive: true,
    createdAt: "2024-01-15T10:00:00.000Z",
    sectionsCount: 20,
  },
];

const mockCreatedCourses = [
  {
    id: 1,
    title: "React Native for Beginners",
    description: "Learn React Native development from scratch",
    students: 42,
    revenue: "0.15",
    status: "Published",
    thumbnailURI: "https://picsum.photos/400/250?random=5",
    thumbnail: "https://picsum.photos/400/250?random=5",
    category: "Mobile Development",
    created: "2024-01-10",
    creator: "0x1111222233334444555566667777888899990000",
    pricePerMonth: "0.005",
    isActive: true,
    createdAt: "2024-01-10T10:00:00.000Z",
    sectionsCount: 15,
  },
  {
    id: 2,
    title: "Blockchain Development Masterclass",
    description: "Master blockchain development with Solidity and Web3",
    students: 28,
    revenue: "0.084",
    status: "Published",
    thumbnailURI: "https://picsum.photos/400/250?random=6",
    thumbnail: "https://picsum.photos/400/250?random=6",
    category: "Blockchain",
    created: "2024-01-05",
    creator: "0x1111222233334444555566667777888899990000",
    pricePerMonth: "0.003",
    isActive: true,
    createdAt: "2024-01-05T10:00:00.000Z",
    sectionsCount: 25,
  },
];

export default function MyCoursesScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { smartContractService, isInitialized } = useSmartContract();
  const [activeTab, setActiveTab] = useState("enrolled");
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const navigationTimeoutRef = useRef(null);

  // State untuk kurs ETH -> IDR (sama seperti di Dashboard)
  const [ethToIdrRate, setEthToIdrRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);

  // Helper untuk format Rupiah (sama seperti di Dashboard)
  const formatRupiah = (number) => {
    if (typeof number !== "number" || isNaN(number)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  // Helper function to format price in IDR (konsisten dengan Dashboard)
  const formatPriceInIDR = (priceInETH) => {
    if (!priceInETH || priceInETH === "0" || parseFloat(priceInETH) === 0) {
      return "Gratis";
    }
    if (!ethToIdrRate) return "Menghitung...";

    const priceInEth = parseFloat(priceInETH);
    const priceInIdr = priceInEth * ethToIdrRate;
    return formatRupiah(priceInIdr);
  };

  // Fetch ETH to IDR rate (sama seperti di Dashboard)
  const fetchEthPriceInIdr = useCallback(async () => {
    try {
      setRateLoading(true);
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr"
      );
      const data = await response.json();
      if (data?.ethereum?.idr) {
        setEthToIdrRate(data.ethereum.idr);
      } else {
        setEthToIdrRate(55000000); // Fallback
      }
    } catch (error) {
      console.error("Failed to fetch ETH to IDR rate:", error);
      setEthToIdrRate(55000000); // Fallback on error
    } finally {
      setRateLoading(false);
    }
  }, []);

  // Reset navigation state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (navigating) {
        console.log("Resetting navigation state on focus");
        setNavigating(false);
      }

      // Clear any pending navigation timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    }, [navigating])
  );

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;
  // Load user's courses from blockchain dengan optimization
  const loadEnrolledCourses = async () => {
    try {
      if (!smartContractService) {
        console.log("SmartContractService not available");
        return;
      }

      if (!address) {
        console.log("Address not available");
        return;
      }

      console.log("Fetching enrolled courses for address:", address);

      // Tambahkan timeout untuk prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout after 10 seconds")),
          10000
        )
      );

      const userEnrolledCourses = await Promise.race([
        smartContractService.getUserEnrolledCourses(address),
        timeoutPromise,
      ]);

      console.log("Enrolled courses fetched:", userEnrolledCourses.length);
      setEnrolledCourses(userEnrolledCourses);
    } catch (error) {
      console.error("Error loading enrolled courses:", error);
      // Fallback to mock data if there's an error
      setEnrolledCourses(mockEnrolledCourses);
    }
  };
  const loadCreatedCourses = async () => {
    try {
      if (!smartContractService || !address) {
        console.log("SmartContractService not available or no address");
        return;
      }

      // Tambahkan timeout untuk prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout after 10 seconds")),
          10000
        )
      );

      const userCreatedCourses = await Promise.race([
        smartContractService.getCreatorCourses(address),
        timeoutPromise,
      ]);

      setCreatedCourses(userCreatedCourses);
    } catch (error) {
      console.error("Error loading created courses:", error);
      // Fallback to mock data if there's an error
      setCreatedCourses(mockCreatedCourses);
    }
  };
  const loadAllCourses = async () => {
    if (loading) {
      console.log("Loading already in progress, skipping");
      return;
    }

    setLoading(true);

    // Use Promise.allSettled untuk better error handling
    const results = await Promise.allSettled([
      loadEnrolledCourses(),
      loadCreatedCourses(),
    ]);

    // Log failed operations
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to load ${index === 0 ? "enrolled" : "created"} courses:`,
          result.reason
        );
      }
    });

    setLoading(false);
  };
  useEffect(() => {
    console.log("MyCoursesScreen mount");
    console.log("Wallet connected:", isConnected);
    console.log("On Manta Network:", isOnMantaNetwork);
    console.log("Address:", address);
    console.log("SmartContract initialized:", isInitialized);
    console.log("SmartContractService available:", !!smartContractService);

    // Fetch ETH rate
    fetchEthPriceInIdr();

    if (isConnected && isOnMantaNetwork && address && isInitialized) {
      loadAllCourses();
    }
  }, [
    isConnected,
    isOnMantaNetwork,
    address,
    isInitialized,
    smartContractService,
    fetchEthPriceInIdr,
  ]);

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAllCourses(), fetchEthPriceInIdr()]);
    setRefreshing(false);
  };
  const handleCoursePress = (course) => {
    if (navigating) {
      console.log("Navigation already in progress, preventing duplicate press");
      return;
    }

    console.log("Navigating to course detail:", course.id);
    setNavigating(true);

    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Navigate immediately untuk improve responsiveness
    try {
      navigation.navigate("CourseDetail", {
        courseId: course.id,
        courseTitle: course.title,
      });
    } catch (navigationError) {
      console.error("Navigation error:", navigationError);
      setNavigating(false);
      return;
    }

    // Reset navigating state dengan timeout yang lebih pendek
    navigationTimeoutRef.current = setTimeout(() => {
      setNavigating(false);
      navigationTimeoutRef.current = null;
    }, 500); // Reduced from 1000ms to 500ms
  };

  const TabButton = ({ title, isActive, onPress, count = 0 }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTab]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {title}
      </Text>
      {count > 0 && (
        <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
          <Text
            style={[styles.tabBadgeText, isActive && styles.activeTabBadgeText]}
          >
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const EmptyState = ({ type }) => (
    <View style={styles.emptyState}>
      <Ionicons
        name={type === "enrolled" ? "book-outline" : "create-outline"}
        size={64}
        color="#ccc"
      />
      <Text style={styles.emptyTitle}>
        {type === "enrolled" ? "No Enrolled Courses" : "No Created Courses"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {type === "enrolled"
          ? "Start learning by browsing available courses"
          : "Share your knowledge by creating your first course"}
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => {
          if (type === "enrolled") {
            navigation.navigate("Dashboard");
          } else {
            navigation.navigate("CreateCourse");
          }
        }}
      >
        <Text style={styles.emptyActionText}>
          {type === "enrolled" ? "Browse Courses" : "Create Course"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const NotConnectedState = () => (
    <View style={styles.centeredContent}>
      <Ionicons name="wallet-outline" size={64} color="#ccc" />
      <Text style={styles.notConnectedTitle}>Wallet Not Connected</Text>
      <Text style={styles.notConnectedSubtitle}>
        Connect your wallet to view your courses
      </Text>
    </View>
  );

  const WrongNetworkState = () => (
    <View style={styles.centeredContent}>
      <Ionicons name="warning-outline" size={64} color="#ff9500" />
      <Text style={styles.warningTitle}>Wrong Network</Text>
      <Text style={styles.warningSubtitle}>
        Switch to Manta Pacific Testnet to access your courses
      </Text>
    </View>
  );

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <NotConnectedState />
      </SafeAreaView>
    );
  }

  if (!isOnMantaNetwork) {
    return (
      <SafeAreaView style={styles.container}>
        <WrongNetworkState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Courses</Text>
        <Text style={styles.subtitle}>Track your learning journey</Text>
      </View>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TabButton
          title="Enrolled"
          isActive={activeTab === "enrolled"}
          onPress={() => setActiveTab("enrolled")}
          count={enrolledCourses.length}
        />
        <TabButton
          title="Created"
          isActive={activeTab === "created"}
          onPress={() => setActiveTab("created")}
          count={createdCourses.length}
        />
      </View>
      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#9747FF"]}
            tintColor="#9747FF"
          />
        }
      >
        {activeTab === "enrolled" ? (
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9747FF" />
              <Text style={styles.loadingText}>
                Loading enrolled courses...
              </Text>
            </View>
          ) : enrolledCourses.length > 0 ? (
            <>
              {/* Learning Progress Stats - Moved to top */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Learning Progress</Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>
                      {
                        enrolledCourses.filter((c) => {
                          const progress = c.progress || 0;
                          return progress === 100;
                        }).length
                      }
                    </Text>
                    <Text style={styles.summaryLabel}>Completed</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>
                      {
                        enrolledCourses.filter((c) => {
                          const progress = c.progress || 0;
                          return progress > 0 && progress < 100;
                        }).length
                      }
                    </Text>
                    <Text style={styles.summaryLabel}>In Progress</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>
                      {enrolledCourses.length > 0
                        ? Math.round(
                            enrolledCourses.reduce((acc, c) => {
                              const progress = c.progress || 0;
                              return acc + progress;
                            }, 0) / enrolledCourses.length
                          )
                        : 0}
                      %
                    </Text>
                    <Text style={styles.summaryLabel}>Avg Progress</Text>
                  </View>
                </View>
              </View>
              {/* Enrolled Courses List */}
              <View style={styles.coursesContainer}>
                {enrolledCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onDetailPress={handleCoursePress}
                    type="enrolled"
                    showMintButton={false}
                    hidePrice={true}
                    priceLoading={navigating}
                  />
                ))}
              </View>
            </>
          ) : (
            <EmptyState type="enrolled" />
          )
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9747FF" />
            <Text style={styles.loadingText}>Loading created courses...</Text>
          </View>
        ) : createdCourses.length > 0 ? (
          <>
            {/* Creator Stats - Moved to top */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Creator Stats</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {createdCourses.reduce((acc, c) => {
                      // Karena students belum diimplementasi di smart contract,
                      // gunakan fallback ke mock data atau 0
                      const students = c.students || 0;
                      return acc + students;
                    }, 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Students</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {
                      createdCourses.filter((c) => {
                        // Data isActive berasal dari smart contract
                        return c.isActive === true;
                      }).length
                    }
                  </Text>
                  <Text style={styles.summaryLabel}>Published</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {createdCourses
                      .reduce((acc, c) => {
                        // Karena revenue belum diimplementasi di smart contract,
                        // hitung estimasi berdasarkan pricePerMonth * students
                        let estimatedRevenue = 0;
                        const pricePerMonth = parseFloat(c.pricePerMonth) || 0;
                        const students = c.students || 0;
                        estimatedRevenue = pricePerMonth * students;
                        return acc + estimatedRevenue;
                      }, 0)
                      .toFixed(4)}{" "}
                    ETH
                  </Text>
                  <Text style={styles.summaryLabel}>Est. Revenue</Text>
                </View>
              </View>
            </View>
            {/* Created Courses List */}
            <View style={styles.coursesContainer}>
              {createdCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onDetailPress={handleCoursePress}
                  type="created"
                  showMintButton={false}
                  hidePrice={false}
                  priceInIdr={formatPriceInIDR(course.pricePerMonth)}
                  priceLoading={rateLoading || navigating}
                />
              ))}
            </View>
          </>
        ) : (
          <EmptyState type="created" />
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
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
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
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#9747FF",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "white",
  },
  tabBadge: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
  },
  activeTabBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  activeTabBadgeText: {
    color: "white",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coursesContainer: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#9747FF",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
});
