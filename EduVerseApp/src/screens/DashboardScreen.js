// src/screens/DashboardScreen.js - Final Integrated Dashboard with Blockchain for React Native
import React, { useState, useEffect, useCallback } from "react";
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

  // State untuk kurs ETH -> IDR
  const [ethToIdrRate, setEthToIdrRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);

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

  const handleOpenDetail = (course) => {
    setSelectedCourse(course);
    setModalVisible(true);
  };

  const handleMintLicense = async (course) => {
    if (!isOnMantaNetwork) {
      Alert.alert(
        "Jaringan Salah",
        "Silakan pindah ke Manta Pacific Testnet untuk membeli lisensi."
      );
      return;
    }
    try {
      const result = await mintLicense(course.id, 1); // Mint untuk 1 bulan
      if (result.success) {
        Alert.alert(
          "Berhasil!",
          `Lisensi untuk "${course.title}" berhasil dibeli.`
        );
        refetchUserCourses(); // Refresh data kursus pengguna
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
        priceLoading={rateLoading}
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
          data={courses.filter((c) => c.isActive)} // Hanya tampilkan kursus yang aktif
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
        onClose={() => setModalVisible(false)}
        onMintLicense={handleMintLicense}
        isMinting={mintLoading}
        priceInIdr={calculateModalPrice()}
        priceLoading={rateLoading}
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
