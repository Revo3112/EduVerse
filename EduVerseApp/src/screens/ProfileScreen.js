// src/screens/ProfileScreen.js - Modern Profile Screen with Enhanced UI
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { AppKitButton } from "@reown/appkit-wagmi-react-native";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";
import WalletInfo from "../components/WalletInfo";

export default function ProfileScreen({ navigation }) {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const handleSwitchToManta = async () => {
    try {
      if (switchChain) {
        await switchChain({ chainId: mantaPacificTestnet.id });
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
      Alert.alert(
        "Network Switch Failed",
        "Unable to switch to Manta Pacific Testnet. Please try switching manually in your wallet.",
        [{ text: "OK" }]
      );
    }
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

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;
  const ProfileOption = ({
    icon,
    title,
    subtitle,
    onPress,
    color = "#9747FF",
    showArrow = true,
    badge,
  }) => (
    <TouchableOpacity style={styles.optionCard} onPress={onPress}>
      <View style={styles.optionContent}>
        <View style={[styles.optionIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.optionText}>
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionTitle}>{title}</Text>
            {badge && (
              <View style={[styles.badge, { backgroundColor: color }]}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
        </View>
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color="#999" />
        )}
      </View>
    </TouchableOpacity>
  );
  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.customHeader}>
          <Text style={styles.screenTitle}>Profile</Text>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.disconnectedContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centeredContent}>
            <View style={styles.profileIconContainer}>
              <Ionicons name="person-outline" size={64} color="#9747FF" />
            </View>
            <Text style={styles.notConnectedTitle}>Welcome to EduVerse</Text>
            <Text style={styles.notConnectedSubtitle}>
              Connect your wallet to access your profile and start learning
            </Text>
            <View style={styles.connectSection}>
              <AppKitButton />
            </View>
            <Text style={styles.helpText}>
              Need help? Tap the connect button above to get started
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <Text style={styles.screenTitle}>Profile</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={32} color="#007AFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileTitle}>My Profile</Text>
              <Text style={styles.walletAddress}>
                {`${address?.slice(0, 8)}...${address?.slice(-6)}`}
              </Text>
              <Text style={styles.connectorName}>
                Connected via {connector?.name || "Unknown"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.networkSection}>
          <Text style={styles.sectionTitle}>Network Status</Text>
          <View style={styles.networkCard}>
            <View style={styles.networkInfo}>
              <Ionicons
                name={isOnMantaNetwork ? "checkmark-circle" : "warning"}
                size={24}
                color={isOnMantaNetwork ? "#28a745" : "#ff9500"}
              />
              <View style={styles.networkDetails}>
                <Text style={styles.networkName}>Chain ID: {chainId}</Text>
                <Text style={styles.networkDescription}>
                  {chainId === 1
                    ? "Ethereum Mainnet"
                    : chainId === 137
                    ? "Polygon"
                    : chainId === 42161
                    ? "Arbitrum"
                    : chainId === 11155111
                    ? "Sepolia Testnet"
                    : chainId === 3441006
                    ? "Manta Pacific Testnet"
                    : "Unknown Network"}
                </Text>
              </View>
            </View>

            {!isOnMantaNetwork && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={handleSwitchToManta}
                disabled={isPending}
              >
                <Text style={styles.switchButtonText}>
                  {isPending ? "Switching..." : "Switch to Manta"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <WalletInfo address={address} />
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>Account Options</Text>
          <ProfileOption
            icon="settings-outline"
            title="Settings"
            subtitle="App preferences and configurations"
            onPress={() => navigation.navigate("Settings")}
          />
          <ProfileOption
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => navigation.navigate("HelpSupport")}
          />
          <ProfileOption
            icon="document-text-outline"
            title="Terms & Privacy"
            subtitle="Read our terms and privacy policy"
            onPress={() => navigation.navigate("TermsPrivacy")}
          />
          <ProfileOption
            icon="information-circle-outline"
            title="About EduVerse"
            subtitle="Learn more about our platform"
            onPress={() => navigation.navigate("About")}
          />
        </View>
        <View style={styles.dangerSection}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <ProfileOption
            icon="log-out-outline"
            title="Disconnect Wallet"
            subtitle="Sign out from your wallet"
            onPress={handleDisconnect}
            color="#FF3B30"
            showArrow={false}
          />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Reown AppKit</Text>
          <Text style={styles.versionText}>EduVerse v1.0.0</Text>
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
  customHeader: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  disconnectedContent: {
    flexGrow: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  profileIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
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
  helpText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 14,
    color: "#007AFF",
    fontFamily: "monospace",
    marginBottom: 2,
  },
  connectorName: {
    fontSize: 12,
    color: "#666",
  },
  networkSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  networkCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  networkInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  networkDetails: {
    marginLeft: 12,
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  networkDescription: {
    fontSize: 14,
    color: "#666",
  },
  switchButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  switchButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  optionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  dangerSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  versionText: {
    fontSize: 10,
    color: "#ccc",
  },
});
