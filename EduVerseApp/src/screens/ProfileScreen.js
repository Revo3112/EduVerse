// src/screens/ProfileScreen.js - FIXED: Remove modal triggers
import React, { useState, useEffect } from "react";
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
import { AppKitButton, useAppKit } from "@reown/appkit-wagmi-react-native";
import { mantaPacificTestnet } from "../constants/blockchain";
import { Ionicons } from "@expo/vector-icons";
import { useWeb3 } from "../contexts/Web3Context"; // ✅ Import Web3Context

export default function ProfileScreen({ navigation }) {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { open } = useAppKit();

  // ✅ Get modal prevention status
  const { modalPreventionActive } = useWeb3();

  // User stats state
  const [userStats, setUserStats] = useState({
    coursesEnrolled: 0,
    coursesCreated: 0,
    certificatesEarned: 0,
  });

  useEffect(() => {
    if (isConnected && address) {
      fetchUserStats();
    }
  }, [isConnected, address]);

  const fetchUserStats = async () => {
    try {
      setUserStats({
        coursesEnrolled: 5,
        coursesCreated: 2,
        certificatesEarned: 3,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

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

  // ✅ FIXED: Safe manual wallet modal trigger
  const handleOpenWalletModal = () => {
    if (modalPreventionActive) {
      console.log("🚫 Modal opening prevented during contract initialization");
      return;
    }
    open();
  };

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  // Simplified menu item component
  const MenuItem = ({
    icon,
    title,
    onPress,
    color = "#007AFF",
    danger = false,
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? "#FF3B30" : color} />
      <Text style={[styles.menuText, danger && styles.dangerText]}>
        {title}
      </Text>
      <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
    </TouchableOpacity>
  );

  // Disconnected state
  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.disconnectedContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-outline" size={60} color="#007AFF" />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to EduVerse</Text>
          <Text style={styles.welcomeSubtitle}>
            Connect your wallet to access your profile
          </Text>
          <View style={styles.connectButtonContainer}>
            <AppKitButton label="Connect Wallet" size="md" balance="hide" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Simple Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#007AFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.addressText}>
              {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
            </Text>
            <Text style={styles.connectorText}>{connector?.name}</Text>
          </View>
        </View>

        {/* Quick Stats - Simple Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userStats.coursesEnrolled}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userStats.coursesCreated}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {userStats.certificatesEarned}
            </Text>
            <Text style={styles.statLabel}>Certificates</Text>
          </View>
        </View>

        {/* ✅ FIXED: Manual Wallet Buttons - No auto-triggers */}
        <View style={styles.walletButtons}>
          <TouchableOpacity
            style={styles.manualWalletButton}
            onPress={handleOpenWalletModal}
            disabled={modalPreventionActive}
          >
            <Ionicons name="wallet-outline" size={20} color="#007AFF" />
            <Text style={styles.manualWalletButtonText}>
              {modalPreventionActive ? "Initializing..." : "Wallet Settings"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualNetworkButton}
            onPress={handleSwitchToManta}
            disabled={isPending}
          >
            <Ionicons name="globe-outline" size={20} color="#007AFF" />
            <Text style={styles.manualNetworkButtonText}>
              {isPending ? "Switching..." : "Network"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Network Status - Improved Layout */}
        {!isOnMantaNetwork && (
          <View style={styles.networkStatusCard}>
            <View style={styles.networkStatusHeader}>
              <Ionicons name="warning" size={20} color="#FF9500" />
              <Text style={styles.networkStatusTitle}>Network Notice</Text>
            </View>
            <Text style={styles.networkStatusDescription}>
              You're currently connected to a different network. Switch to Manta
              Pacific Testnet to access all EduVerse features and get the best
              experience.
            </Text>
            <TouchableOpacity
              style={styles.switchNetworkButton}
              onPress={handleSwitchToManta}
              disabled={isPending}
            >
              <Ionicons
                name="swap-horizontal"
                size={16}
                color="white"
                style={styles.switchButtonIcon}
              />
              <Text style={styles.switchNetworkButtonText}>
                {isPending ? "Switching..." : "Switch to Manta Pacific"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.networkStatusFooter}>
              Current network: {chainId ? `Chain ID ${chainId}` : "Unknown"}
            </Text>
          </View>
        )}

        {/* Current Network Info (when on correct network) */}
        {isOnMantaNetwork && (
          <View style={styles.networkStatusCardSuccess}>
            <View style={styles.networkStatusHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.networkStatusTitleSuccess}>
                Connected to Manta Pacific
              </Text>
            </View>
            <Text style={styles.networkStatusDescriptionSuccess}>
              You're connected to the correct network. All EduVerse features are
              available.
            </Text>
          </View>
        )}

        {/* Simple Menu List */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="settings-outline"
            title="Settings"
            onPress={() => navigation.navigate("Settings")}
          />
          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => navigation.navigate("HelpSupport")}
          />
          <MenuItem
            icon="document-text-outline"
            title="Terms & Privacy"
            onPress={() => navigation.navigate("TermsPrivacy")}
          />
          <MenuItem
            icon="information-circle-outline"
            title="About"
            onPress={() => navigation.navigate("About")}
          />
          <MenuItem
            icon="flask-outline"
            title="IPFS Test"
            onPress={() => navigation.navigate("IPFSTest")}
          />
        </View>

        {/* Disconnect Button - Separate Section */}
        <View style={styles.disconnectSection}>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Simple Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>EduVerse v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C7C7CC",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },

  // Disconnected State
  disconnectedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  connectButtonContainer: {
    width: "100%",
  },

  // Connected State - Simplified
  profileHeader: {
    backgroundColor: "white",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  addressText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    fontFamily: "monospace",
  },
  connectorText: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },

  // Simple Stats Row
  statsRow: {
    flexDirection: "row",
    backgroundColor: "white",
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "600",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 2,
  },

  // ✅ FIXED: Manual Wallet Buttons
  walletButtons: {
    flexDirection: "row",
    backgroundColor: "white",
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    justifyContent: "space-around",
  },
  manualWalletButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.45,
    justifyContent: "center",
  },
  manualWalletButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
  },
  manualNetworkButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.45,
    justifyContent: "center",
  },
  manualNetworkButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
  },

  // Network Status Cards (unchanged)
  networkStatusCard: {
    backgroundColor: "white",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9500",
  },
  networkStatusCardSuccess: {
    backgroundColor: "white",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#34C759",
  },
  networkStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  networkStatusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF9500",
    marginLeft: 8,
  },
  networkStatusTitleSuccess: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34C759",
    marginLeft: 8,
  },
  networkStatusDescription: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 20,
    marginBottom: 16,
  },
  networkStatusDescriptionSuccess: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 20,
  },
  switchNetworkButton: {
    backgroundColor: "#FF9500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  switchButtonIcon: {
    marginRight: 8,
  },
  switchNetworkButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  networkStatusFooter: {
    fontSize: 12,
    color: "#C7C7CC",
    textAlign: "center",
  },

  // Menu (unchanged)
  menuSection: {
    backgroundColor: "white",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F2F2F7",
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    marginLeft: 12,
  },
  dangerText: {
    color: "#FF3B30",
  },

  // Disconnect Section (unchanged)
  disconnectSection: {
    backgroundColor: "white",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  disconnectButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FF3B30",
    marginLeft: 8,
  },

  // Footer (unchanged)
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 11,
    color: "#8E8E93",
  },
});
