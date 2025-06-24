// src/screens/CreateCourseScreen.js - Improved Create Course with Sections
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
  SafeAreaView,
  Modal,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";

export default function CreateCourseScreen({ navigation }) {
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
    thumbnailURI: "",
  });

  const [sections, setSections] = useState([]);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSection, setNewSection] = useState({
    title: "",
    contentURI: "",
    duration: "",
  });

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  const handleInputChange = (field, value) => {
    setCourseData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSectionInputChange = (field, value) => {
    setNewSection((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addSection = () => {
    if (!newSection.title.trim()) {
      Alert.alert("Error", "Please enter section title");
      return;
    }
    if (!newSection.duration.trim()) {
      Alert.alert("Error", "Please enter section duration");
      return;
    }

    const section = {
      id: Date.now(),
      title: newSection.title,
      contentURI: newSection.contentURI,
      duration: parseInt(newSection.duration),
      orderId: sections.length,
    };

    setSections([...sections, section]);
    setNewSection({ title: "", contentURI: "", duration: "" });
    setShowAddSectionModal(false);
  };

  const removeSection = (sectionId) => {
    Alert.alert(
      "Remove Section",
      "Are you sure you want to remove this section?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setSections(sections.filter((s) => s.id !== sectionId));
          },
        },
      ]
    );
  };

  const handleCreateCourse = async () => {
    // Validation
    if (!courseData.title.trim()) {
      Alert.alert("Error", "Please enter a course title");
      return;
    }
    if (!courseData.description.trim()) {
      Alert.alert("Error", "Please enter a course description");
      return;
    }
    if (courseData.isPaid && !courseData.price.trim()) {
      Alert.alert("Error", "Please enter a price for paid course");
      return;
    }
    if (sections.length === 0) {
      Alert.alert("Error", "Please add at least one course section");
      return;
    }

    Alert.alert(
      "Create Course",
      `This will create a new course with ${sections.length} sections on the blockchain. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async () => {
            try {
              // TODO: Implement actual smart contract integration
              console.log("Creating course:", courseData);
              console.log("Course sections:", sections);

              // Simulate course creation
              Alert.alert("Success", "Course created successfully!");

              // Reset form
              setCourseData({
                title: "",
                description: "",
                category: "",
                price: "",
                duration: "",
                difficulty: "Beginner",
                isPaid: false,
                thumbnailURI: "",
              });
              setSections([]);

              // Navigate to MyCourses
              navigation.navigate("MyCourses");
            } catch (error) {
              console.error("Error creating course:", error);
              Alert.alert(
                "Error",
                "Failed to create course. Please try again."
              );
            }
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

  const SectionItem = ({ section, onRemove }) => (
    <View style={styles.sectionItem}>
      <View style={styles.sectionInfo}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionDuration}>{section.duration} minutes</Text>
        {section.contentURI && (
          <Text style={styles.sectionContent} numberOfLines={1}>
            📎 {section.contentURI}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(section.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  const AddSectionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showAddSectionModal}
      onRequestClose={() => setShowAddSectionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Course Section</Text>
            <TouchableOpacity
              onPress={() => setShowAddSectionModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Section Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter section title"
                value={newSection.title}
                onChangeText={(text) => handleSectionInputChange("title", text)}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Content URI</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/content or IPFS hash"
                value={newSection.contentURI}
                onChangeText={(text) =>
                  handleSectionInputChange("contentURI", text)
                }
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                value={newSection.duration}
                onChangeText={(text) =>
                  handleSectionInputChange("duration", text)
                }
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity style={styles.addButton} onPress={addSection}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Section</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="wallet-outline" size={64} color="#ccc" />
          <Text style={styles.notConnectedTitle}>Wallet Not Connected</Text>
          <Text style={styles.notConnectedSubtitle}>
            Connect your wallet to create courses
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isOnMantaNetwork) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="warning-outline" size={64} color="#ff9500" />
          <Text style={styles.warningTitle}>Wrong Network</Text>
          <Text style={styles.warningSubtitle}>
            Please switch to Manta Pacific Testnet to create courses
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create New Course</Text>
          <Text style={styles.subtitle}>
            Share your knowledge with the world
          </Text>
        </View>

        <View style={styles.form}>
          {/* Basic Course Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Course Information</Text>

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
              <Text style={styles.label}>Thumbnail URI</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/image.jpg or IPFS hash"
                value={courseData.thumbnailURI}
                onChangeText={(text) => handleInputChange("thumbnailURI", text)}
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
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Pricing</Text>

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
                trackColor={{ false: "#767577", true: "#9747FF" }}
                thumbColor={courseData.isPaid ? "#fff" : "#f4f3f4"}
              />
            </View>

            {courseData.isPaid && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price per Month (in ETH)</Text>
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
          </View>

          {/* Course Sections */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📖 Course Sections</Text>
              <TouchableOpacity
                style={styles.addSectionButton}
                onPress={() => setShowAddSectionModal(true)}
              >
                <Ionicons name="add" size={20} color="#9747FF" />
                <Text style={styles.addSectionText}>Add Section</Text>
              </TouchableOpacity>
            </View>

            {sections.length > 0 ? (
              <View style={styles.sectionsContainer}>
                {sections.map((section, index) => (
                  <SectionItem
                    key={section.id}
                    section={section}
                    onRemove={removeSection}
                  />
                ))}
                <Text style={styles.sectionsCount}>
                  {sections.length} section{sections.length !== 1 ? "s" : ""}{" "}
                  added
                </Text>
              </View>
            ) : (
              <View style={styles.emptySections}>
                <Ionicons name="document-outline" size={48} color="#ccc" />
                <Text style={styles.emptySectionsText}>
                  No sections added yet. Add your first section to get started.
                </Text>
              </View>
            )}
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              sections.length === 0 && styles.disabledButton,
            ]}
            onPress={handleCreateCourse}
            disabled={sections.length === 0}
          >
            <Ionicons name="rocket-outline" size={20} color="white" />
            <Text style={styles.createButtonText}>Create Course</Text>
          </TouchableOpacity>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#9747FF"
            />
            <Text style={styles.infoText}>
              Your course will be deployed as a smart contract on Manta Pacific
              Testnet. This action requires a transaction fee.
            </Text>
          </View>
        </View>
      </ScrollView>

      <AddSectionModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    flexGrow: 1,
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
    backgroundColor: "#9747FF",
    borderColor: "#9747FF",
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
  addSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9747FF",
  },
  addSectionText: {
    color: "#9747FF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  sectionsContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  sectionDuration: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  sectionContent: {
    fontSize: 12,
    color: "#9747FF",
  },
  removeButton: {
    padding: 8,
  },
  sectionsCount: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  emptySections: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  emptySectionsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
  createButton: {
    backgroundColor: "#9747FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
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
    borderLeftColor: "#9747FF",
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#1565c0",
    flex: 1,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  addButton: {
    backgroundColor: "#9747FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
