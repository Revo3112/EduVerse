// src/screens/CreateCourseScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { AppKitButton } from "@reown/appkit-wagmi-react-native";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";

export default function CreateCourseScreen() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [courseData, setCourseData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    duration: "",
    difficulty: "Beginner",
    isPaid: false,
  });

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  const handleInputChange = (field, value) => {
    setCourseData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateCourse = () => {
    if (!courseData.title.trim()) {
      Alert.alert("Error", "Please enter a course title");
      return;
    }
    if (!courseData.description.trim()) {
      Alert.alert("Error", "Please enter a course description");
      return;
    }

    Alert.alert(
      "Create Course",
      "This will create a new course on the blockchain. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: () => {
            // Here you would integrate with your smart contract
            console.log("Creating course:", courseData);
            Alert.alert("Success", "Course creation initiated!");
          },
        },
      ]
    );
  };

  const DifficultySelector = () => (
    <View style={styles.difficultyContainer}>
      {["Beginner", "Intermediate", "Advanced"].map((level) => (
        <TouchableOpacity
          key={level}
          style={[
            styles.difficultyButton,
            courseData.difficulty === level && styles.selectedDifficulty,
          ]}
          onPress={() => handleInputChange("difficulty", level)}
        >
          <Text
            style={[
              styles.difficultyText,
              courseData.difficulty === level && styles.selectedDifficultyText,
            ]}
          >
            {level}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!isConnected) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="wallet-outline" size={64} color="#ccc" />
          <Text style={styles.notConnectedTitle}>Wallet Not Connected</Text>
          <Text style={styles.notConnectedSubtitle}>
            Connect your wallet to create courses
          </Text>
          <View style={styles.connectSection}>
            <AppKitButton />
          </View>
        </View>
      </ScrollView>
    );
  }

  if (!isOnMantaNetwork) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="warning-outline" size={64} color="#ff9500" />
          <Text style={styles.warningTitle}>Wrong Network</Text>
          <Text style={styles.warningSubtitle}>
            Please switch to Manta Pacific Testnet to create courses
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create New Course</Text>
        <Text style={styles.subtitle}>Share your knowledge with the world</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Course Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter course title"
            value={courseData.title}
            onChangeText={(text) => handleInputChange("title", text)}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what students will learn..."
            value={courseData.description}
            onChangeText={(text) => handleInputChange("description", text)}
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Web Development, Design, etc."
            value={courseData.category}
            onChangeText={(text) => handleInputChange("category", text)}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Difficulty Level</Text>
          <DifficultySelector />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration (in hours)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 10"
            value={courseData.duration}
            onChangeText={(text) => handleInputChange("duration", text)}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.switchGroup}>
          <View style={styles.switchInfo}>
            <Text style={styles.label}>Paid Course</Text>
            <Text style={styles.switchSubtext}>
              Enable if you want to charge for this course
            </Text>
          </View>
          <Switch
            value={courseData.isPaid}
            onValueChange={(value) => handleInputChange("isPaid", value)}
            trackColor={{ false: "#767577", true: "#007AFF" }}
            thumbColor={courseData.isPaid ? "#fff" : "#f4f3f4"}
          />
        </View>

        {courseData.isPaid && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (in ETH)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.01"
              value={courseData.price}
              onChangeText={(text) => handleInputChange("price", text)}
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateCourse}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Course</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#007AFF"
          />
          <Text style={styles.infoText}>
            Your course will be deployed as a smart contract on Manta Pacific
            Testnet. This action requires a transaction fee.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f8f9fa",
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  notConnectedSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ff9500",
    marginTop: 20,
    marginBottom: 8,
  },
  warningSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  connectSection: {
    marginTop: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  form: {
    padding: 20,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#333",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  difficultyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "white",
    marginHorizontal: 4,
    alignItems: "center",
  },
  selectedDifficulty: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  difficultyText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  selectedDifficultyText: {
    color: "white",
  },
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  switchInfo: {
    flex: 1,
  },
  switchSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  createButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#1565c0",
    flex: 1,
    lineHeight: 20,
  },
});
