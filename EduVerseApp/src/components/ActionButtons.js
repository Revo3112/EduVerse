// src/components/ActionButtons.js - Updated without @expo/vector-icons
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAccount, useDisconnect } from "wagmi";

// Simple icon component using emoji
const SimpleIcon = ({ emoji, size = 16 }) => (
  <Text style={{ fontSize: size, marginRight: 8 }}>{emoji}</Text>
);

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
          activeOpacity={0.8}
        >
          <SimpleIcon emoji="📚" />
          <Text style={styles.buttonText}>View Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCreateCourse}
          activeOpacity={0.8}
        >
          <SimpleIcon emoji="➕" />
          <Text style={styles.buttonText}>Create Course</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleViewCertificates}
          activeOpacity={0.8}
        >
          <SimpleIcon emoji="🏆" />
          <Text style={styles.buttonText}>Certificates</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={handleDisconnect}
          activeOpacity={0.8}
        >
          <SimpleIcon emoji="🔌" />
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
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
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
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
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  disconnectButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
