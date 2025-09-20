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
    maximumFractionDigits: 0,
  }).format(number);
};

// ✅ Updated ETH price fetching with React Native compatible timeout
const fetchWithTimeout = async (url, timeout = 5000) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout)
    ),
  ]);
};

const fetchEthPriceInIDR = async (retries = 3) => {
  const endpoints = [
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr",
    "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", // Backup
  ];

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Try CoinGecko first
      const response = await fetchWithTimeout(endpoints[0], 5000);

      if (response.ok) {
        const data = await response.json();
        if (data?.ethereum?.idr) {
          return data.ethereum.idr;
        }
      }
    } catch (error) {
      console.log(`CoinGecko attempt ${attempt + 1} failed, trying Binance...`);

      try {
        // Try Binance as backup
        const binanceResponse = await fetchWithTimeout(endpoints[1], 5000);

        if (binanceResponse.ok) {
          const binanceData = await binanceResponse.json();
          if (binanceData?.price) {
            // Convert USDT to IDR (approximate rate)
            const usdToIdr = 15500; // You could fetch this rate too
            return parseFloat(binanceData.price) * usdToIdr;
          }
        }
      } catch (binanceError) {
        console.log(`Binance attempt ${attempt + 1} also failed`);
      }
    }

    // Wait before retry
    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Return fallback price
  console.log("Using fallback ETH price");
  return 55000000; // Fallback: ~$3,550 USD * 15,500 IDR/USD
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
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);

  // Refs for cleanup
  const priceUpdateInterval = useRef(null);
  const isMounted = useRef(true);

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

  // ✅ Enhanced ETH price fetching
  const updateEthPrice = useCallback(async () => {
    try {
      setRateLoading(true);
      const price = await fetchEthPriceInIDR();

      if (isMounted.current) {
        setEthToIdrRate(price);
        setLastPriceUpdate(new Date());
        console.log("✅ ETH price updated:", formatRupiah(price));
      }
    } catch (error) {
      console.error("Failed to update ETH price:", error);
    } finally {
      if (isMounted.current) {
        setRateLoading(false);
      }
    }
  }, []);

  // Initial price fetch and interval setup
  useEffect(() => {
    isMounted.current = true;

    // Initial fetch
    updateEthPrice();

    // Set up interval for price updates (every 5 minutes)
    priceUpdateInterval.current = setInterval(updateEthPrice, 5 * 60 * 1000);

    return () => {
      isMounted.current = false;
      if (priceUpdateInterval.current) {
        clearInterval(priceUpdateInterval.current);
      }
    };
  }, [updateEthPrice]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    await Promise.allSettled([
      refetchCourses(),
      updateEthPrice(),
      refetchUserCourses(),
    ]);

    setRefreshing(false);
  }, [refetchCourses, updateEthPrice, refetchUserCourses]);

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

  // ✅ Enhanced mint license handler
  const handleMintLicense = async (course, selectedDuration = 1) => {
    if (!isOnMantaNetwork) {
      Alert.alert(
        "Jaringan Salah",
        "Silakan beralih ke Manta Pacific Testnet untuk membeli lisensi.\n\nAnda dapat mengubah jaringan di wallet Anda.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    if (!isInitialized) {
      Alert.alert(
        "Belum Siap",
        "Smart contract masih dalam proses inisialisasi. Mohon tunggu sebentar.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    if (!address) {
      Alert.alert(
        "Wallet Tidak Terhubung",
        "Silakan hubungkan wallet Anda terlebih dahulu.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    try {
      console.log(
        `🎫 Minting license: Course ${course.id}, Duration: ${selectedDuration} month(s)`
      );

      // Show processing state
      Alert.alert(
        "Memproses Pembelian",
        "Mohon ikuti instruksi di wallet Anda untuk menyelesaikan transaksi.\n\nJangan tutup aplikasi selama proses berlangsung.",
        [{ text: "OK" }]
      );

      const result = await mintLicense(course.id, selectedDuration);

      if (result.success) {
        // Success alert with options
        Alert.alert(
          "Berhasil! 🎉",
          `Selamat! Anda telah berhasil membeli lisensi untuk "${course.title}".\n\nLisensi berlaku selama ${selectedDuration} bulan.`,
          [
            {
              text: "Lihat Kursus Saya",
              onPress: () => {
                setModalVisible(false);
                navigation.navigate("MyCourses");
              },
            },
            {
              text: "OK",
              style: "default",
              onPress: () => setModalVisible(false),
            },
          ]
        );

        // Refresh data
        await Promise.allSettled([refetchUserCourses(), refetchLicense()]);
      } else {
        throw new Error(result.error || "Gagal membeli lisensi");
      }
    } catch (error) {
      console.error("❌ License minting error:", error);

      let errorTitle = "Pembelian Gagal";
      let errorMessage = "Terjadi kesalahan saat membeli lisensi.";

      // Enhanced error handling for Indonesian users
      if (
        error.message?.includes("rejected") ||
        error.message?.includes("denied") ||
        error.message?.includes("User rejected")
      ) {
        errorTitle = "Transaksi Dibatalkan";
        errorMessage =
          "Anda membatalkan transaksi. Silakan coba lagi jika ingin melanjutkan.";
      } else if (error.message?.includes("insufficient funds")) {
        errorTitle = "Saldo Tidak Cukup";
        errorMessage =
          "Saldo ETH Anda tidak mencukupi untuk pembelian ini.\n\nPastikan Anda memiliki cukup ETH untuk harga kursus dan gas fee.";
      } else if (error.message?.includes("Course doesn't exist")) {
        errorTitle = "Kursus Tidak Ditemukan";
        errorMessage =
          "Kursus yang Anda pilih tidak ditemukan. Silakan refresh halaman.";
      } else if (error.message?.includes("Course is not active")) {
        errorTitle = "Kursus Tidak Aktif";
        errorMessage =
          "Kursus ini sedang tidak aktif. Silakan pilih kursus lain.";
      } else if (error.message?.includes("network")) {
        errorTitle = "Masalah Jaringan";
        errorMessage =
          "Terjadi masalah dengan jaringan blockchain. Silakan coba lagi.";
      }

      Alert.alert(errorTitle, errorMessage, [{ text: "OK", style: "default" }]);
    }
  };

  // ✅ Price calculator for modal
  const calculateModalPrice = useCallback(
    (duration = 1) => {
      if (!selectedCourse || !ethToIdrRate) return "Menghitung...";

      const priceInEth = parseFloat(selectedCourse.pricePerMonth || "0");
      if (priceInEth === 0) return "Gratis";

      const originalTotal = priceInEth * duration;

      // Apply discounts based on duration
      let discount = 0;
      if (duration === 3) discount = 10;
      else if (duration === 6) discount = 15;
      else if (duration === 12) discount = 25;

      const finalTotal = originalTotal * (1 - discount / 100);
      const totalPriceInIdr = finalTotal * ethToIdrRate;

      return formatRupiah(totalPriceInIdr);
    },
    [selectedCourse, ethToIdrRate]
  );

  // ✅ Enhanced header with price update indicator
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Jelajahi Kursus</Text>
        <Text style={styles.headerSubtitle}>
          Belajar blockchain dengan mudah
        </Text>
        {courses.length > 0 && (
          <Text style={styles.coursesCount}>
            {courses.length} kursus tersedia
          </Text>
        )}
      </View>
      <View style={styles.headerRight}>
        {!isOnMantaNetwork && isConnected && (
          <View style={styles.networkWarning}>
            <Ionicons name="warning-outline" size={14} color="#92400e" />
          </View>
        )}
        {lastPriceUpdate && (
          <TouchableOpacity
            style={styles.priceUpdateBadge}
            onPress={updateEthPrice}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={12} color="#64748b" />
            <Text style={styles.priceUpdateText}>
              {new Date(lastPriceUpdate).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
        {coursesError ? "Gagal Memuat Kursus" : "Belum Ada Kursus"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {coursesError
          ? "Terjadi kesalahan saat memuat data blockchain"
          : "Silakan cek kembali nanti untuk kursus baru."}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Ionicons name="refresh-outline" size={16} color="#8b5cf6" />
        <Text style={styles.retryText}>Coba Lagi</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footerLoader}>
        <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
          <Text style={styles.loadMoreText}>Muat Lebih Banyak</Text>
          <Ionicons name="chevron-down-outline" size={16} color="#8b5cf6" />
        </TouchableOpacity>
      </View>
    );
  };

  // Show loading state
  if (!isInitialized && coursesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Menghubungkan ke blockchain...</Text>
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
          setSelectedCourse(null);
        }}
        onMintLicense={handleMintLicense}
        isMinting={mintLoading}
        priceCalculator={calculateModalPrice}
        priceLoading={rateLoading}
        hasLicense={hasLicense}
        licenseData={licenseData}
        licenseLoading={licenseLoading}
        ethToIdrRate={ethToIdrRate}
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
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 8,
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
  priceUpdateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceUpdateText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
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
