// src/components/CourseDetailModal.js - Enhanced with duration selection and better UX

import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pinataService } from "../services/PinataService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Helper untuk format timestamp
const timeAgo = (timestamp) => {
  if (!timestamp) return "Baru saja";

  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return "Baru saja";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  if (diffInSeconds < 31536000)
    return `${Math.floor(diffInSeconds / 2592000)} bulan lalu`;
  return `${Math.floor(diffInSeconds / 31536000)} tahun lalu`;
};

// ✅ Duration options dengan discount
const DURATION_OPTIONS = [
  {
    months: 1,
    label: "1 Bulan",
    discount: 0,
    popular: false,
    description: "Akses selama 1 bulan",
  },
  {
    months: 3,
    label: "3 Bulan",
    discount: 10,
    popular: true,
    description: "Hemat 10% + akses extended",
  },
  {
    months: 6,
    label: "6 Bulan",
    discount: 15,
    popular: false,
    description: "Hemat 15% + bonus materi",
  },
  {
    months: 12,
    label: "1 Tahun",
    discount: 25,
    popular: false,
    description: "Hemat 25% + lifetime support",
  },
];

const CourseDetailModal = ({
  visible,
  course,
  onClose,
  onMintLicense,
  isMinting,
  priceCalculator, // ✅ Function untuk calculate price berdasarkan duration
  priceLoading,
  hasLicense,
  licenseData, // ✅ Detailed license information
  licenseLoading,
}) => {
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // ✅ Memoized course data
  const courseData = useMemo(() => {
    if (!course) return null;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnailCID: course.thumbnailCID,
      thumbnailUrl: course.thumbnailUrl,
      creator: course.creator,
      pricePerMonth: parseFloat(course.pricePerMonth || "0"),
      sectionsCount: course.sectionsCount || 0,
      createdAt: course.createdAt,
    };
  }, [course]);

  // ✅ Enhanced thumbnail loading
  useEffect(() => {
    let isMounted = true;

    const loadThumbnail = async () => {
      if (!courseData) return;

      try {
        setImageLoading(true);

        // Priority 1: Use pre-generated URL
        if (courseData.thumbnailUrl) {
          setThumbnailUrl(courseData.thumbnailUrl);
          return;
        }

        // Priority 2: Generate from CID
        if (courseData.thumbnailCID) {
          try {
            const optimizedUrl = await pinataService.getOptimizedFileUrl(
              courseData.thumbnailCID,
              {
                forcePublic: true,
                network: "public",
                width: 600,
                height: 360,
                format: "webp",
              }
            );

            if (isMounted && optimizedUrl) {
              setThumbnailUrl(optimizedUrl);
            }
          } catch (error) {
            // Fallback
            const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${courseData.thumbnailCID}`;
            if (isMounted) {
              setThumbnailUrl(fallbackUrl);
            }
          }
        }
      } catch (error) {
        console.error("Error loading modal thumbnail:", error);
      } finally {
        if (isMounted) {
          setImageLoading(false);
        }
      }
    };

    if (visible && courseData) {
      loadThumbnail();
    }

    return () => {
      isMounted = false;
    };
  }, [visible, courseData]);

  // ✅ Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setSelectedDuration(1);
      setShowFullDescription(false);
    }
  }, [visible]);

  // ✅ Memoized price calculations
  const priceInfo = useMemo(() => {
    if (!courseData || priceLoading) {
      return {
        loading: true,
        originalPrice: "Menghitung...",
        finalPrice: "Menghitung...",
        savings: null,
        pricePerMonth: "Menghitung...",
      };
    }

    const selectedOption = DURATION_OPTIONS.find(
      (opt) => opt.months === selectedDuration
    );
    const originalTotal = courseData.pricePerMonth * selectedDuration;
    const discount = selectedOption?.discount || 0;
    const finalTotal = originalTotal * (1 - discount / 100);
    const savings = originalTotal - finalTotal;

    return {
      loading: false,
      originalPrice: priceCalculator
        ? priceCalculator(selectedDuration)
        : `Rp ${(originalTotal * 55000000).toLocaleString("id-ID")}`,
      finalPrice: priceCalculator
        ? priceCalculator(selectedDuration)
        : `Rp ${(finalTotal * 55000000).toLocaleString("id-ID")}`,
      savings:
        savings > 0
          ? `Rp ${(savings * 55000000).toLocaleString("id-ID")}`
          : null,
      pricePerMonth: `Rp ${(courseData.pricePerMonth * 55000000).toLocaleString(
        "id-ID"
      )}/bulan`,
      discount: discount,
    };
  }, [courseData, selectedDuration, priceCalculator, priceLoading]);

  if (!visible || !courseData) return null;

  // ✅ Enhanced creator display
  const creatorDisplay = `${courseData.creator.slice(
    0,
    8
  )}...${courseData.creator.slice(-6)}`;

  // ✅ License status display
  const renderLicenseStatus = () => {
    if (licenseLoading) {
      return (
        <View style={styles.licenseStatus}>
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.licenseStatusText}>Memeriksa lisensi...</Text>
        </View>
      );
    }

    if (hasLicense) {
      const expiryDate = licenseData?.expiryTimestamp
        ? new Date(licenseData.expiryTimestamp).toLocaleDateString("id-ID")
        : "Tidak diketahui";

      return (
        <View style={[styles.licenseStatus, styles.licenseActive]}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={[styles.licenseStatusText, styles.licenseActiveText]}>
            Lisensi Aktif - Berlaku hingga {expiryDate}
          </Text>
        </View>
      );
    }

    return null;
  };

  // ✅ Duration selection component
  const renderDurationOptions = () => (
    <View style={styles.durationSection}>
      <Text style={styles.sectionTitle}>Pilih Durasi Lisensi</Text>
      <View style={styles.durationGrid}>
        {DURATION_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.months}
            style={[
              styles.durationOption,
              selectedDuration === option.months &&
                styles.durationOptionSelected,
              option.popular && styles.durationOptionPopular,
            ]}
            onPress={() => setSelectedDuration(option.months)}
          >
            {option.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>POPULER</Text>
              </View>
            )}

            <Text
              style={[
                styles.durationLabel,
                selectedDuration === option.months &&
                  styles.durationLabelSelected,
              ]}
            >
              {option.label}
            </Text>

            {option.discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{option.discount}%</Text>
              </View>
            )}

            <Text
              style={[
                styles.durationDescription,
                selectedDuration === option.months &&
                  styles.durationDescriptionSelected,
              ]}
            >
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ✅ Main action button
  const renderActionButton = () => {
    if (hasLicense) {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.accessButton]}>
          <Ionicons name="play-circle" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Mulai Belajar</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.actionButton,
          (isMinting || priceInfo.loading) && styles.actionButtonDisabled,
        ]}
        onPress={() => {
          if (courseData.pricePerMonth === 0) {
            // Free course
            onMintLicense(courseData, selectedDuration);
          } else {
            // Paid course - show confirmation
            Alert.alert(
              "Konfirmasi Pembelian",
              `Anda akan membeli lisensi ${
                DURATION_OPTIONS.find((opt) => opt.months === selectedDuration)
                  ?.label
              } untuk "${courseData.title}".\n\nTotal: ${priceInfo.finalPrice}${
                priceInfo.savings ? `\nHemat: ${priceInfo.savings}` : ""
              }`,
              [
                { text: "Batal", style: "cancel" },
                {
                  text: "Beli Sekarang",
                  onPress: () => onMintLicense(courseData, selectedDuration),
                  style: "default",
                },
              ]
            );
          }
        }}
        disabled={isMinting || priceInfo.loading}
      >
        {isMinting ? (
          <>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.actionButtonText}>Memproses...</Text>
          </>
        ) : (
          <>
            <Ionicons
              name={
                courseData.pricePerMonth === 0
                  ? "download-outline"
                  : "card-outline"
              }
              size={20}
              color="#ffffff"
            />
            <Text style={styles.actionButtonText}>
              {courseData.pricePerMonth === 0
                ? "Ambil Gratis"
                : `Beli ${priceInfo.finalPrice}`}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* ✅ Enhanced header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Kursus</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ✅ Enhanced course image */}
          <View style={styles.imageContainer}>
            {imageLoading ? (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator size="large" color="#8b5cf6" />
              </View>
            ) : thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.courseImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={50} color="#cbd5e1" />
              </View>
            )}

            {/* ✅ Course stats overlay */}
            <View style={styles.imageOverlay}>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="play-circle-outline"
                    size={16}
                    color="#ffffff"
                  />
                  <Text style={styles.statText}>
                    {courseData.sectionsCount} Video
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color="#ffffff" />
                  <Text style={styles.statText}>
                    ~{courseData.sectionsCount * 15} menit
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ✅ Course info */}
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>{courseData.title}</Text>

            <View style={styles.creatorInfo}>
              <Ionicons
                name="person-circle-outline"
                size={18}
                color="#8b5cf6"
              />
              <Text style={styles.creatorText}>oleh {creatorDisplay}</Text>
              <Text style={styles.createdTime}>
                • {timeAgo(courseData.createdAt)}
              </Text>
            </View>

            {renderLicenseStatus()}

            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Deskripsi</Text>
              <Text
                style={styles.description}
                numberOfLines={showFullDescription ? undefined : 3}
              >
                {courseData.description}
              </Text>
              {courseData.description.length > 100 && (
                <TouchableOpacity
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  style={styles.showMoreButton}
                >
                  <Text style={styles.showMoreText}>
                    {showFullDescription ? "Sembunyikan" : "Selengkapnya"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ✅ Only show duration options if no active license */}
            {!hasLicense &&
              courseData.pricePerMonth > 0 &&
              renderDurationOptions()}

            {/* ✅ Price summary */}
            {!hasLicense && (
              <View style={styles.priceSection}>
                <Text style={styles.sectionTitle}>Ringkasan Harga</Text>
                <View style={styles.priceDetails}>
                  {priceInfo.loading ? (
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  ) : (
                    <>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Harga per bulan</Text>
                        <Text style={styles.priceValue}>
                          {priceInfo.pricePerMonth}
                        </Text>
                      </View>

                      {selectedDuration > 1 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.priceLabel}>
                            Durasi ({selectedDuration} bulan)
                          </Text>
                          <Text style={styles.priceValue}>
                            {priceInfo.originalPrice}
                          </Text>
                        </View>
                      )}

                      {priceInfo.discount > 0 && (
                        <View style={styles.priceRow}>
                          <Text
                            style={[styles.priceLabel, styles.discountLabel]}
                          >
                            Diskon ({priceInfo.discount}%)
                          </Text>
                          <Text
                            style={[styles.priceValue, styles.discountValue]}
                          >
                            -{priceInfo.savings}
                          </Text>
                        </View>
                      )}

                      <View style={[styles.priceRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>
                          {priceInfo.finalPrice}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* ✅ Enhanced action section */}
        <View style={styles.actionSection}>{renderActionButton()}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    height: 220,
    backgroundColor: "#f1f5f9",
  },
  courseImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 16,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  courseInfo: {
    padding: 20,
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
    lineHeight: 30,
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  creatorText: {
    fontSize: 14,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  createdTime: {
    fontSize: 12,
    color: "#94a3b8",
  },
  licenseStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  licenseActive: {
    backgroundColor: "#ecfdf5",
  },
  licenseStatusText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  licenseActiveText: {
    color: "#10b981",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 22,
  },
  showMoreButton: {
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  durationSection: {
    marginBottom: 24,
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  durationOption: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    position: "relative",
  },
  durationOptionSelected: {
    borderColor: "#8b5cf6",
    backgroundColor: "#ede9fe",
  },
  durationOptionPopular: {
    borderColor: "#f59e0b",
  },
  popularBadge: {
    position: "absolute",
    top: -8,
    right: 8,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  durationLabelSelected: {
    color: "#8b5cf6",
  },
  discountBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  discountText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#16a34a",
  },
  durationDescription: {
    fontSize: 12,
    color: "#64748b",
  },
  durationDescriptionSelected: {
    color: "#7c3aed",
  },
  priceSection: {
    marginBottom: 24,
  },
  priceDetails: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  priceLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  priceValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  discountLabel: {
    color: "#16a34a",
  },
  discountValue: {
    color: "#16a34a",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  actionSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  accessButton: {
    backgroundColor: "#10b981",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export default CourseDetailModal;
