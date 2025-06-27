// src/screens/DashboardScreen.js - Enhanced with latest SmartContract & Pinata integration
import React, { useState, useEffect, useCallback, useRef } from "react";
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
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { Ionicons } from "@expo/vector-icons";
import { mantaPacificTestnet } from "../constants/blockchain";
import {
  useCourses,
  useMintLicense,
  useUserCourses,
  useSmartContract,
  useHasActiveLicense,
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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modalInteracting, setModalInteracting] = useState(false);
  const modalTimeoutRef = useRef(null);

  // State untuk kurs ETH -> IDR
  const [ethToIdrRate, setEthToIdrRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);

  // ✅ Enhanced pagination support
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    hasMore: true,
  });

  // Blockchain hooks dengan pagination
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
    hasMore,
    refetch: refetchCourses,
    loadMore,
  } = useCourses(pagination.offset, pagination.limit);

  const { mintLicense, loading: mintLoading } = useMintLicense();
  const { refetch: refetchUserCourses } = useUserCourses();
  const { smartContractService, isInitialized } = useSmartContract();

  // ✅ Enhanced license checking hook for selected course
  const {
    hasLicense,
    licenseData,
    loading: licenseLoading,
    refetch: refetchLicense,
  } = useHasActiveLicense(selectedCourse?.id);

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  // ✅ Enhanced ETH price fetching dengan retry mechanism
  const fetchEthPriceInIdr = useCallback(async (retries = 3) => {
    try {
      setRateLoading(true);
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr",
        { timeout: 10000 }
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
      console.log("Using fallback ETH price");
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEthPriceInIdr();

    // ✅ Auto-refresh price every 5 minutes
    const priceInterval = setInterval(fetchEthPriceInIdr, 5 * 60 * 1000);
    return () => clearInterval(priceInterval);
  }, [fetchEthPriceInIdr]);

  // ✅ Enhanced refresh with better error handling
  const handleRefresh = useCallback(async () => {
    try {
      console.log("🔄 Refreshing dashboard data...");

      // Reset pagination
      setPagination({ offset: 0, limit: 20, hasMore: true });

      // Parallel refresh
      await Promise.allSettled([
        refetchCourses(),
        fetchEthPriceInIdr(),
        refetchUserCourses(),
      ]);

      console.log("✅ Dashboard refresh completed");
    } catch (error) {
      console.error("❌ Dashboard refresh error:", error);
      Alert.alert("Error", "Gagal memperbarui data. Silakan coba lagi.");
    }
  }, [refetchCourses, fetchEthPriceInIdr, refetchUserCourses]);

  // ✅ Load more courses (pagination)
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || coursesLoading) return;

    console.log("📚 Loading more courses...");
    setPagination((prev) => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));

    await loadMore();
  }, [hasMore, coursesLoading, loadMore]);

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }
    };
  }, []);

  // ✅ Enhanced course detail opening dengan preloading
  const handleOpenDetail = useCallback(
    async (course) => {
      if (modalInteracting) {
        console.log("Modal interaction already in progress");
        return;
      }

      console.log("🔍 Opening course detail:", course.title);
      setModalInteracting(true);

      // Clear any existing timeout
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }

      // Show modal immediately untuk improve UX
      setSelectedCourse(course);
      setModalVisible(true);

      // ✅ Enhanced course data preloading
      try {
        if (isInitialized && smartContractService && course.id) {
          console.log("🔍 Preloading course sections count...");

          // Preload sections count for better UX
          const sectionsCount =
            await smartContractService.getCourseSectionsCount(course.id);

          // Update selected course with additional data
          setSelectedCourse((prev) => ({
            ...prev,
            sectionsCount: sectionsCount || prev.sectionsCount,
          }));
        }
      } catch (error) {
        console.warn("Failed to preload course data:", error);
      }

      // Reset interaction state
      modalTimeoutRef.current = setTimeout(() => {
        setModalInteracting(false);
        modalTimeoutRef.current = null;
      }, 1500);
    },
    [modalInteracting, isInitialized, smartContractService]
  );

  // ✅ FIXED: Enhanced mint license dengan proper duration validation
  const handleMintLicense = async (course, selectedDuration = 1) => {
    if (!isOnMantaNetwork) {
      Alert.alert(
        "Jaringan Salah",
        "Silakan pindah ke Manta Pacific Testnet untuk membeli lisensi."
      );
      return;
    }

    // ✅ Validate duration according to smart contract (max 12 months)
    if (selectedDuration <= 0) {
      Alert.alert("Error", "Durasi harus lebih dari 0 bulan");
      return;
    }

    if (selectedDuration > 12) {
      Alert.alert("Error", "Durasi maksimal 12 bulan per transaksi");
      return;
    }

    try {
      console.log(
        `🎫 Minting license: Course ${course.id}, Duration: ${selectedDuration} month(s)`
      );

      // ✅ Enhanced validation
      if (!smartContractService || !isInitialized) {
        throw new Error("Smart contract service not ready");
      }

      // ✅ Check if course is still active
      const courseData = await smartContractService.getCourse(course.id);
      if (!courseData.isActive) {
        throw new Error("Course is no longer active");
      }

      // ✅ Calculate expected price for confirmation
      const pricePerMonth = parseFloat(courseData.pricePerMonth);
      const totalPriceETH = pricePerMonth * selectedDuration;
      const estimatedPriceIDR = ethToIdrRate ? totalPriceETH * ethToIdrRate : 0;

      console.log("💰 License pricing:", {
        pricePerMonth: `${pricePerMonth} ETH`,
        duration: `${selectedDuration} months`,
        totalETH: `${totalPriceETH} ETH`,
        estimatedIDR: formatRupiah(estimatedPriceIDR),
      });

      const result = await mintLicense(course.id, selectedDuration);

      if (result.success) {
        const durationText =
          selectedDuration === 1 ? "1 bulan" : `${selectedDuration} bulan`;

        Alert.alert(
          "Berhasil! 🎉",
          `Lisensi ${durationText} untuk "${course.title}" berhasil dibeli!` +
            `\n\n💰 Total: ${totalPriceETH} ETH (≈ ${formatRupiah(
              estimatedPriceIDR
            )})` +
            `\n📋 Transaction: ${result.transactionHash?.slice(0, 10)}...` +
            `\n⏰ Berlaku hingga: ${
              result.expiryTimestamp
                ? new Date(
                    Number(result.expiryTimestamp) * 1000
                  ).toLocaleDateString("id-ID")
                : "Tidak diketahui"
            }`,
          [
            {
              text: "Lihat Kursus Saya",
              onPress: () => navigation.navigate("MyCourses"),
            },
            {
              text: "Mulai Belajar",
              onPress: () => {
                navigation.navigate("CourseDetail", {
                  courseId: course.id,
                  courseTitle: course.title,
                });
              },
            },
            { text: "OK", style: "default" },
          ]
        );

        // ✅ Enhanced data refresh
        await Promise.allSettled([
          refetchUserCourses(),
          refetchLicense(), // Refresh license status for current course
          smartContractService.clearAllCaches(), // Clear caches for fresh data
        ]);

        setModalVisible(false);
      } else {
        throw new Error(result.error || "Gagal membeli lisensi");
      }
    } catch (error) {
      console.error("❌ License minting error:", error);

      let errorMessage = "Terjadi kesalahan saat membeli lisensi.";

      if (
        error.message.includes("rejected") ||
        error.message.includes("denied")
      ) {
        errorMessage = "Transaksi dibatalkan oleh pengguna.";
      } else if (error.message.includes("insufficient")) {
        errorMessage = "Saldo ETH tidak cukup untuk membeli lisensi.";
      } else if (error.message.includes("Course not found")) {
        errorMessage = "Course tidak ditemukan.";
      } else if (error.message.includes("Course is not active")) {
        errorMessage = "Course sudah tidak aktif.";
      } else if (error.message.includes("Duration must be positive")) {
        errorMessage = "Durasi harus lebih dari 0 bulan.";
      } else if (error.message.includes("Maximum 12 months")) {
        errorMessage = "Durasi maksimal 12 bulan per transaksi.";
      } else if (error.message.includes("No valid License")) {
        errorMessage = "Anda sudah memiliki lisensi untuk course ini.";
      }

      Alert.alert("Gagal", errorMessage);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Jelajahi Kursus</Text>
        <Text style={styles.headerSubtitle}>
          Temukan pengetahuan baru di blockchain
        </Text>
        {courses.length > 0 && (
          <Text style={styles.coursesCount}>
            {courses.length} kursus tersedia
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

  // ✅ Enhanced render item dengan error handling
  const renderItem = ({ item }) => {
    try {
      // ✅ Enhanced price calculation
      const priceInEth = parseFloat(item.pricePerMonth || "0");
      const priceInIdr =
        ethToIdrRate && !rateLoading ? priceInEth * ethToIdrRate : 0;

      return (
        <CourseCard
          course={item}
          onDetailPress={handleOpenDetail}
          priceInIdr={formatRupiah(priceInIdr)}
          priceLoading={rateLoading || modalInteracting}
          hidePrice={false}
        />
      );
    } catch (error) {
      console.error("Error rendering course card:", error);
      return null;
    }
  };

  // ✅ Enhanced empty state
  const renderEmptyState = () => (
    <View style={styles.centered}>
      <Ionicons
        name={coursesError ? "warning-outline" : "library-outline"}
        size={50}
        color={coursesError ? "#ef4444" : "#cbd5e1"}
      />
      <Text style={styles.emptyTitle}>
        {coursesError ? "Gagal Memuat Kursus" : "Belum Ada Kursus"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {coursesError
          ? "Terjadi kesalahan saat mengambil data dari blockchain"
          : "Cek kembali nanti untuk kursus baru."}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Ionicons name="refresh-outline" size={16} color="#8b5cf6" />
        <Text style={styles.retryText}>Coba Lagi</Text>
      </TouchableOpacity>
    </View>
  );

  // ✅ Enhanced footer untuk pagination
  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footerLoader}>
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={handleLoadMore}
        >
          <Text style={styles.loadMoreText}>Muat Lebih Banyak</Text>
          <Ionicons name="chevron-down-outline" size={16} color="#8b5cf6" />
        </TouchableOpacity>
      </View>
    );
  };

  // ✅ FIXED: Enhanced price calculation untuk modal dengan duration support
  const calculateModalPrice = (duration = 1) => {
    if (!selectedCourse || !ethToIdrRate) return "Menghitung...";

    const priceInEth = parseFloat(selectedCourse.pricePerMonth || "0");

    if (priceInEth === 0) return "Gratis";

    // ✅ Apply discount logic same as CourseDetailModal
    const originalTotal = priceInEth * duration;

    // Discount tiers (same as DURATION_OPTIONS in CourseDetailModal)
    let discount = 0;
    if (duration === 3) discount = 10;
    else if (duration === 6) discount = 15;
    else if (duration === 12) discount = 25;

    const finalTotal = originalTotal * (1 - discount / 100);
    const totalPriceInIdr = finalTotal * ethToIdrRate;

    return formatRupiah(totalPriceInIdr);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      {renderHeader()}

      {coursesLoading && !courses.length ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>
            Mengambil data dari blockchain...
          </Text>
          <Text style={styles.loadingSubtext}>
            Memproses {pagination.limit} kursus pertama
          </Text>
        </View>
      ) : (
        <FlatList
          data={courses?.filter((c) => c.isActive) || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onRefresh={handleRefresh}
          refreshing={coursesLoading}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true} // ✅ Performance optimization
          maxToRenderPerBatch={10} // ✅ Performance optimization
          windowSize={10} // ✅ Performance optimization
        />
      )}

      <CourseDetailModal
        visible={modalVisible}
        course={selectedCourse}
        onClose={() => {
          setModalVisible(false);
          setModalInteracting(false);
          if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current);
            modalTimeoutRef.current = null;
          }
        }}
        onMintLicense={handleMintLicense} // ✅ Now properly handles duration
        isMinting={mintLoading}
        priceCalculator={calculateModalPrice} // ✅ Enhanced with discount calculation
        priceLoading={rateLoading}
        hasLicense={hasLicense}
        licenseData={licenseData} // ✅ Pass license details
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
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#94a3b8",
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
