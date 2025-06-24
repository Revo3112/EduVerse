// src/screens/SettingsScreen.js - Modern Settings Screen
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [dataUsage, setDataUsage] = useState(false);

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            Alert.alert("Success", "Cache cleared successfully!");
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "This will reset all settings to default values. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setNotifications(true);
            setDarkMode(false);
            setAutoPlay(true);
            setDataUsage(false);
            Alert.alert("Success", "Settings reset to default!");
          },
        },
      ]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    color = "#9747FF",
  }) => (
    <TouchableOpacity
      style={styles.settingCard}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingContent}>
        <View style={[styles.settingIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {rightComponent ||
          (onPress && (
            <Ionicons name="chevron-forward" size={20} color="#666" />
          ))}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="General" />
        <SettingItem
          icon="notifications"
          title="Push Notifications"
          subtitle="Receive updates about your courses"
          color="#FF6B6B"
          rightComponent={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#f0f0f0", true: "#FF6B6B" }}
              thumbColor={notifications ? "#fff" : "#f4f3f4"}
            />
          }
        />
        <SettingItem
          icon="moon"
          title="Dark Mode"
          subtitle="Switch to dark theme"
          color="#6366F1"
          rightComponent={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#f0f0f0", true: "#6366F1" }}
              thumbColor={darkMode ? "#fff" : "#f4f3f4"}
            />
          }
        />
        <SectionHeader title="Learning Preferences" />
        <SettingItem
          icon="play"
          title="Auto-play Videos"
          subtitle="Automatically play next lesson"
          color="#10B981"
          rightComponent={
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: "#f0f0f0", true: "#10B981" }}
              thumbColor={autoPlay ? "#fff" : "#f4f3f4"}
            />
          }
        />
        <SettingItem
          icon="download"
          title="Download Quality"
          subtitle="High quality (uses more storage)"
          onPress={() =>
            Alert.alert(
              "Quality Settings",
              "Video quality settings coming soon!"
            )
          }
          color="#F59E0B"
        />
        <SectionHeader title="Data & Storage" />
        <SettingItem
          icon="cellular"
          title="Use Cellular Data"
          subtitle="Allow downloads over cellular"
          color="#EF4444"
          rightComponent={
            <Switch
              value={dataUsage}
              onValueChange={setDataUsage}
              trackColor={{ false: "#f0f0f0", true: "#EF4444" }}
              thumbColor={dataUsage ? "#fff" : "#f4f3f4"}
            />
          }
        />
        <SettingItem
          icon="trash"
          title="Clear Cache"
          subtitle="Free up storage space"
          onPress={handleClearCache}
          color="#8B5CF6"
        />
        <SettingItem
          icon="cloud-download"
          title="Manage Downloads"
          subtitle="View and manage offline content"
          onPress={() =>
            Alert.alert("Downloads", "Download manager coming soon!")
          }
          color="#06B6D4"
        />
        <SectionHeader title="Account" />
        <SettingItem
          icon="person"
          title="Profile Settings"
          subtitle="Update your profile information"
          onPress={() => Alert.alert("Profile", "Profile editing coming soon!")}
          color="#9747FF"
        />
        <SettingItem
          icon="shield-checkmark"
          title="Privacy & Security"
          subtitle="Manage your privacy settings"
          onPress={() =>
            Alert.alert("Privacy", "Privacy settings coming soon!")
          }
          color="#059669"
        />
        <SectionHeader title="Advanced" />
        <SettingItem
          icon="bug"
          title="Debug Mode"
          subtitle="Enable developer options"
          onPress={() => Alert.alert("Debug", "Debug mode coming soon!")}
          color="#DC2626"
        />
        <SettingItem
          icon="cloud-upload"
          title="IPFS Test"
          subtitle="Test Pinata IPFS integration"
          onPress={() => navigation.navigate("IPFSTest")}
          color="#6366F1"
        />
        <SettingItem
          icon="refresh"
          title="Reset Settings"
          subtitle="Reset all settings to default"
          onPress={handleResetSettings}
          color="#F97316"
        />
        <View style={styles.section}>
          <Text style={styles.infoText}>
            App Version: 1.0.0{"\n"}
            Build: 2024.12.24
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  section: {
    padding: 20,
    alignItems: "center",
  },
  infoText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
});
