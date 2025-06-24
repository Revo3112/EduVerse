// src/components/CourseCard.js - Reusable and Enhanced Course Card
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

const CourseCard = ({ course, onDetailPress, priceInIdr, priceLoading }) => {
  if (!course) return null;

  const creationDate = timeAgo(course.createdAt);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => onDetailPress(course)}
      activeOpacity={0.8}
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

        {/* Informasi tambahan dari smart contract */}
        <View style={styles.infoRow}>
          <Ionicons name="layers-outline" size={14} color="#64748b" />
          {/* CATATAN: Jumlah sesi perlu diambil oleh hook useCourses */}
          <Text style={styles.infoText}>5 Sesi</Text>
        </View>
        {creationDate && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.infoText}>Dibuat {creationDate}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {priceLoading ? (
            <ActivityIndicator size="small" color="#8b5cf6" />
          ) : (
            <Text style={styles.priceText}>{priceInIdr || "Gratis"}</Text>
          )}
        </View>
      </View>
      <View style={styles.creatorBadge}>
        <Text style={styles.creatorText} numberOfLines={1}>
          Oleh: {`${course.creator.slice(0, 6)}...${course.creator.slice(-4)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#4a044e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardImage: {
    width: "100%",
    height: 150,
    backgroundColor: "#f1f5f9",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
    minHeight: 40, // Ruang untuk 2 baris judul
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
    marginTop: 10,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8b5cf6",
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
