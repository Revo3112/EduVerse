// src/screens/MyCoursesScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { useAccount, useChainId } from "wagmi";
import { AppKitButton } from "@reown/appkit-wagmi-react-native";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";

export default function MyCoursesScreen() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [activeTab, setActiveTab] = useState("enrolled"); // 'enrolled' or 'created'

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  // Mock data - replace with real data from smart contracts
  const enrolledCourses = [
    {
      id: 1,
      title: "Introduction to Blockchain",
      instructor: "John Doe",
      progress: 75,
      totalLessons: 20,
      completedLessons: 15,
      thumbnail: "📚",
      category: "Blockchain",
      enrolled: "2024-01-15",
    },
    {
      id: 2,
      title: "Smart Contract Development",
      instructor: "Jane Smith",
      progress: 30,
      totalLessons: 25,
      completedLessons: 8,
      thumbnail: "⚡",
      category: "Development",
      enrolled: "2024-02-01",
    },
    {
      id: 3,
      title: "Web3 Frontend Development",
      instructor: "Mike Johnson",
      progress: 90,
      totalLessons: 18,
      completedLessons: 16,
      thumbnail: "🌐",
      category: "Frontend",
      enrolled: "2024-01-20",
    },
  ];

  const createdCourses = [
    {
      id: 1,
      title: "React Native for Beginners",
      students: 42,
      revenue: "0.15 ETH",
      status: "Published",
      thumbnail: "📱",
      category: "Mobile Development",
      created: "2024-01-10",
    },
  ];

  const TabButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.activeTab]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const CourseCard = ({ course, type }) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => Alert.alert("Course Details", `Opening ${course.title}`)}
    >
      <View style={styles.courseHeader}>
        <Text style={styles.courseThumbnail}>{course.thumbnail}</Text>
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseCategory}>{course.category}</Text>
          {type === "enrolled" && (
            <Text style={styles.courseInstructor}>by {course.instructor}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>

      {type === "enrolled" && (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Progress: {course.completedLessons}/{course.totalLessons} lessons
            </Text>
            <Text style={styles.progressPercentage}>{course.progress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${course.progress}%` }]}
            />
          </View>
        </View>
      )}

      {type === "created" && (
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.statText}>{course.students} students</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="wallet-outline" size={16} color="#28a745" />
            <Text style={styles.statText}>{course.revenue}</Text>
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
              {course.status}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const EmptyState = ({ type }) => (
    <View style={styles.emptyState}>
      <Ionicons
        name={type === "enrolled" ? "book-outline" : "create-outline"}
        size={64}
        color="#ccc"
      />
      <Text style={styles.emptyTitle}>
        {type === "enrolled" ? "No Enrolled Courses" : "No Created Courses"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {type === "enrolled"
          ? "Start learning by browsing available courses"
          : "Share your knowledge by creating your first course"}
      </Text>
    </View>
  );

  if (!isConnected) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.centeredContent}>
          <Ionicons name="wallet-outline" size={64} color="#ccc" />
          <Text style={styles.notConnectedTitle}>Wallet Not Connected</Text>
          <Text style={styles.notConnectedSubtitle}>
            Connect your wallet to view your courses
          </Text>
          <View style={styles.connectSection}>
            <AppKitButton />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Courses</Text>
        <Text style={styles.subtitle}>Track your learning journey</Text>
      </View>

      {!isOnMantaNetwork && (
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={20} color="#ff9500" />
          <Text style={styles.warningText}>
            Switch to Manta Pacific Testnet to access your courses
          </Text>
        </View>
      )}

      <View style={styles.tabContainer}>
        <TabButton
          title="Enrolled"
          isActive={activeTab === "enrolled"}
          onPress={() => setActiveTab("enrolled")}
        />
        <TabButton
          title="Created"
          isActive={activeTab === "created"}
          onPress={() => setActiveTab("created")}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "enrolled" ? (
          enrolledCourses.length > 0 ? (
            enrolledCourses.map((course) => (
              <CourseCard key={course.id} course={course} type="enrolled" />
            ))
          ) : (
            <EmptyState type="enrolled" />
          )
        ) : createdCourses.length > 0 ? (
          createdCourses.map((course) => (
            <CourseCard key={course.id} course={course} type="created" />
          ))
        ) : (
          <EmptyState type="created" />
        )}

        {/* Add some bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3cd",
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9500",
  },
  warningText: {
    marginLeft: 8,
    color: "#856404",
    fontSize: 14,
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "white",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  courseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  courseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  courseThumbnail: {
    fontSize: 24,
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  courseCategory: {
    fontSize: 12,
    color: "#007AFF",
    marginBottom: 2,
  },
  courseInstructor: {
    fontSize: 12,
    color: "#666",
  },
  progressSection: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
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
    color: "#007AFF",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  statsSection: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
