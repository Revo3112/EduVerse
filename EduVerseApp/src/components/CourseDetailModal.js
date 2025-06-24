// src/components/CourseDetailModal.js - Simplified and Modern Detail Modal
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CourseDetailModal = ({
  visible,
  course,
  onClose,
  onMintLicense,
  isMinting,
  priceInIdr,
  priceLoading,
}) => {
  if (!course) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-back" size={28} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {course.title}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Image
            source={{
              uri:
                course.thumbnailURI ||
                "https://placehold.co/600x400/9747FF/FFFFFF/png?text=Course",
            }}
            style={styles.courseImage}
          />
          <View style={styles.content}>
            <Text style={styles.title}>{course.title}</Text>
            <Text style={styles.creator}>
              Oleh: <Text style={styles.creatorAddress}>{course.creator}</Text>
            </Text>
            <Text style={styles.description}>
              {course.description || "Tidak ada deskripsi."}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Harga</Text>
            {priceLoading ? (
              <ActivityIndicator color="#8b5cf6" />
            ) : (
              <Text style={styles.priceText}>{priceInIdr || "Gratis"}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.mintButton, isMinting && styles.mintButtonDisabled]}
            onPress={() => onMintLicense(course)}
            disabled={isMinting}
          >
            {isMinting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.mintButtonText}>Beli Lisensi</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  closeButton: {
    padding: 4,
  },
  courseImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#e2e8f0",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  creator: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
  },
  creatorAddress: {
    fontFamily: "monospace",
    fontWeight: "600",
  },
  description: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 16,
    color: "#64748b",
  },
  priceText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  mintButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  mintButtonDisabled: {
    backgroundColor: "#c4b5fd",
  },
  mintButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CourseDetailModal;
