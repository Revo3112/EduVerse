// src/components/CourseDetailModal.js - Enhanced Floating Modal with Elegant Design
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Helper untuk format timestamp
const timeAgo = (timestamp) => {
  if (!timestamp) return "Tanggal tidak tersedia";
  const now = new Date();
  const past = new Date(timestamp);
  const seconds = Math.floor((now - past) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " tahun lalu";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " bulan lalu";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " hari lalu";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " jam lalu";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " menit lalu";
  return Math.floor(seconds) + " detik lalu";
};

const CourseDetailModal = ({
  visible,
  course,
  onClose,
  onMintLicense,
  isMinting,
  priceInIdr,
  priceLoading,
  hasLicense, // <-- Tambahkan prop ini
  licenseLoading, // <-- Tambahkan prop untuk loading state pengecekan lisensi
}) => {
  const scaleValue = new Animated.Value(0);
  const opacityValue = new Animated.Value(0);
  const [selectedDuration, setSelectedDuration] = React.useState(1);
  // Duration options with exact multiplier (matching smart contract logic)
  const durationOptions = [
    { months: 1, label: "1 Bulan", multiplier: 1 },
    { months: 3, label: "3 Bulan", multiplier: 3 }, // 3 months = 3x price
    { months: 6, label: "6 Bulan", multiplier: 6 }, // 6 months = 6x price
    { months: 12, label: "12 Bulan", multiplier: 12 }, // 12 months = 12x price
  ];
  React.useEffect(() => {
    if (visible) {
      // Reset duration selection when modal opens
      setSelectedDuration(1);
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  if (!course) return null;

  const creationDate = timeAgo(course.createdAt);
  const ethPrice = parseFloat(course.pricePerMonth || "0");
  const isFree = ethPrice === 0;

  // Calculate price based on selected duration
  const selectedOption = durationOptions.find(
    (opt) => opt.months === selectedDuration
  );
  const finalEthPrice = ethPrice * (selectedOption?.multiplier || 1);
  const finalIdrPrice =
    priceInIdr && !isFree
      ? parseFloat(priceInIdr.replace(/[^0-9]/g, "")) *
        (selectedOption?.multiplier || 1)
      : 0;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityValue }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ scale: scaleValue }],
                  opacity: opacityValue,
                },
              ]}
            >
              {/* Header dengan Gradient */}
              <View style={styles.modalHeader}>
                <View style={styles.headerContent}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                  <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                      Detail Kursus
                    </Text>
                    <View style={styles.courseIdBadge}>
                      <Text style={styles.courseIdText}>ID: {course.id}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <ScrollView
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Course Image dengan Overlay Info */}
                <View style={styles.imageContainer}>
                  <Image
                    source={{
                      uri:
                        course.thumbnailURI ||
                        "https://placehold.co/600x400/8B5CF6/FFFFFF/png?text=Course+Image",
                    }}
                    style={styles.courseImage}
                  />
                  <View style={styles.imageOverlay}>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusIndicator,
                          {
                            backgroundColor: course.isActive
                              ? "#22c55e"
                              : "#ef4444",
                          },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {course.isActive ? "Aktif" : "Nonaktif"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Main Content */}
                <View style={styles.contentSection}>
                  {/* Title */}
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  {/* Creator Info */}
                  <View style={styles.creatorSection}>
                    <View style={styles.creatorIcon}>
                      <Ionicons name="person" size={16} color="#8b5cf6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.creatorLabel}>Dibuat oleh</Text>
                      <Text
                        style={styles.creatorAddress}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {course.creator}
                      </Text>
                    </View>
                  </View>
                  {/* Stats Cards */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                      <Ionicons name="book-outline" size={20} color="#8b5cf6" />
                      <Text style={styles.statNumber}>
                        {course.sectionsCount !== undefined
                          ? course.sectionsCount
                          : "..."}
                      </Text>
                      <Text style={styles.statLabel}>Sesi</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                      <Text style={styles.statNumber}>
                        {creationDate === "Tanggal tidak tersedia"
                          ? "..."
                          : creationDate.split(" ")[0]}
                      </Text>
                      <Text style={styles.statLabel}>
                        {creationDate === "Tanggal tidak tersedia"
                          ? "Hari"
                          : creationDate.split(" ")[1] + " lalu"}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Ionicons
                        name="diamond-outline"
                        size={20}
                        color="#8b5cf6"
                      />
                      <Text style={styles.statNumber}>
                        {isFree ? "Gratis" : `${ethPrice.toFixed(4)}`}
                      </Text>
                      <Text style={styles.statLabel}>
                        {isFree ? "" : "ETH"}
                      </Text>
                    </View>
                  </View>
                  {/* Description */}
                  <View style={styles.descriptionSection}>
                    <Text style={styles.sectionTitle}>Deskripsi</Text>
                    <Text style={styles.description}>
                      {course.description ||
                        "Belum ada deskripsi untuk kursus ini."}
                    </Text>
                  </View>
                  {/* Blockchain Info */}
                  <View style={styles.blockchainInfo}>
                    <Text style={styles.sectionTitle}>
                      Informasi Blockchain
                    </Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Contract Address:</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {course.creator}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Harga per Bulan:</Text>
                      <Text style={styles.infoValue}>
                        {isFree ? "Gratis" : `${ethPrice.toFixed(6)} ETH`}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status:</Text>
                      <Text
                        style={[
                          styles.infoValue,
                          { color: course.isActive ? "#22c55e" : "#ef4444" },
                        ]}
                      >
                        {course.isActive ? "Aktif & Tersedia" : "Nonaktif"}
                      </Text>
                    </View>
                  </View>{" "}
                  {/* Tambahkan pesan lisensi di sini */}
                  {licenseLoading ? (
                    <View style={{ alignItems: "center", marginVertical: 8 }}>
                      <ActivityIndicator color="#8b5cf6" size="small" />
                      <Text
                        style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}
                      >
                        Mengecek status lisensi...
                      </Text>
                    </View>
                  ) : hasLicense ? (
                    <View
                      style={{
                        backgroundColor: "#dcfce7",
                        padding: 12,
                        borderRadius: 8,
                        marginVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: "#166534",
                          textAlign: "center",
                          fontWeight: "500",
                        }}
                      >
                        ✅ Anda sudah memiliki lisensi aktif untuk kursus ini.
                      </Text>
                    </View>
                  ) : null}
                  {/* Duration Selector - hanya tampil jika user belum punya lisensi */}
                  {!hasLicense && !licenseLoading && !isFree && (
                    <View style={styles.durationSection}>
                      <Text style={styles.durationTitle}>
                        Pilih Durasi Lisensi
                      </Text>
                      <View style={styles.durationOptions}>
                        {durationOptions.map((option) => (
                          <TouchableOpacity
                            key={option.months}
                            style={[
                              styles.durationOption,
                              selectedDuration === option.months &&
                                styles.durationOptionSelected,
                            ]}
                            onPress={() => setSelectedDuration(option.months)}
                          >
                            <Text
                              style={[
                                styles.durationOptionText,
                                selectedDuration === option.months &&
                                  styles.durationOptionTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Footer dengan Pricing */}
              <View style={styles.footer}>
                {" "}
                <View style={styles.priceSection}>
                  <Text style={styles.priceLabel}>
                    Harga Total{" "}
                    {!isFree && selectedDuration > 1
                      ? `(${selectedDuration} Bulan)`
                      : ""}
                  </Text>
                  <View style={styles.priceContainer}>
                    {priceLoading ? (
                      <ActivityIndicator color="#8b5cf6" size="small" />
                    ) : (
                      <>
                        <Text style={styles.priceMain}>
                          {!isFree && finalIdrPrice > 0
                            ? new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                minimumFractionDigits: 0,
                              }).format(finalIdrPrice)
                            : priceInIdr || "Gratis"}
                        </Text>
                        {!isFree && (
                          <Text style={styles.priceEth}>
                            ≈ {finalEthPrice.toFixed(4)} ETH
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </View>{" "}
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    (isMinting ||
                      !course.isActive ||
                      hasLicense ||
                      licenseLoading) &&
                      styles.purchaseButtonDisabled,
                  ]}
                  onPress={() => {
                    if (!hasLicense && !licenseLoading)
                      onMintLicense(course, selectedDuration);
                  }}
                  disabled={
                    isMinting ||
                    !course.isActive ||
                    hasLicense ||
                    licenseLoading
                  }
                >
                  {isMinting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : licenseLoading ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Text style={styles.purchaseButtonText}>
                        Mengecek lisensi...
                      </Text>
                    </View>
                  ) : hasLicense ? (
                    <Text style={styles.purchaseButtonText}>
                      Anda sudah memiliki lisensi aktif
                    </Text>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons name="diamond" size={20} color="#ffffff" />
                      <Text style={styles.purchaseButtonText}>
                        {isFree ? "Dapatkan Gratis" : "Beli Lisensi"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: screenWidth * 0.92,
    maxHeight: screenHeight * 0.85,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 25,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
  },
  modalHeader: {
    height: 80,
    backgroundColor: "#8b5cf6",
    position: "relative",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  courseIdBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  courseIdText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
  },
  courseImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f1f5f9",
  },
  imageOverlay: {
    position: "absolute",
    top: 15,
    right: 15,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  contentSection: {
    padding: 24,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
    lineHeight: 32,
  },
  creatorSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  creatorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  creatorLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  creatorAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "monospace",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
  },
  blockchainInfo: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748b",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    textAlign: "right",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  priceSection: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: "flex-start",
  },
  priceMain: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  priceEth: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  purchaseButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  purchaseButtonDisabled: {
    backgroundColor: "#cbd5e1",
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  purchaseButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  durationSection: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginVertical: 12,
  },
  durationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  durationOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  durationOption: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    minWidth: "48%",
    marginBottom: 8,
    alignItems: "center",
  },
  durationOptionSelected: {
    borderColor: "#8b5cf6",
    backgroundColor: "#f3f4f6",
  },
  durationOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  durationOptionTextSelected: {
    color: "#8b5cf6",
  },
  durationDiscount: {
    fontSize: 12,
    color: "#059669",
    marginTop: 4,
    fontWeight: "500",
  },
  durationDiscountSelected: {
    color: "#059669",
  },
});

export default CourseDetailModal;
