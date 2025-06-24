// src/screens/DashboardScreen.js - Fixed Dashboard with proper Text wrapping
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

  // State untuk license checking yang dioptimasi
  const [licenseStatus, setLicenseStatus] = useState({});
  const [licenseLoading, setLicenseLoading] = useState(false);

  // Blockchain hooks
  const {
    courses,
    loading: coursesLoading,
    error: coursesError,
    refetch: refetchCourses,
  } = useCourses();
  const { mintLicense, loading: mintLoading } = useMintLicense();
  const { refetch: refetchUserCourses, enrolledCourses } = useUserCourses();
  const { smartContractService, isInitialized } = useSmartContract();

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  // Mengambil kurs ETH ke IDR saat komponen dimuat
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

  useEffect(() => {
    fetchEthPriceInIdr();
  }, [fetchEthPriceInIdr]);

  const handleRefresh = useCallback(() => {
    refetchCourses();
    fetchEthPriceInIdr();
  }, [refetchCourses, fetchEthPriceInIdr]);

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }
    };
  }, []);

  // Optimized license checking function
  const checkLicenseForCourse = useCallback(
    async (courseId) => {
      if (!address || !courseId || !smartContractService || !isInitialized) {
        return false;
      }

      // Check cache first
      if (licenseStatus[courseId] !== undefined) {
        return licenseStatus[courseId];
      }

      try {
        setLicenseLoading(true);
        const hasLicense = await smartContractService.hasValidLicense(
          address,
          courseId
        );

        // Update cache
        setLicenseStatus((prev) => ({
          ...prev,
          [courseId]: hasLicense,
        }));

        return hasLicense;
      } catch (error) {
        console.error("Error checking license:", error);
        return false;
      } finally {
        setLicenseLoading(false);
      }
    },
    [address, licenseStatus, smartContractService, isInitialized]
  );

  const handleOpenDetail = (course) => {
    if (modalInteracting) {
      console.log(
        "Modal interaction already in progress, preventing duplicate press"
      );
      return;
    }

    console.log("Opening course detail modal:", course.id);
    setModalInteracting(true);

    // Clear any existing timeout
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
    }

    // Show modal immediately untuk improve responsiveness
    setSelectedCourse(course);
    setModalVisible(true);

    // Check license in background (parallel, not blocking)
    checkLicenseForCourse(course.id);

    // Reset interaction state dengan timeout yang lebih panjang
    modalTimeoutRef.current = setTimeout(() => {
      setModalInteracting(false);
      modalTimeoutRef.current = null;
    }, 1500); // Increased from 300ms to 1500ms
  };

  const handleMintLicense = async (course, selectedDuration = 1) => {
    if (!isOnMantaNetwork) {
      Alert.alert(
        "Jaringan Salah",
        "Silakan pindah ke Manta Pacific Testnet untuk membeli lisensi."
      );
      return;
    }
    try {
      const result = await mintLicense(course.id, selectedDuration);
      if (result.success) {
        const durationText =
          selectedDuration === 1 ? "1 bulan" : `${selectedDuration} bulan`;
        Alert.alert(
          "Berhasil!",
          `Lisensi ${durationText} untuk "${course.title}" berhasil dibeli.`
        );

        // Refresh data dan cache
        refetchUserCourses(); // Refresh data kursus pengguna

        // Update license cache to reflect new purchase
        setLicenseStatus((prev) => ({
          ...prev,
          [course.id]: true,
        }));

        setModalVisible(false); // Tutup modal setelah berhasil
        navigation.navigate("MyCourses");
      } else {
        Alert.alert("Gagal", result.error || "Gagal membeli lisensi.");
      }
    } catch (error) {
      console.error("Error minting license:", error);
      Alert.alert("Gagal", "Terjadi kesalahan saat membeli lisensi.");
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Jelajahi Kursus</Text>
        <Text style={styles.headerSubtitle}>
          Temukan pengetahuan baru di dunia blockchain
        </Text>
      </View>
      {!isOnMantaNetwork && isConnected && (
        <View style={styles.networkWarning}>
          <Ionicons name="warning-outline" size={14} color="#92400e" />
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }) => {
    // PERBAIKAN: Langsung gunakan `item.pricePerMonth` karena sudah dalam format ETH (string desimal) dari service.
    // Tidak perlu memanggil `ethers.formatEther` lagi.
    const priceInEth = parseFloat(item.pricePerMonth || "0");
    const priceInIdr = ethToIdrRate ? priceInEth * ethToIdrRate : 0;
    return (
      <CourseCard
        course={item}
        onDetailPress={handleOpenDetail}
        priceInIdr={formatRupiah(priceInIdr)}
        priceLoading={rateLoading || modalInteracting}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.centered}>
      <Ionicons name="library-outline" size={50} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>
        {coursesError ? "Gagal Memuat" : "Belum Ada Kursus"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {coursesError
          ? coursesError.message
          : "Cek kembali nanti untuk kursus baru."}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryText}>Coba Lagi</Text>
      </TouchableOpacity>
    </View>
  );

  const calculateModalPrice = () => {
    if (!selectedCourse || !ethToIdrRate) return "Menghitung...";
    // PERBAIKAN: Sama seperti di renderItem, langsung gunakan nilai yang ada.
    const priceInEth = parseFloat(selectedCourse.pricePerMonth || "0");
    const priceInIdr = priceInEth * ethToIdrRate;
    return formatRupiah(priceInIdr);
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
        </View>
      ) : (
        <FlatList
          data={courses?.filter((c) => c.isActive) || []} // Fixed: Add null check and fallback to empty array
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          onRefresh={handleRefresh}
          refreshing={coursesLoading}
        />
      )}
      <CourseDetailModal
        visible={modalVisible}
        course={selectedCourse}
        onClose={() => {
          setModalVisible(false);
          setModalInteracting(false); // Reset interaction state when modal closes
          if (modalTimeoutRef.current) {
            clearTimeout(modalTimeoutRef.current);
            modalTimeoutRef.current = null;
          }
        }}
        onMintLicense={handleMintLicense}
        isMinting={mintLoading}
        priceInIdr={calculateModalPrice()}
        priceLoading={rateLoading}
        hasLicense={
          selectedCourse ? licenseStatus[selectedCourse.id] || false : false
        }
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
  },
  retryButton: {
    backgroundColor: "#ede9fe",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#8b5cf6",
    fontWeight: "600",
  },
});
