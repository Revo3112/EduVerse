// src/screens/DashboardScreen.js - Fixed Dashboard Screen
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import DashboardCard from "../components/DashboardCard";
import { mantaPacificTestnet } from "../constants/blockchain";

export default function DashboardScreen({ navigation }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  const handleViewCourses = () => {
    if (isOnMantaNetwork) {
      // Navigate to courses screen when implemented
      Alert.alert("Courses", "Navigating to courses...");
    } else {
      Alert.alert(
        "Wrong Network",
        "Please switch to Manta Pacific Testnet to view courses."
      );
    }
  };

  const handleCreateCourse = () => {
    if (isOnMantaNetwork) {
      // Navigate to create course screen when implemented
      Alert.alert("Create Course", "Navigating to course creation...");
    } else {
      Alert.alert(
        "Wrong Network",
        "Please switch to Manta Pacific Testnet to create courses."
      );
    }
  };

  const handleViewCertificates = () => {
    if (isOnMantaNetwork) {
      // Navigate to certificates screen when implemented
      Alert.alert("Certificates", "Navigating to certificates...");
    } else {
      Alert.alert(
        "Wrong Network",
        "Please switch to Manta Pacific Testnet to view certificates."
      );
    }
  };

  const handleViewProgress = () => {
    if (isOnMantaNetwork) {
      // Navigate to progress screen when implemented
      Alert.alert("Progress", "Navigating to progress tracker...");
    } else {
      Alert.alert(
        "Wrong Network",
        "Please switch to Manta Pacific Testnet to view progress."
      );
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔌</Text>
          <Text style={styles.emptyStateTitle}>Wallet Not Connected</Text>
          <Text style={styles.emptyStateText}>
            Please connect your wallet to access the dashboard
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to EduVerse</Text>
        <Text style={styles.addressText}>
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
        </Text>
      </View>

      {!isOnMantaNetwork && (
        <View style={styles.networkWarning}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            Switch to Manta Pacific Testnet for full functionality
          </Text>
        </View>
      )}

      <View style={styles.cardsContainer}>
        <DashboardCard
          title="Browse Courses"
          subtitle="Explore available educational content"
          iconName="book"
          onPress={handleViewCourses}
          backgroundColor={isOnMantaNetwork ? "#e3f2fd" : "#f5f5f5"}
          iconColor={isOnMantaNetwork ? "#1976d2" : "#999"}
        />

        <DashboardCard
          title="Create Course"
          subtitle="Share your knowledge with others"
          iconName="plus"
          onPress={handleCreateCourse}
          backgroundColor={isOnMantaNetwork ? "#e8f5e8" : "#f5f5f5"}
          iconColor={isOnMantaNetwork ? "#4caf50" : "#999"}
        />

        <DashboardCard
          title="My Certificates"
          subtitle="View your earned certificates"
          iconName="award"
          onPress={handleViewCertificates}
          backgroundColor={isOnMantaNetwork ? "#fff3e0" : "#f5f5f5"}
          iconColor={isOnMantaNetwork ? "#ff9800" : "#999"}
        />

        <DashboardCard
          title="Learning Progress"
          subtitle="Track your educational journey"
          iconName="star"
          onPress={handleViewProgress}
          backgroundColor={isOnMantaNetwork ? "#f3e5f5" : "#f5f5f5"}
          iconColor={isOnMantaNetwork ? "#9c27b0" : "#999"}
        />
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Courses Enrolled</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Certificates Earned</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 20,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "monospace",
  },
  networkWarning: {
    backgroundColor: "#fff3cd",
    margin: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    color: "#856404",
    fontWeight: "500",
  },
  cardsContainer: {
    paddingVertical: 10,
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
});
