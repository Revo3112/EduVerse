// src/screens/AboutScreen.js - Modern About EduVerse Screen
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AboutScreen({ navigation }) {
  const handleWebsite = () => {
    Linking.openURL("https://eduverse.dev").catch(() => {
      console.log("Could not open website");
    });
  };

  const handleGitHub = () => {
    Linking.openURL("https://github.com/eduverse-app").catch(() => {
      console.log("Could not open GitHub");
    });
  };

  const handleTwitter = () => {
    Linking.openURL("https://twitter.com/eduverse_app").catch(() => {
      console.log("Could not open Twitter");
    });
  };

  const FeatureCard = ({ icon, title, description, color = "#9747FF" }) => (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

  const SocialButton = ({ icon, title, onPress, color }) => (
    <TouchableOpacity style={styles.socialButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.socialButtonText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About EduVerse</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="school" size={64} color="#9747FF" />
          </View>
          <Text style={styles.appName}>EduVerse</Text>
          <Text style={styles.tagline}>
            Revolutionizing Education with Blockchain Technology
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is EduVerse?</Text>
          <Text style={styles.description}>
            EduVerse is a decentralized educational platform that leverages
            blockchain technology to provide secure, transparent, and accessible
            learning experiences. Our platform enables creators to build courses
            and learners to access quality education with verifiable
            certificates.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>

          <FeatureCard
            icon="shield-checkmark"
            title="Blockchain Security"
            description="All courses and certificates are secured on the blockchain, ensuring authenticity and preventing fraud."
            color="#28a745"
          />

          <FeatureCard
            icon="card"
            title="NFT Licenses"
            description="Course access is managed through NFT licenses, giving you true ownership of your educational content."
            color="#FF6B6B"
          />

          <FeatureCard
            icon="people"
            title="Creator Economy"
            description="Educators can monetize their knowledge and build sustainable income streams through course creation."
            color="#FFA500"
          />

          <FeatureCard
            icon="trophy"
            title="Verifiable Certificates"
            description="Earn blockchain-verified certificates that can be independently verified by employers worldwide."
            color="#9747FF"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technology Stack</Text>
          <View style={styles.techStack}>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Frontend</Text>
              <Text style={styles.techValue}>React Native + Expo</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Blockchain</Text>
              <Text style={styles.techValue}>Manta Pacific Network</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Smart Contracts</Text>
              <Text style={styles.techValue}>Solidity + Ethers.js v6</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techLabel}>Wallet Integration</Text>
              <Text style={styles.techValue}>Reown AppKit + Wagmi v2</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect With Us</Text>
          <View style={styles.socialContainer}>
            <SocialButton
              icon="globe"
              title="Website"
              onPress={handleWebsite}
              color="#007AFF"
            />
            <SocialButton
              icon="logo-github"
              title="GitHub"
              onPress={handleGitHub}
              color="#333"
            />
            <SocialButton
              icon="logo-twitter"
              title="Twitter"
              onPress={handleTwitter}
              color="#1DA1F2"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.description}>
            To democratize access to quality education worldwide by creating a
            decentralized platform where knowledge knows no boundaries. We
            believe in empowering both educators and learners through blockchain
            technology, creating a transparent and equitable educational
            ecosystem.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built with ❤️ by the EduVerse Team
          </Text>
          <Text style={styles.copyrightText}>
            © 2024 EduVerse. All rights reserved.
          </Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f8f5ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  versionBadge: {
    backgroundColor: "#9747FF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  versionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  featureCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  techStack: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  techItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  techLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  techValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  footer: {
    alignItems: "center",
    padding: 30,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: "#999",
  },
});
