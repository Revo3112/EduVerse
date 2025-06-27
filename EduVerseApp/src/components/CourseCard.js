// src/components/CourseCard.js - Enhanced with Pinata image integration and performance optimization

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { pinataService } from "../services/PinataService";

// Helper untuk memformat timestamp menjadi format "X hari yang lalu"
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

const CourseCard = ({
  course,
  onDetailPress,
  priceInIdr,
  priceLoading,
  hidePrice = false,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // ✅ Memoized course data untuk prevent unnecessary re-renders
  const courseData = useMemo(
    () => ({
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnailCID: course.thumbnailCID,
      thumbnailUrl: course.thumbnailUrl,
      creator: course.creator,
      pricePerMonth: course.pricePerMonth,
      sectionsCount: course.sectionsCount || 0,
      createdAt: course.createdAt,
    }),
    [course]
  );

  // ✅ Enhanced thumbnail loading dengan caching dan fallback
  useEffect(() => {
    let isMounted = true;

    const loadThumbnail = async () => {
      try {
        setImageLoading(true);
        setImageError(false);

        // ✅ Priority 1: Use pre-generated URL from SmartContractService
        if (courseData.thumbnailUrl) {
          console.log(
            "📷 Using pre-generated thumbnail URL for course:",
            courseData.id
          );
          setThumbnailUrl(courseData.thumbnailUrl);
          return;
        }

        // ✅ Priority 2: Generate URL from CID via Pinata
        if (courseData.thumbnailCID) {
          console.log(
            "🔗 Generating thumbnail URL from CID:",
            courseData.thumbnailCID
          );

          try {
            const optimizedUrl = await pinataService.getOptimizedFileUrl(
              courseData.thumbnailCID,
              {
                forcePublic: true,
                network: "public",
                width: 400, // ✅ Optimize untuk card size
                height: 240,
                format: "webp", // ✅ Better compression
              }
            );

            if (isMounted && optimizedUrl) {
              setThumbnailUrl(optimizedUrl);
              console.log("✅ Thumbnail URL generated successfully");
            }
          } catch (pinataError) {
            console.warn(
              "Failed to get optimized URL, using fallback:",
              pinataError
            );

            // ✅ Fallback ke public gateway
            const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${courseData.thumbnailCID}`;
            if (isMounted) {
              setThumbnailUrl(fallbackUrl);
            }
          }
        } else {
          console.log(
            "⚠️ No thumbnail CID available for course:",
            courseData.id
          );
          setThumbnailUrl(null);
        }
      } catch (error) {
        console.error("Error loading thumbnail:", error);
        if (isMounted) {
          setImageError(true);
          setThumbnailUrl(null);
        }
      } finally {
        if (isMounted) {
          setImageLoading(false);
        }
      }
    };

    loadThumbnail();

    return () => {
      isMounted = false;
    };
  }, [courseData.thumbnailCID, courseData.thumbnailUrl, courseData.id]);

  // ✅ Enhanced image load handlers
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = (error) => {
    console.warn("Image load error:", error);
    setImageLoading(false);
    setImageError(true);
  };

  // ✅ Memoized creator display
  const creatorDisplay = useMemo(() => {
    if (!courseData.creator) return "Unknown Creator";
    return `${courseData.creator.slice(0, 6)}...${courseData.creator.slice(
      -4
    )}`;
  }, [courseData.creator]);

  // ✅ Memoized price display
  const priceDisplay = useMemo(() => {
    if (hidePrice) return null;
    if (priceLoading) return "Memuat harga...";
    if (!priceInIdr || priceInIdr === "Rp 0") return "Gratis";
    return `${priceInIdr}/bulan`;
  }, [hidePrice, priceLoading, priceInIdr]);

  // ✅ Render thumbnail dengan optimizations
  const renderThumbnail = () => {
    if (imageLoading) {
      return (
        <View style={styles.thumbnailPlaceholder}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Memuat gambar...</Text>
        </View>
      );
    }

    if (imageError || !thumbnailUrl) {
      return (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="image-outline" size={40} color="#cbd5e1" />
          <Text style={styles.placeholderText}>Tidak ada gambar</Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: thumbnailUrl }}
        style={styles.thumbnail}
        onLoad={handleImageLoad}
        onError={handleImageError}
        resizeMode="cover"
        // ✅ Performance optimizations
        cache="force-cache"
        progressiveRenderingEnabled={true}
        fadeDuration={300}
      />
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onDetailPress(courseData)}
      activeOpacity={0.9}
    >
      {/* ✅ Enhanced thumbnail section */}
      <View style={styles.thumbnailContainer}>
        {renderThumbnail()}
        {/* ✅ Course stats overlay */}
        <View style={styles.statsOverlay}>
          <View style={styles.statsBadge}>
            <Ionicons name="play-circle-outline" size={12} color="#ffffff" />
            <Text style={styles.statsText}>
              {courseData.sectionsCount} video
            </Text>
          </View>
        </View>
      </View>

      {/* ✅ Enhanced course info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {courseData.title}
          </Text>
          {!hidePrice && (
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{priceDisplay}</Text>
            </View>
          )}
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {courseData.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.creatorInfo}>
            <Ionicons name="person-circle-outline" size={16} color="#8b5cf6" />
            <Text style={styles.creator}>{creatorDisplay}</Text>
          </View>

          <View style={styles.timeInfo}>
            <Ionicons name="time-outline" size={12} color="#94a3b8" />
            <Text style={styles.timeAgo}>{timeAgo(courseData.createdAt)}</Text>
          </View>
        </View>

        {/* ✅ Course progress indicator (if needed) */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "0%" }]} />
          </View>
          <Text style={styles.progressText}>Belum dimulai</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  thumbnailContainer: {
    position: "relative",
    height: 160,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 12,
    color: "#cbd5e1",
  },
  statsOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  statsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statsText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "500",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    lineHeight: 22,
  },
  priceContainer: {
    backgroundColor: "#ede9fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 60,
    alignItems: "center",
  },
  price: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  creator: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeAgo: {
    fontSize: 10,
    color: "#94a3b8",
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
  },
  progressText: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export default React.memo(CourseCard);
