// src/screens/TermsPrivacyScreen.js - Terms & Privacy Screen
import React from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TermsPrivacyScreen() {
  const Section = ({ title, children, icon }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color="#9747FF" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionContent}>{children}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={32} color="#9747FF" />
          </View>
          <Text style={styles.headerTitle}>Terms & Privacy</Text>
          <Text style={styles.headerSubtitle}>
            Your privacy and our terms of service
          </Text>
          <Text style={styles.lastUpdated}>Last updated: January 2024</Text>
        </View>

        <Section title="Terms of Service" icon="document-outline">
          By using EduVerse, you agree to our terms of service. This platform is
          provided for educational purposes. You are responsible for maintaining
          the security of your wallet and private keys. We do not store your
          private information or have access to your funds.
        </Section>

        <Section title="Privacy Policy" icon="shield-checkmark-outline">
          EduVerse respects your privacy. We only collect necessary data to
          provide our services. Your wallet address and course progress are
          stored locally or on the blockchain. We do not share your personal
          information with third parties without your consent.
        </Section>

        <Section title="Data Collection" icon="analytics-outline">
          • Wallet addresses for authentication • Course progress and
          certificates • Usage analytics (anonymized) • Device information for
          optimization
        </Section>

        <Section title="Your Rights" icon="person-outline">
          • Access your data at any time • Request data deletion • Withdraw
          consent • Contact us with concerns
        </Section>

        <Section title="Blockchain Transparency" icon="cube-outline">
          Please note that data stored on the blockchain (such as certificates
          and course completions) is permanent and publicly accessible. This is
          inherent to blockchain technology and ensures the authenticity of your
          achievements.
        </Section>

        <Section title="Contact Information" icon="mail-outline">
          For questions about these terms or privacy concerns, please contact us
          at eduversesupport@gmail.com or through our support channels in the
          Help & Support section.
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing to use EduVerse, you acknowledge that you have read
            and agree to these terms and privacy policy.
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: "white",
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f8f5ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  section: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
    textAlign: "justify",
  },
  footer: {
    backgroundColor: "#f8f5ff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  footerText: {
    fontSize: 13,
    color: "#6b21a8",
    textAlign: "center",
    lineHeight: 20,
    fontStyle: "italic",
  },
});
