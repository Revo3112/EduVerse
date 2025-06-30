// src/screens/HelpSupportScreen.js - Modern Help & Support Screen
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HelpSupportScreen({ navigation }) {
  const handleEmailSupport = () => {
    const email = "eduversesupport@gmail.com";
    const subject = "EduVerse Support Request";
    const body = "Hello EduVerse Team,\n\nI need help with:\n\n";

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(mailtoUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(mailtoUrl);
        } else {
          Alert.alert(
            "Email Not Available",
            `Please send your inquiry to: ${email}`,
            [
              { text: "Copy Email", onPress: () => copyToClipboard(email) },
              { text: "OK" },
            ]
          );
        }
      })
      .catch((err) => console.error("Error opening email:", err));
  };

  const handleTelegram = () => {
    const telegramUrl = "https://t.me/eduverse_support";
    Linking.openURL(telegramUrl).catch(() => {
      Alert.alert("Error", "Could not open Telegram. Please try again later.");
    });
  };

  const handleDiscord = () => {
    const discordUrl = "https://discord.gg/eduverse";
    Linking.openURL(discordUrl).catch(() => {
      Alert.alert("Error", "Could not open Discord. Please try again later.");
    });
  };

  const copyToClipboard = (text) => {
    // Note: In a real app, you'd use @react-native-clipboard/clipboard
    Alert.alert("Email Copied", `${text} has been copied to clipboard`);
  };

  const SupportOption = ({
    icon,
    title,
    subtitle,
    onPress,
    color = "#9747FF",
  }) => (
    <TouchableOpacity style={styles.optionCard} onPress={onPress}>
      <View style={styles.optionContent}>
        <View style={[styles.optionIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const FAQItem = ({ question, answer }) => (
    <View style={styles.faqCard}>
      <Text style={styles.faqQuestion}>{question}</Text>
      <Text style={styles.faqAnswer}>{answer}</Text>
    </View>
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <Text style={styles.sectionSubtitle}>
            Get in touch with our support team
          </Text>

          <SupportOption
            icon="mail"
            title="Email Support"
            subtitle="eduversesupport@gmail.com"
            onPress={handleEmailSupport}
            color="#FF6B6B"
          />

          <SupportOption
            icon="chatbubbles"
            title="Live Chat"
            subtitle="Chat with us on Telegram"
            onPress={handleTelegram}
            color="#0088CC"
          />

          <SupportOption
            icon="people"
            title="Community"
            subtitle="Join our Discord community"
            onPress={handleDiscord}
            color="#5865F2"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          <FAQItem
            question="How do I buy a course license?"
            answer="Connect your wallet, browse courses, and click on any course to see the purchase modal. Make sure you're on the Manta Pacific Testnet."
          />

          <FAQItem
            question="What is a course license?"
            answer="A course license gives you access to all course content and materials. Licenses are NFTs stored on the blockchain."
          />

          <FAQItem
            question="How do I switch to Manta Pacific Testnet?"
            answer="Go to your profile and click 'Switch to Manta' if you're on the wrong network. You can also switch manually in your wallet."
          />

          <FAQItem
            question="My transaction is stuck, what should I do?"
            answer="Check your wallet for pending transactions. You may need to speed up or cancel the transaction from your wallet app."
          />

          <FAQItem
            question="How do I create a course?"
            answer="Go to the My Courses tab and tap 'Create Course'. Fill in the course details and publish it to the blockchain."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.getParent()?.navigate("Dashboard")}
          >
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => navigation.getParent()?.navigate("MyCourses")}
          >
            <Ionicons name="book" size={20} color="#9747FF" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              My Courses
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Need immediate assistance? Email us at eduversesupport@gmail.com
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
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
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  faqCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: "#9747FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#9747FF",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: "#9747FF",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
});
