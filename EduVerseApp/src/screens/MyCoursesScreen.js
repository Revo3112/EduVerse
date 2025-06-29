// src/screens/MyCoursesScreen.js - Updated for Latest Smart Contract
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
import { useWeb3 } from "../contexts/Web3Context";

export default function MyCoursesScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Use Web3Context directly
  const {
    isInitialized,
    modalPreventionActive,
    getUserLicenses,
    getCourse,
    getUserProgress,
    getCreatorCourses,
  } = useWeb3();

  const [activeTab, setActiveTab] = useState("enrolled");
  const [refreshing, setRefreshing] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [createdLoading, setCreatedLoading] = useState(false);
  const [enrolledError, setEnrolledError] = useState(null);
  const [createdError, setCreatedError] = useState(null);

  const navigationTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // State untuk kurs ETH -> IDR
  const [ethToIdrRate, setEthToIdrRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);

  // Helper untuk format Rupiah
  const formatRupiah = (number) => {
    if (typeof number !== "number" || isNaN(number)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  // Helper function to format price in IDR
  const formatPriceInIDR = (priceInETH) => {
    if (!priceInETH || priceInETH === "0" || parseFloat(priceInETH) === 0) {
      return "Free";
    }
    if (!ethToIdrRate) return "Loading...";

    const priceInEth = parseFloat(priceInETH);
    const priceInIdr = priceInEth * ethToIdrRate;
    return formatRupiah(priceInIdr);
  };

  // Fetch ETH price
  const fetchEthPriceInIdr = useCallback(async (retries = 3) => {
    try {
      setRateLoading(true);
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr"
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data?.ethereum?.idr) {
        setEthToIdrRate(data.ethereum.idr);
        console.log("✅ ETH price updated:", data.ethereum.idr);
      } else {
        throw new Error("Invalid price data");
      }
    } catch (error) {
      console.error("Failed to fetch ETH to IDR rate:", error);

      if (retries > 0) {
        console.log(`Retrying price fetch... (${retries} attempts left)`);
        setTimeout(() => fetchEthPriceInIdr(retries - 1), 2000);
        return;
      }

      // Fallback price based on current market rates
      setEthToIdrRate(55000000);
    } finally {
      setRateLoading(false);
    }
  }, []);

  // Fetch enrolled courses
  const fetchEnrolledCourses = useCallback(async () => {
    if (!isInitialized || !address) return;

    setEnrolledLoading(true);
    setEnrolledError(null);

    try {
      const licenses = await getUserLicenses(address);

      if (!isMountedRef.current) return;

      const coursesWithProgress = [];

      for (const license of licenses) {
        try {
          const [course, progress] = await Promise.all([
            getCourse(license.courseId),
            getUserProgress(address, license.courseId),
          ]);

          if (isMountedRef.current && course) {
            coursesWithProgress.push({
              ...course,
              license,
              progress: progress?.progressPercentage || 0,
              completedSections: progress?.completedSections || 0,
              totalSections: progress?.totalSections || 0,
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch course ${license.courseId}:`, err);
        }
      }

      if (isMountedRef.current) {
        setEnrolledCourses(coursesWithProgress);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching user courses:", err);
        setEnrolledError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setEnrolledLoading(false);
      }
    }
  }, [isInitialized, address, getUserLicenses, getCourse, getUserProgress]);

  // Fetch created courses
  const fetchCreatedCourses = useCallback(async () => {
    if (!isInitialized || !address) return;

    setCreatedLoading(true);
    setCreatedError(null);

    try {
      const courses = await getCreatorCourses(address);

      if (isMountedRef.current) {
        setCreatedCourses(courses);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Error fetching creator courses:", err);
        setCreatedError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setCreatedLoading(false);
      }
    }
  }, [isInitialized, address, getCreatorCourses]);

  // Reset navigation state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (navigating) {
        console.log("Resetting navigation state on focus");
        setNavigating(false);
      }

      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    }, [navigating])
  );

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  useEffect(() => {
    fetchEthPriceInIdr();
  }, [fetchEthPriceInIdr]);

  useEffect(() => {
    isMountedRef.current = true;

    if (isInitialized && address) {
      fetchEnrolledCourses();
      fetchCreatedCourses();
    }

    return () => {
      isMountedRef.current = false;
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [isInitialized, address, fetchEnrolledCourses, fetchCreatedCourses]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetchEnrolledCourses(),
      fetchCreatedCourses(),
      fetchEthPriceInIdr(),
    ]);
    setRefreshing(false);
  };

  // Course press handler
  const handleCoursePress = (course) => {
    if (navigating || modalPreventionActive) {
      console.log("Navigation prevented during smart contract operations");
      return;
    }

    console.log("Navigating to course detail:", course.id);
    setNavigating(true);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    try {
      navigation.navigate("CourseDetail", {
        courseId: course.id.toString(),
        courseTitle: course.title,
      });
    } catch (navigationError) {
      console.error("Navigation error:", navigationError);
      setNavigating(false);
      return;
    }

    navigationTimeoutRef.current = setTimeout(() => {
      setNavigating(false);
      navigationTimeoutRef.current = null;
    }, 500);
  };

  // Tab button component
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

  // Empty state component
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
          ? "Start learning by browsing available courses and minting course licenses"
          : "Share your knowledge by creating your first course on the blockchain"}
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => {
          if (type === "enrolled") {
            navigation.getParent()?.navigate("Dashboard");
          } else {
            navigation.getParent()?.navigate("Create Course");
          }
        }}
      >
        <Text style={styles.emptyActionText}>
          {type === "enrolled" ? "Browse Courses" : "Create Course"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Connection state components
  const NotConnectedState = () => (
    <View style={styles.centeredContent}>
      <Ionicons name="wallet-outline" size={64} color="#ccc" />
      <Text style={styles.notConnectedTitle}>Wallet Not Connected</Text>
      <Text style={styles.notConnectedSubtitle}>
        Connect your wallet to view your course licenses and created courses
      </Text>
    </View>
  );

  const WrongNetworkState = () => (
    <View style={styles.centeredContent}>
      <Ionicons name="warning-outline" size={64} color="#ff9500" />
      <Text style={styles.warningTitle}>Wrong Network</Text>
      <Text style={styles.warningSubtitle}>
        Switch to Manta Pacific Testnet to access your courses and licenses
      </Text>
    </View>
  );

  // Early returns
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

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#9747FF" />
          <Text style={styles.loadingText}>
            Initializing smart contracts on Manta Pacific...
          </Text>
          <Text style={styles.loadingSubtext}>
            Connecting to CourseFactory, CourseLicense, and ProgressTracker
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const loading = activeTab === "enrolled" ? enrolledLoading : createdLoading;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Courses</Text>
        <Text style={styles.subtitle}>
          Track your learning journey and course creation on Manta Pacific
        </Text>
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
                Loading enrolled courses from blockchain...
              </Text>
              <Text style={styles.loadingSubtext}>
                Fetching course licenses and progress data
              </Text>
            </View>
          ) : enrolledCourses.length > 0 ? (
            <>
              {/* Learning Progress Stats */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Learning Progress</Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>
                      {
                        enrolledCourses.filter((c) => (c.progress || 0) === 100)
                          .length
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
                            enrolledCourses.reduce(
                              (acc, c) => acc + (c.progress || 0),
                              0
                            ) / enrolledCourses.length
                          )
                        : 0}
                      %
                    </Text>
                    <Text style={styles.summaryLabel}>Avg Progress</Text>
                  </View>
                </View>
                <View style={styles.licenseInfo}>
                  <Text style={styles.licenseInfoText}>
                    📝 Course access managed via NFT licenses on Manta Pacific
                  </Text>
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
                    showProgress={true}
                    progressPercentage={course.progress || 0}
                    licenseInfo={course.license}
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
            <Text style={styles.loadingText}>
              Loading created courses from blockchain...
            </Text>
            <Text style={styles.loadingSubtext}>
              Fetching courses from CourseFactory contract
            </Text>
          </View>
        ) : createdCourses.length > 0 ? (
          <>
            {/* Creator Stats */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Creator Stats</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {createdCourses.reduce(
                      (acc, c) => acc + (c.studentsCount || 0),
                      0
                    )}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Students</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {createdCourses.filter((c) => c.isActive === true).length}
                  </Text>
                  <Text style={styles.summaryLabel}>Active Courses</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {createdCourses
                      .reduce((acc, c) => {
                        const pricePerMonth = parseFloat(c.pricePerMonth) || 0;
                        const students = c.studentsCount || 0;
                        return acc + pricePerMonth * students;
                      }, 0)
                      .toFixed(4)}{" "}
                    ETH
                  </Text>
                  <Text style={styles.summaryLabel}>Est. Revenue</Text>
                </View>
              </View>
              <View style={styles.contractInfo}>
                <Text style={styles.contractInfoText}>
                  🏗️ Courses deployed on CourseFactory: {createdCourses.length}{" "}
                  total
                </Text>
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
                  showCreatorBadge={true}
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
    fontWeight: "500",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#94a3b8",
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
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: 0, height: 2 },
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
  licenseInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#9747FF",
  },
  licenseInfoText: {
    fontSize: 12,
    color: "#5a67d8",
    fontWeight: "500",
  },
  contractInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0fff4",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#48bb78",
  },
  contractInfoText: {
    fontSize: 12,
    color: "#38a169",
    fontWeight: "500",
  },
});
