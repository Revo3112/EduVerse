import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import { Video } from "expo-av";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useAccount } from "wagmi";
import { useSmartContract } from "../hooks/useBlockchain";

const { width: screenWidth } = Dimensions.get("window");

export default function SectionDetailScreen({ route, navigation }) {
  const { courseId, sectionId, sectionIndex, courseTitle } = route.params;
  const { address } = useAccount();
  const { smartContractService, isInitialized } = useSmartContract();

  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasValidLicense, setHasValidLicense] = useState(false);
  const [progress, setProgress] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [videoStatus, setVideoStatus] = useState({});
  const [audioStatus, setAudioStatus] = useState({});
  const [completingSection, setCompletingSection] = useState(false);

  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadSectionData();
    checkLicenseAndProgress();
  }, [courseId, sectionId, address]);
  const loadSectionData = async () => {
    try {
      setLoading(true);
      if (!smartContractService) {
        // Fallback to hardcoded sample content
        setSection({
          id: sectionId,
          title: `Sample Section ${sectionIndex + 1}`,
          description:
            "This is a sample section with hardcoded video content for demonstration purposes.",
          contentURI:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          duration: 596, // ~10 minutes
          isCompleted: false,
          courseId: courseId,
        });
        setLoading(false);
        return;
      }

      const sectionData = await smartContractService.getCourseSection(
        courseId,
        sectionIndex
      );

      if (sectionData) {
        setSection(sectionData);
      } else {
        // Fallback to hardcoded sample content if section not found
        setSection({
          id: sectionId,
          title: `Sample Section ${sectionIndex + 1}`,
          description:
            "This is a sample section with hardcoded video content for demonstration purposes.",
          contentURI:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          duration: 596, // ~10 minutes
          isCompleted: false,
          courseId: courseId,
        });
      }
    } catch (error) {
      console.error("Error loading section:", error);
      // Fallback to hardcoded sample content on error
      setSection({
        id: sectionId,
        title: `Sample Section ${sectionIndex + 1}`,
        description:
          "This is a sample section with hardcoded video content for demonstration purposes.",
        contentURI:
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        duration: 596, // ~10 minutes
        isCompleted: false,
        courseId: courseId,
      });
    } finally {
      setLoading(false);
    }
  };
  const checkLicenseAndProgress = async () => {
    try {
      if (!address || !smartContractService) return;

      // Check if user has valid license
      const licenseValid = await smartContractService.hasValidLicense(
        address,
        courseId
      );
      setHasValidLicense(licenseValid);

      // Get user progress
      const userProgress = await smartContractService.getUserProgress(
        address,
        courseId
      );
      setProgress(userProgress);

      // Check if this specific section is completed
      // This would require additional smart contract method to check individual section completion
      // For now, we'll use a placeholder logic
      setIsCompleted(false);
    } catch (error) {
      console.error("Error checking license and progress:", error);
    }
  };
  const handleCompleteSection = async () => {
    try {
      if (!hasValidLicense) {
        Alert.alert(
          "Access Denied",
          "You need a valid license to complete sections"
        );
        return;
      }

      if (!smartContractService) {
        Alert.alert("Error", "Smart contract service not available");
        return;
      }

      setCompletingSection(true);
      const result = await smartContractService.completeSection(
        courseId,
        sectionId
      );

      if (result.success) {
        setIsCompleted(true);
        Alert.alert("Success", "Section completed successfully!");
        // Refresh progress
        await checkLicenseAndProgress();
      } else {
        Alert.alert("Error", result.error || "Failed to complete section");
      }
    } catch (error) {
      console.error("Error completing section:", error);
      Alert.alert("Error", "Failed to complete section");
    } finally {
      setCompletingSection(false);
    }
  };

  const isVideoContent = (uri) => {
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    return videoExtensions.some((ext) => uri.toLowerCase().includes(ext));
  };

  const isAudioContent = (uri) => {
    const audioExtensions = [".mp3", ".wav", ".aac", ".m4a", ".ogg"];
    return audioExtensions.some((ext) => uri.toLowerCase().includes(ext));
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const renderMediaPlayer = () => {
    if (!section?.contentURI) return null;

    const { contentURI } = section;

    if (isVideoContent(contentURI)) {
      return (
        <View style={styles.mediaContainer}>
          <Video
            ref={videoRef}
            style={styles.video}
            source={{ uri: contentURI }}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
            onPlaybackStatusUpdate={setVideoStatus}
          />
        </View>
      );
    } else if (isAudioContent(contentURI)) {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.audioPlayer}>
            <Ionicons name="musical-notes" size={64} color="#9747FF" />
            <Text style={styles.audioTitle}>{section.title}</Text>
            <Text style={styles.audioDuration}>
              Duration: {formatDuration(section.duration)}
            </Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.unsupportedMedia}>
            <Ionicons name="document-outline" size={64} color="#666" />
            <Text style={styles.unsupportedText}>Unsupported media format</Text>
            <Text style={styles.unsupportedSubtext}>
              This content type is not supported for playback
            </Text>
          </View>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9747FF" />
          <Text style={styles.loadingText}>Loading section...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasValidLicense) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
        </View>

        <View style={styles.accessDeniedContainer}>
          <Ionicons name="lock-closed" size={64} color="#ff6b6b" />
          <Text style={styles.accessDeniedTitle}>License Required</Text>
          <Text style={styles.accessDeniedText}>
            You need a valid license for this course to access this section.
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {section?.title || "Loading..."}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {courseTitle}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Media Player */}
        {renderMediaPlayer()}

        {/* Section Info */}
        <View style={styles.sectionInfo}>
          <Text style={styles.sectionTitle}>{section?.title}</Text>
          <Text style={styles.sectionDuration}>
            Duration: {formatDuration(section?.duration || 0)}
          </Text>

          {progress && (
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                Course Progress: {progress.progressPercentage}% (
                {progress.completedSections}/{progress.totalSections} sections)
              </Text>
            </View>
          )}
        </View>

        {/* Completion Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              (isCompleted || completingSection) &&
                styles.completeButtonDisabled,
            ]}
            onPress={handleCompleteSection}
            disabled={isCompleted || completingSection}
          >
            {completingSection ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={isCompleted ? "checkmark-circle" : "checkmark"}
                size={20}
                color="#fff"
              />
            )}
            <Text style={styles.completeButtonText}>
              {isCompleted ? "Completed" : "Mark as Complete"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  mediaContainer: {
    backgroundColor: "#000",
    aspectRatio: 16 / 9,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  audioPlayer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  audioTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  audioDuration: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 8,
  },
  unsupportedMedia: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  unsupportedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  unsupportedSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  sectionInfo: {
    padding: 20,
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  sectionDuration: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  progressInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  progressText: {
    fontSize: 14,
    color: "#666",
  },
  actionContainer: {
    padding: 20,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9747FF",
    paddingVertical: 16,
    borderRadius: 12,
  },
  completeButtonDisabled: {
    backgroundColor: "#ccc",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#ff6b6b",
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  goBackButton: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
