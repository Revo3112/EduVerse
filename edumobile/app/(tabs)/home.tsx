import {
  StyleSheet,
  Image,
  View,
  SafeAreaView,
  Platform,
  StatusBar,
  Pressable,
  Modal,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Dimensions,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { HelloWave } from "@/components/HelloWave";
import { ThemedText } from "@/components/ThemedText";
import {
  ConnectEmbed,
  lightTheme,
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
} from "thirdweb/react";
import { client } from "@/constants/thirdweb";
import { createWallet } from "thirdweb/wallets";
import { useState, useEffect } from "react";
import { shortenAddress } from "thirdweb/utils";
import { mantaPacificTestnet } from "thirdweb/chains";
import {
  getUserEmail,
  hasStoredPasskey,
  inAppWallet,
} from "thirdweb/wallets/in-app";

// Define supported wallets directly in this file, following the pattern in index.tsx
const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "facebook",
        "discord",
        "telegram",
        "email",
        "phone",
        "passkey",
      ],
      passkeyDomain: "thirdweb.com",
    },
    smartAccount: {
      chain: mantaPacificTestnet,
      sponsorGas: true,
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet", {
    appMetadata: { name: "EduVerse" },
    mobileConfig: {
      callbackURL: Platform.OS === "web" ? window.location.href : "eduverse://",
    },
  }),
  createWallet("me.rainbow"),
  createWallet("com.trustwallet.app"),
  createWallet("io.zerion.wallet"),
];

// Mock data untuk kursus sesuai dengan smart contract CourseFactory
const courses = [
  {
    id: 1,
    title: "How to become master in fullstack developer",
    description:
      "Kursus komprehensif tentang pengembangan fullstack. Mulai dari dasar hingga mahir dalam React, Node.js, dan database. Cocok untuk pemula yang ingin menjadi developer profesional.",
    thumbnailURI: "https://picsum.photos/400/250?random=1",
    creator: "0x3a4edb4d1", // Smart contract hanya menyimpan address
    creatorName: "Dr. Talking Tom, Developer and...", // Nama creator (frontend only)
    pricePerMonth: "15000000000000000", // 0.015 ETH dalam wei
    isActive: true,
    createdAt: 1718448000, // Unix timestamp
  },
  {
    id: 2,
    title: "Advanced Solidity and Smart Contract Security",
    description:
      "Pelajari teknik keamanan smart contract terkini dan cara mengoptimalkan kode Solidity. Kursus ini mencakup audit keamanan, penanganan vulnerability, dan implementasi pattern terbaik.",
    thumbnailURI: "https://picsum.photos/400/250?random=2",
    creator: "0x9c8fa2e3",
    creatorName: "Jane Doe, Blockchain Expert",
    pricePerMonth: "20000000000000000", // 0.02 ETH dalam wei
    isActive: true,
    createdAt: 1718361600,
  },
  {
    id: 3,
    title: "Building a Decentralized Exchange (DEX)",
    description:
      "Bangun DEX Anda sendiri dari awal dengan Solidity dan Web3. Memahami mekanisme AMM, likuiditas, swap token, dan integrasi frontend dengan kontrak pintar.",
    thumbnailURI: "https://picsum.photos/400/250?random=3",
    creator: "0x7d6cf8g9",
    creatorName: "John Smith, DeFi Architect",
    pricePerMonth: "18000000000000000", // 0.018 ETH dalam wei
    isActive: true,
    createdAt: 1718275200,
  },
  {
    id: 4,
    title: "React Native Mobile Development",
    description:
      "Kursus komprehensif tentang pengembangan aplikasi mobile dengan React Native. Belajar membuat UI yang menarik, state management, integrasi API, dan publikasi ke app store.",
    thumbnailURI: "https://picsum.photos/400/250?random=4",
    creator: "0x1b2cd3e4",
    creatorName: "Sarah Johnson, Mobile Expert",
    pricePerMonth: "12000000000000000", // 0.012 ETH dalam wei
    isActive: true,
    createdAt: 1718188800,
  },
];

/**
 * Mengonversi harga dari wei ke Rupiah
 */
const formatPriceInRupiah = (wei: string): string => {
  const MOCK_ETH_TO_IDR_RATE = 55000000; // 1 ETH = 55 Juta IDR
  const priceInEth = parseFloat(wei) / 1e18;
  const priceInIdr = priceInEth * MOCK_ETH_TO_IDR_RATE;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(priceInIdr);
};

// Interface untuk course, disesuaikan dengan struct Course pada smart contract
interface Course {
  id: number;
  title: string;
  description: string;
  thumbnailURI: string;
  creator: string; // alamat blockchain creator
  creatorName: string; // nama untuk display (frontend only)
  pricePerMonth: string;
  isActive: boolean;
  createdAt: number;
}

// Komponen CourseCard
const CourseCard = ({
  course,
  onDetailPress,
}: {
  course: Course;
  onDetailPress: (course: Course) => void;
}) => {
  return (
    <View style={styles.courseCard}>
      <Image
        source={{ uri: course.thumbnailURI }}
        style={styles.courseImage}
        resizeMode="cover"
      />
      <View style={styles.courseInfo}>
        <ThemedText style={styles.courseTitle} numberOfLines={2}>
          {course.title}
        </ThemedText>
        <ThemedText style={styles.creatorName} numberOfLines={1}>
          {course.creatorName}
        </ThemedText>

        <View style={styles.courseCardFooter}>
          <View style={styles.priceContainer}>
            <ThemedText style={styles.coursePrice}>
              {formatPriceInRupiah(course.pricePerMonth)}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => onDetailPress(course)}
          >
            <ThemedText style={styles.detailButtonText}>Detail</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const Home = () => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCourseDetailModal, setShowCourseDetailModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const [email, setEmail] = useState<string | undefined>();

  // Get email for inApp wallet
  useEffect(() => {
    if (wallet && wallet.id === "inApp") {
      getUserEmail({ client }).then(setEmail);
    }
  }, [wallet]);

  // Close modal when connected
  useEffect(() => {
    if (wallet && account) {
      setShowConnectModal(false);
    }
  }, [wallet, account]);

  // Handler untuk tombol detail course
  const handleCourseDetail = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseDetailModal(true);
  };

  // Handler untuk tombol get license
  const handleGetLicense = () => {
    if (!account) {
      setShowConnectModal(true);
      return;
    }

    if (selectedCourse) {
      // TODO: Implementasi interaksi smart contract untuk mendapatkan lisensi
      alert(`Memproses lisensi untuk kursus: ${selectedCourse.title}`);
      // Di sini nantinya akan ada logika untuk berinteraksi dengan smart contract
    }
  };

  // Render connect or wallet button
  const renderWalletButton = () => {
    if (account && wallet) {
      return (
        <Pressable
          style={styles.connectedWalletButton}
          onPress={() => setShowAccountModal(true)}
        >
          <View style={styles.walletIconContainer}>
            <View style={styles.walletIcon}>
              <ThemedText style={styles.walletIconText}>
                {wallet.id === "inApp"
                  ? "E"
                  : wallet.id.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          </View>
        </Pressable>
      );
    } else {
      return (
        <Pressable
          style={styles.connectWalletButton}
          onPress={() => setShowConnectModal(true)}
        >
          <ThemedText style={styles.connectButtonText}>
            Connect Wallet
          </ThemedText>
        </Pressable>
      );
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <View style={styles.titleContainer}>
          <HelloWave />
          <ThemedText type="title">EduVerse</ThemedText>
        </View>
        {renderWalletButton()}
      </ThemedView>

      {/* Main Content */}
      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          <ThemedText style={styles.sectionTitle}>Explore Courses</ThemedText>{" "}
          <FlatList
            data={courses.filter((course) => course.isActive)}
            renderItem={({ item }) => (
              <CourseCard course={item} onDetailPress={handleCourseDetail} />
            )}
            keyExtractor={(item) => item.id.toString()}
            numColumns={1}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.coursesContainer}
          />
        </View>
      </ScrollView>

      {/* Connect Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={showConnectModal}
        onRequestClose={() => setShowConnectModal(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <ThemedText style={styles.modalTitle}>
                  ✨ Connect to EduVerse
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setShowConnectModal(false)}
                style={styles.closeButton}
              >
                <ThemedText style={styles.closeButtonText}>×</ThemedText>
              </Pressable>
            </View>
            <View style={styles.connectEmbedContainer}>
              <ConnectEmbed
                client={client}
                chain={mantaPacificTestnet}
                wallets={wallets}
                theme={lightTheme({
                  colors: {
                    primaryButtonBg: "#F9F4FF",
                    modalBg: "#FFFFFF",
                    borderColor: "#B76DE8",
                    accentButtonBg: "#9747FF",
                    primaryText: "#9747FF",
                    secondaryIconColor: "#9747FF",
                    secondaryText: "#7E6F96",
                    secondaryButtonBg: "#9747FF",
                    connectedButtonBg: "#F9F4FF",
                    connectedButtonBgHover: "#EFE6FF",
                  },
                })}
                onConnect={() => setShowConnectModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Details Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={showAccountModal}
        onRequestClose={() => setShowAccountModal(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.accountModalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Account Details</ThemedText>
              <Pressable
                onPress={() => setShowAccountModal(false)}
                style={styles.closeButton}
              >
                <ThemedText style={styles.closeButtonText}>×</ThemedText>
              </Pressable>
            </View>
            {account && wallet && (
              <View style={styles.accountDetailsContainer}>
                <View style={styles.accountInfoSection}>
                  <ThemedText style={styles.accountInfoLabel}>
                    Wallet
                  </ThemedText>
                  <ThemedText style={styles.accountInfoValue}>
                    {wallet.id}
                  </ThemedText>
                </View>
                <View style={styles.accountInfoSection}>
                  <ThemedText style={styles.accountInfoLabel}>
                    Address
                  </ThemedText>
                  <ThemedText style={styles.accountInfoValue}>
                    {shortenAddress(account.address)}
                  </ThemedText>
                </View>
                {email && (
                  <View style={styles.accountInfoSection}>
                    <ThemedText style={styles.accountInfoLabel}>
                      Email
                    </ThemedText>
                    <ThemedText style={styles.accountInfoValue}>
                      {email}
                    </ThemedText>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={() => {
                    disconnect(wallet);
                    setShowAccountModal(false);
                  }}
                >
                  <ThemedText style={styles.disconnectButtonText}>
                    Disconnect
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>{" "}
      </Modal>

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
              <ThemedText style={styles.modalTitle}>Detail Kursus</ThemedText>
              <Pressable
                onPress={() => setShowCourseDetailModal(false)}
                style={styles.closeButton}
              >
                <ThemedText style={styles.closeButtonText}>×</ThemedText>
              </Pressable>
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
                  <ThemedText style={styles.courseDetailTitle}>
                    {selectedCourse.title}
                  </ThemedText>

                  <ThemedText style={styles.courseDetailCreator}>
                    Dibuat oleh: {selectedCourse.creatorName}
                  </ThemedText>

                  <View style={styles.courseDetailSection}>
                    <ThemedText style={styles.courseDetailSectionTitle}>
                      Deskripsi
                    </ThemedText>
                    <ThemedText style={styles.courseDetailDescription}>
                      {selectedCourse.description}
                    </ThemedText>
                  </View>

                  <View style={styles.courseDetailInfoBox}>
                    <View style={styles.courseDetailInfoItem}>
                      <ThemedText style={styles.courseDetailInfoLabel}>
                        Harga
                      </ThemedText>
                      <ThemedText style={styles.courseDetailInfoValue}>
                        {formatPriceInRupiah(selectedCourse.pricePerMonth)}
                        /bulan
                      </ThemedText>
                    </View>

                    <View style={styles.courseDetailInfoItem}>
                      <ThemedText style={styles.courseDetailInfoLabel}>
                        ID Kursus
                      </ThemedText>
                      <ThemedText style={styles.courseDetailInfoValue}>
                        #{selectedCourse.id}
                      </ThemedText>
                    </View>

                    <View style={styles.courseDetailInfoItem}>
                      <ThemedText style={styles.courseDetailInfoLabel}>
                        Alamat Pembuat
                      </ThemedText>
                      <ThemedText style={styles.courseDetailInfoValue}>
                        {selectedCourse.creator}
                      </ThemedText>
                    </View>

                    <View style={styles.courseDetailInfoItem}>
                      <ThemedText style={styles.courseDetailInfoLabel}>
                        Tanggal Dibuat
                      </ThemedText>
                      <ThemedText style={styles.courseDetailInfoValue}>
                        {new Date(
                          selectedCourse.createdAt * 1000
                        ).toLocaleDateString("id-ID")}
                      </ThemedText>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.getLicenseButton}
                    onPress={handleGetLicense}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.getLicenseButtonText}>
                      Dapatkan Lisensi
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  titleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  connectWalletButton: {
    backgroundColor: "#F2E6FF",
    borderRadius: 9999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#9747FF",
    shadowColor: "#9747FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  connectButtonText: {
    color: "#8021FF",
    fontWeight: "600",
    fontSize: 16,
    textTransform: "lowercase",
  },
  connectedWalletButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  walletIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9747FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#9341CC",
    justifyContent: "center",
    alignItems: "center",
  },
  walletIconText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 440,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accountModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  modalTitleContainer: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#000000" },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#555",
    lineHeight: 24,
    textAlign: "center",
  },
  connectEmbedContainer: { width: "100%", padding: 16, height: 500 },
  accountDetailsContainer: { padding: 16 },
  accountInfoSection: { marginBottom: 16 },
  accountInfoLabel: { fontSize: 14, color: "#666", marginBottom: 4 },
  accountInfoValue: { fontSize: 16, color: "#333", fontWeight: "500" },
  disconnectButton: {
    backgroundColor: "#ff4d4f",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  disconnectButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 16 },

  // Course-related styles
  mainContent: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  coursesContainer: {
    paddingBottom: 20,
  },
  courseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  courseImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#e2e8f0",
  },
  courseInfo: {
    padding: 16,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 24,
  },
  creatorName: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  coursePrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  courseCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
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
    fontSize: 14,
  },

  // Course detail modal styles
  courseDetailModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  courseDetailScrollView: {
    maxHeight: "90%",
  },
  courseDetailImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#e2e8f0",
  },
  courseDetailContent: {
    padding: 20,
  },
  courseDetailTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 28,
  },
  courseDetailCreator: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  courseDetailSection: {
    marginBottom: 20,
  },
  courseDetailSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  courseDetailDescription: {
    fontSize: 15,
    lineHeight: 22,
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
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  courseDetailInfoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
  },
  getLicenseButton: {
    backgroundColor: "#8921ff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#9747FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  getLicenseButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default Home;
