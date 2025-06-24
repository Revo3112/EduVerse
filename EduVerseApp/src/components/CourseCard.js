// src/components/CourseCard.js - Redesigned Course Card with Horizontal Info Layout
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Helper untuk memformat timestamp menjadi format "X hari yang lalu"
const timeAgo = (timestamp) => {
  if (!timestamp) return null;
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

const CourseCard = ({
  course,
  onDetailPress,
  priceInIdr,
  priceLoading,
  hidePrice = false,
}) => {
  if (!course) return null;

  const creationDate = timeAgo(course.createdAt);
  return (
    <TouchableOpacity
      style={[styles.cardContainer, priceLoading && styles.cardDisabled]}
      onPress={() => !priceLoading && onDetailPress(course)}
      activeOpacity={priceLoading ? 1 : 0.8}
      disabled={priceLoading}
    >
      <Image
        source={{
          uri:
            course.thumbnailURI ||
            "https://placehold.co/600x400/9747FF/FFFFFF/png?text=Course",
        }}
        style={styles.cardImage}
      />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title || "Untitled Course"}
        </Text>
        {/* Description preview dari blockchain */}
        {course.description && (
          <Text style={styles.description} numberOfLines={2}>
            {course.description}
          </Text>
        )}
        {/* --- Area Informasi dengan Layout Horizontal --- */}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="book-outline" size={16} color="#8b5cf6" />
            <Text style={styles.infoText}>
              {course.sectionsCount !== undefined
                ? `${course.sectionsCount} Sesi`
                : "... Sesi"}
            </Text>
          </View>

          {creationDate && (
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color="#8b5cf6" />
              <Text style={styles.infoText}>{creationDate}</Text>
            </View>
          )}
        </View>
        {/* Additional info dari blockchain */}
        <View style={styles.additionalInfo}>
          <View style={styles.creatorInfo}>
            <Ionicons name="person-outline" size={12} color="#6366f1" />
            <Text style={styles.creatorInfoText}>
              {course.creator
                ? `${course.creator.slice(0, 4)}...${course.creator.slice(-4)}`
                : "Unknown Creator"}
            </Text>
          </View>
          <View style={styles.pricePreview}>
            <Ionicons name="diamond-outline" size={12} color="#8b5cf6" />
            <Text style={styles.pricePreviewText}>
              {course.pricePerMonth && parseFloat(course.pricePerMonth) === 0
                ? "Gratis"
                : course.pricePerMonth
                ? `${parseFloat(course.pricePerMonth).toFixed(4)} ETH`
                : "Gratis"}
            </Text>
          </View>
          <View style={styles.idBadge}>
            <Ionicons name="pricetag-outline" size={12} color="#64748b" />
            <Text style={styles.idText}>ID: {course.id}</Text>
          </View>
        </View>
        {/* --- Footer dengan Harga dan Status --- */}
        <View style={[styles.footer, hidePrice && styles.footerWithoutPrice]}>
          {!hidePrice &&
            (priceLoading ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <Text style={styles.priceText}>{priceInIdr || "Gratis"}</Text>
            ))}

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  course.isActive !== false ? "#dcfce7" : "#fee2e2",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    course.isActive !== false ? "#22c55e" : "#ef4444",
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: course.isActive !== false ? "#166534" : "#991b1b" },
              ]}
            >
              {course.isActive !== false ? "Aktif" : "Nonaktif"}
            </Text>
          </View>
        </View>
      </View>
      {/* Creator badge tetap di atas */}
      <View style={styles.creatorBadge}>
        <Text style={styles.creatorText} numberOfLines={1}>
          Oleh:{" "}
          {course.creator
            ? `${course.creator.slice(0, 6)}...${course.creator.slice(-4)}`
            : "Unknown Creator"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#4a044e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardImage: {
    width: "100%",
    height: 150,
    backgroundColor: "#f1f5f9",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 14,
  },
  title: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 2,
    minHeight: 33,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 10,
  },
  // --- New Horizontal Info Container ---
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 6,
    fontWeight: "500",
  },
  // Additional info styles - semua dari blockchain
  additionalInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flex: 1,
    marginRight: 4,
  },
  creatorInfoText: {
    fontSize: 10,
    color: "#6366f1",
    fontWeight: "600",
    marginLeft: 3,
  },
  pricePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
  },
  pricePreviewText: {
    fontSize: 10,
    color: "#8b5cf6",
    fontWeight: "600",
    marginLeft: 3,
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flex: 1,
    marginLeft: 4,
  },
  idText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginLeft: 3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  footerWithoutPrice: {
    justifyContent: "flex-end",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  creatorBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  creatorText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
});

export default CourseCard;
