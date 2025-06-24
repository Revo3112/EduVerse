// src/components/CourseDetailModal.js - Course Detail Modal Component
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CourseDetailModal = ({
  visible,
  course,
  onClose,
  onMintLicense,
  isOnMantaNetwork = false,
}) => {
  const formatPrice = (price) => {
    if (typeof price === "number") {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(price);
    }
    return price;
  };

  const handleMintLicense = () => {
    if (!isOnMantaNetwork) {
      Alert.alert(
        "Network Error",
        "Please switch to Manta Pacific Testnet to mint license",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Mint License",
      `Are you sure you want to mint license for "${course?.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mint",
          onPress: () => {
            onMintLicense && onMintLicense(course);
            onClose();
          },
        },
      ]
    );
  };

  if (!course) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={["portrait", "landscape"]}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Course Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Course Image */}
            <Image
              source={{
                uri:
                  course.thumbnailURI ||
                  course.thumbnail ||
                  "https://picsum.photos/400/250?random=1",
              }}
              style={styles.courseDetailImage}
              resizeMode="cover"
            />

            <View style={styles.courseDetailContent}>
              {/* Category and Rating */}
              <View style={styles.courseDetailHeader}>
                {course.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{course.category}</Text>
                  </View>
                )}
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {course.rating || "N/A"}
                  </Text>
                </View>
              </View>

              {/* Course Title */}
              <Text style={styles.courseDetailTitle}>{course.title}</Text>

              {/* Creator */}
              <Text style={styles.courseDetailCreator}>
                👨‍🏫 {course.creatorName || course.instructor || "Unknown"}
              </Text>

              {/* Stats Row */}
              <View style={styles.courseStatsRow}>
                <View style={styles.statDetailItem}>
                  <Ionicons name="people" size={16} color="#9747FF" />
                  <Text style={styles.statDetailText}>
                    {course.students || 0} students
                  </Text>
                </View>
                <View style={styles.statDetailItem}>
                  <Ionicons name="time" size={16} color="#9747FF" />
                  <Text style={styles.statDetailText}>
                    {course.duration || "N/A"}
                  </Text>
                </View>
              </View>

              {/* Description Section */}
              <View style={styles.courseDetailSection}>
                <Text style={styles.courseDetailSectionTitle}>
                  📄 Description
                </Text>
                <Text style={styles.courseDetailDescription}>
                  {course.description || "No description available."}
                </Text>
              </View>

              {/* Course Info */}
              <View style={styles.courseDetailInfoBox}>
                <View style={styles.courseDetailInfoItem}>
                  <Text style={styles.courseDetailInfoLabel}>💰 Price</Text>
                  <Text style={styles.courseDetailInfoValue}>
                    {formatPrice(course.price || course.pricePerMonth || 0)}
                  </Text>
                </View>

                <View style={styles.courseDetailInfoItem}>
                  <Text style={styles.courseDetailInfoLabel}>🆔 Course ID</Text>
                  <Text style={styles.courseDetailInfoValue}>
                    #{course.id || "N/A"}
                  </Text>
                </View>

                {course.difficulty && (
                  <View style={styles.courseDetailInfoItem}>
                    <Text style={styles.courseDetailInfoLabel}>📊 Level</Text>
                    <Text style={styles.courseDetailInfoValue}>
                      {course.difficulty}
                    </Text>
                  </View>
                )}
              </View>

              {/* Course Sections Preview */}
              {course.sections && course.sections.length > 0 && (
                <View style={styles.courseDetailSection}>
                  <Text style={styles.courseDetailSectionTitle}>
                    📚 Course Content
                  </Text>
                  {course.sections.slice(0, 3).map((section, index) => (
                    <View key={index} style={styles.sectionItem}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      <Text style={styles.sectionDuration}>
                        {section.duration} minutes
                      </Text>
                    </View>
                  ))}
                  {course.sections.length > 3 && (
                    <Text style={styles.moreSections}>
                      +{course.sections.length - 3} more sections
                    </Text>
                  )}
                </View>
              )}

              {/* Mint License Button */}
              <TouchableOpacity
                style={[
                  styles.mintLicenseButton,
                  !isOnMantaNetwork && styles.disabledButton,
                ]}
                onPress={handleMintLicense}
                disabled={!isOnMantaNetwork}
                activeOpacity={0.7}
              >
                <Ionicons name="ticket" size={20} color="#fff" />
                <Text style={styles.mintLicenseButtonText}>
                  🎫 Mint License
                </Text>
              </TouchableOpacity>

              {/* Network Warning */}
              {!isOnMantaNetwork && (
                <View style={styles.networkWarning}>
                  <Ionicons name="warning" size={16} color="#ff9500" />
                  <Text style={styles.networkHint}>
                    Switch to Manta Pacific Testnet to mint license
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  courseDetailImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#e2e8f0",
  },
  courseDetailContent: {
    padding: 20,
  },
  courseDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginLeft: 4,
  },
  courseDetailTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 28,
  },
  courseDetailCreator: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 16,
  },
  courseStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statDetailText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: 6,
  },
  courseDetailSection: {
    marginBottom: 20,
  },
  courseDetailSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  courseDetailDescription: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
  },
  courseDetailInfoBox: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  courseDetailInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  courseDetailInfoLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  courseDetailInfoValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
  },
  sectionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
    flex: 1,
  },
  sectionDuration: {
    fontSize: 12,
    color: "#64748b",
  },
  moreSections: {
    fontSize: 14,
    color: "#9747FF",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
  },
  mintLicenseButton: {
    backgroundColor: "#9747FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  mintLicenseButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  networkWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9500",
  },
  networkHint: {
    fontSize: 14,
    color: "#856404",
    marginLeft: 8,
    flex: 1,
  },
});

export default CourseDetailModal;
