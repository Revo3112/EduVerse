// src/screens/DashboardScreen.js - PRODUCTION READY
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { Ionicons } from "@expo/vector-icons";
import { mantaPacificTestnet } from "../constants/blockchain";
import {
  useCourses,
  useMintLicense,
  useUserCourses,
  useHasActiveLicense,
  useSmartContract,
} from "../hooks/useBlockchain";
import CourseCard from "../components/CourseCard";
import CourseDetailModal from "../components/CourseDetailModal";

// Helper untuk format Rupiah
const formatRupiah = (number) => {
  if (typeof number !== "number" || isNaN(number)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number);
};

export default function DashboardScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { isInitialized, modalPreventionActive } = useSmartContract();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // State untuk kurs ETH -> IDR
  const [ethToIdrRate, setEthToIdrRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);

  // Blockchain hooks
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
    hasMore,
    refetch: refetchCourses,
    loadMore,
  } = useCourses(0, 20);

  const { mintLicense, loading: mintLoading } = useMintLicense();
  const { refetch: refetchUserCourses } = useUserCourses();

  // License checking for selected course
  const {
    hasLicense,
    licenseData,
    loading: licenseLoading,
    refetch: refetchLicense,
  } = useHasActiveLicense(selectedCourse?.id);

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

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

      // Fallback price
      setEthToIdrRate(55000000);
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEthPriceInIdr();

    // Auto-refresh price every 5 minutes
    const priceInterval = setInterval(fetchEthPriceInIdr, 5 * 60 * 1000);
    return () => clearInterval(priceInterval);
  }, [fetchEthPriceInIdr]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    await Promise.allSettled([
      refetchCourses(),
      fetchEthPriceInIdr(),
      refetchUserCourses(),
    ]);

    setRefreshing(false);
  }, [refetchCourses, fetchEthPriceInIdr, refetchUserCourses]);

  // Open course detail
  const handleOpenDetail = useCallback(
    (course) => {
      if (modalPreventionActive) {
        console.log("Modal interaction prevented during initialization");
        return;
      }

      setSelectedCourse(course);
      setModalVisible(true);
    },
    [modalPreventionActive]
  );

  // Mint license handler
  const handleMintLicense = async (course, selectedDuration = 1) => {
    if (!isOnMantaNetwork) {
      Alert.alert(
        "Wrong Network",
        "Please switch to Manta Pacific Testnet to purchase licenses."
      );
      return;
    }

    if (!isInitialized) {
      Alert.alert(
        "Not Ready",
        "Smart contracts are still initializing. Please wait."
      );
      return;
    }

    try {
      console.log(
        `🎫 Minting license: Course ${course.id}, Duration: ${selectedDuration} month(s)`
      );

      const result = await mintLicense(course.id, selectedDuration);

      if (result.success) {
        Alert.alert(
          "Success! 🎉",
          `License purchased successfully for "${course.title}"!`,
          [
            {
              text: "View My Courses",
              onPress: () => navigation.navigate("MyCourses"),
            },
            { text: "OK", style: "default" },
          ]
        );

        await Promise.allSettled([refetchUserCourses(), refetchLicense()]);

        setModalVisible(false);
      } else {
        throw new Error(result.error || "Failed to mint license");
      }
    } catch (error) {
      console.error("❌ License minting error:", error);

      let errorMessage = "Failed to purchase license.";

      if (
        error.message.includes("rejected") ||
        error.message.includes("denied")
      ) {
        errorMessage = "Transaction was rejected by user.";
      } else if (error.message.includes("insufficient")) {
        errorMessage = "Insufficient ETH balance for purchase.";
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Explore Courses</Text>
        <Text style={styles.headerSubtitle}>Learn blockchain development</Text>
        {courses.length > 0 && (
          <Text style={styles.coursesCount}>
            {courses.length} courses available
          </Text>
        )}
      </View>
      {!isOnMantaNetwork && isConnected && (
        <View style={styles.networkWarning}>
          <Ionicons name="warning-outline" size={14} color="#92400e" />
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }) => {
    try {
      const priceInEth = parseFloat(item.pricePerMonth || "0");
      const priceInIdr =
        ethToIdrRate && !rateLoading ? priceInEth * ethToIdrRate : 0;

      return (
        <CourseCard
          course={item}
          onDetailPress={handleOpenDetail}
          priceInIdr={formatRupiah(priceInIdr)}
          priceLoading={rateLoading}
          hidePrice={false}
        />
      );
    } catch (error) {
      console.error("Error rendering course card:", error);
      return null;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.centered}>
      <Ionicons
        name={coursesError ? "warning-outline" : "library-outline"}
        size={50}
        color={coursesError ? "#ef4444" : "#cbd5e1"}
      />
      <Text style={styles.emptyTitle}>
        {coursesError ? "Failed to Load Courses" : "No Courses Available"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {coursesError
          ? "Error loading blockchain data"
          : "Check back later for new courses."}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Ionicons name="refresh-outline" size={16} color="#8b5cf6" />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footerLoader}>
        <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
          <Text style={styles.loadMoreText}>Load More</Text>
          <Ionicons name="chevron-down-outline" size={16} color="#8b5cf6" />
        </TouchableOpacity>
      </View>
    );
  };

  const calculateModalPrice = (duration = 1) => {
    if (!selectedCourse || !ethToIdrRate) return "Calculating...";

    const priceInEth = parseFloat(selectedCourse.pricePerMonth || "0");
    if (priceInEth === 0) return "Free";

    const originalTotal = priceInEth * duration;

    // Apply discounts
    let discount = 0;
    if (duration === 3) discount = 10;
    else if (duration === 6) discount = 15;
    else if (duration === 12) discount = 25;

    const finalTotal = originalTotal * (1 - discount / 100);
    const totalPriceInIdr = finalTotal * ethToIdrRate;

    return formatRupiah(totalPriceInIdr);
  };

  // Show loading state
  if (!isInitialized && coursesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>
            Initializing blockchain connection...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      {renderHeader()}

      <FlatList
        data={courses?.filter((c) => c.isActive) || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#8b5cf6"]}
            tintColor="#8b5cf6"
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      <CourseDetailModal
        visible={modalVisible}
        course={selectedCourse}
        onClose={() => {
          setModalVisible(false);
        }}
        onMintLicense={handleMintLicense}
        isMinting={mintLoading}
        priceCalculator={calculateModalPrice}
        priceLoading={rateLoading}
        hasLicense={hasLicense}
        licenseData={licenseData}
        licenseLoading={licenseLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  coursesCount: {
    fontSize: 12,
    color: "#8b5cf6",
    marginTop: 2,
    fontWeight: "500",
  },
  networkWarning: {
    backgroundColor: "#fef3c7",
    padding: 8,
    borderRadius: 999,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ede9fe",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: "#8b5cf6",
    fontWeight: "600",
  },
  footerLoader: {
    padding: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  loadMoreText: {
    color: "#8b5cf6",
    fontWeight: "500",
  },
});
