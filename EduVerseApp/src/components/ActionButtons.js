// src/components/ActionButtons.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAccount, useDisconnect } from "wagmi";

export default function ActionButtons() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const handleViewCourses = () => {
    Alert.alert("Courses", "View available courses feature coming soon!");
  };

  const handleCreateCourse = () => {
    Alert.alert("Create Course", "Create new course feature coming soon!");
  };

  const handleViewCertificates = () => {
    Alert.alert("Certificates", "View your certificates feature coming soon!");
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Wallet",
      "Are you sure you want to disconnect your wallet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          onPress: () => disconnect(),
          style: "destructive",
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Actions</Text>

      <View style={styles.buttonGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleViewCourses}
        >
          <Text style={styles.buttonText}>📚 View Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCreateCourse}
        >
          <Text style={styles.buttonText}>➕ Create Course</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleViewCertificates}
        >
          <Text style={styles.buttonText}>🏆 Certificates</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={handleDisconnect}
        >
          <Text style={styles.disconnectButtonText}>🔌 Disconnect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    width: "48%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  disconnectButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  disconnectButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
