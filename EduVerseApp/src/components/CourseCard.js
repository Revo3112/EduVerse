// src/components/CourseCard.js - Reusable Course Card Component
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CourseCard = ({
  course,
  onDetailPress,
  onMintPress,
  showMintButton = true,
  showProgress = false,
  type = "default", // "default", "enrolled", "created"
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

  const renderStats = () => {
    if (type === "enrolled") {
      return (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Progress: {course.completedLessons || 0}/
              {course.totalLessons || 0} lessons
            </Text>
            <Text style={styles.progressPercentage}>
              {course.progress || 0}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${course.progress || 0}%` },
              ]}
            />
          </View>
        </View>
      );
    }

    if (type === "created") {
      return (
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.statText}>{course.students || 0} students</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="wallet-outline" size={16} color="#28a745" />
            <Text style={styles.statText}>{course.revenue || "0 ETH"}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              course.status === "Published"
                ? styles.publishedBadge
                : styles.draftBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                course.status === "Published"
                  ? styles.publishedText
                  : styles.draftText,
              ]}
            >
              {course.status || "Draft"}
            </Text>
          </View>
        </View>
      );
    }

    // Default stats for dashboard
    return (
      <View style={styles.courseStats}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>👥</Text>
          <Text style={styles.statText}>{course.students || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statText}>{course.rating || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statText}>{course.duration || "N/A"}</Text>
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => onDetailPress && onDetailPress(course)}
      activeOpacity={0.7}
    >
      {/* Course Image */}
      <Image
        source={{
          uri:
            course.thumbnailURI ||
            course.thumbnail ||
            "https://picsum.photos/400/250?random=1",
        }}
        style={styles.courseImage}
        resizeMode="cover"
      />

      <View style={styles.courseInfo}>
        {/* Category Badge */}
        {course.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{course.category}</Text>
          </View>
        )}

        {/* Course Title */}
        <Text style={styles.courseTitle} numberOfLines={2}>
          {course.title}
        </Text>

        {/* Creator/Instructor Name */}
        <Text style={styles.creatorName} numberOfLines={1}>
          👨‍🏫 {course.creatorName || course.instructor || "Unknown"}
        </Text>

        {/* Stats Section */}
        {renderStats()}

        {/* Footer with Price and Action Button */}
        {type === "default" && (
          <View style={styles.courseCardFooter}>
            <Text style={styles.coursePrice}>
              {formatPrice(course.price || course.pricePerMonth || 0)}
            </Text>
            <TouchableOpacity
              style={styles.detailButton}
              onPress={() => onDetailPress && onDetailPress(course)}
            >
              <Text style={styles.detailButtonText}>Detail</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mint Button for Course Details */}
        {showMintButton && type === "default" && (
          <TouchableOpacity
            style={styles.mintButton}
            onPress={() => onMintPress && onMintPress(course)}
          >
            <Ionicons name="ticket-outline" size={16} color="#fff" />
            <Text style={styles.mintButtonText}>Mint License</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  courseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  courseImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#e2e8f0",
  },
  courseInfo: {
    padding: 16,
  },
  categoryBadge: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 22,
  },
  creatorName: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
  },
  courseStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginLeft: 4,
  },
  courseCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  coursePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
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
    fontSize: 13,
  },
  mintButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  mintButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  // Progress styles for enrolled courses
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9747FF",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#9747FF",
    borderRadius: 2,
  },
  // Stats styles for created courses
  statsSection: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    marginBottom: 12,
  },
  statusBadge: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  publishedBadge: {
    backgroundColor: "#d4edda",
  },
  draftBadge: {
    backgroundColor: "#f8d7da",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  publishedText: {
    color: "#155724",
  },
  draftText: {
    color: "#721c24",
  },
});

export default CourseCard;
