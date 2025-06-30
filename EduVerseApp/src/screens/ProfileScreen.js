// src/screens/ProfileScreen.js - PRODUCTION READY WITH BLOCKCHAIN DATA
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
import {
  useSmartContract,
  useUserCourses,
  useCreatorCourses,
  useUserCertificates,
} from "../hooks/useBlockchain";

export default function ProfileScreen({ navigation }) {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { open } = useAppKit();

  // ✅ Get modal prevention status
  const { modalPreventionActive, isInitialized } = useSmartContract();

  // ✅ Get blockchain data using hooks
  const { enrolledCourses, loading: coursesLoading } = useUserCourses();
  const { createdCourses, loading: createdLoading } = useCreatorCourses();
  const { certificates, loading: certificatesLoading } = useUserCertificates();

  // User stats state
  const [userStats, setUserStats] = useState({
    coursesEnrolled: 0,
    coursesCreated: 0,
    certificatesEarned: 0,
  });

  // ✅ Update stats when blockchain data changes
  useEffect(() => {
    if (isConnected && address && isInitialized) {
      // Update stats from blockchain data
      setUserStats({
        coursesEnrolled: enrolledCourses?.length || 0,
        coursesCreated: createdCourses?.length || 0,
        certificatesEarned: certificates?.length || 0,
      });
    } else {
      // Reset stats when disconnected
      setUserStats({
        coursesEnrolled: 0,
        coursesCreated: 0,
        certificatesEarned: 0,
      });
    }
  }, [
    isConnected,
    address,
    isInitialized,
    enrolledCourses,
    createdCourses,
    certificates,
  ]);

  // ✅ Keep the original fetchUserStats for compatibility but it now uses blockchain data
  const fetchUserStats = async () => {
    try {
      // Stats are now automatically updated via useEffect when blockchain data changes
      console.log("User stats updated from blockchain:", {
        enrolled: enrolledCourses?.length || 0,
        created: createdCourses?.length || 0,
        certificates: certificates?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchUserStats();
    }
  }, [isConnected, address]);

  const handleSwitchToManta = async () => {
    if (modalPreventionActive) {
      Alert.alert(
        "Please Wait",
        "System is initializing. Please try again in a moment.",
        [{ text: "OK" }]
      );
      return;
    }

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

  // ✅ Safe manual wallet modal trigger
  const handleOpenWalletModal = () => {
    if (modalPreventionActive) {
      console.log("🚫 Modal opening prevented during initialization");
      Alert.alert(
        "Please Wait",
        "System is initializing. Please try again in a moment.",
        [{ text: "OK" }]
      );
      return;
    }

    open();
  };

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  // ✅ Calculate loading state for stats
  const statsLoading = coursesLoading || createdLoading || certificatesLoading;

  // Menu item component
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
            <AppKitButton
              label="Connect Wallet"
              size="md"
              balance="hide"
              disabled={modalPreventionActive}
            />
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
        {/* Profile Header */}
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

        {/* Quick Stats - Now with blockchain data */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            {statsLoading ? (
              <View style={styles.statLoading}>
                <Text style={styles.statLoadingText}>...</Text>
              </View>
            ) : (
              <Text style={styles.statNumber}>{userStats.coursesEnrolled}</Text>
            )}
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statBox}>
            {statsLoading ? (
              <View style={styles.statLoading}>
                <Text style={styles.statLoadingText}>...</Text>
              </View>
            ) : (
              <Text style={styles.statNumber}>{userStats.coursesCreated}</Text>
            )}
            <Text style={styles.statLabel}>Created</Text>
          </View>
          <View style={styles.statBox}>
            {statsLoading ? (
              <View style={styles.statLoading}>
                <Text style={styles.statLoadingText}>...</Text>
              </View>
            ) : (
              <Text style={styles.statNumber}>
                {userStats.certificatesEarned}
              </Text>
            )}
            <Text style={styles.statLabel}>Certificates</Text>
          </View>
        </View>

        {/* ✅ Additional Blockchain Data Section (Optional - shows detailed info) */}
        {isInitialized &&
          (enrolledCourses.length > 0 || createdCourses.length > 0) && (
            <View style={styles.blockchainDataSection}>
              <Text style={styles.blockchainDataTitle}>
                Blockchain Activity
              </Text>

              {/* Enrolled Courses Summary */}
              {enrolledCourses.length > 0 && (
                <View style={styles.blockchainDataItem}>
                  <Ionicons name="book-outline" size={16} color="#007AFF" />
                  <Text style={styles.blockchainDataText}>
                    {enrolledCourses.length} active course license
                    {enrolledCourses.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              {/* Created Courses Summary */}
              {createdCourses.length > 0 && (
                <View style={styles.blockchainDataItem}>
                  <Ionicons name="create-outline" size={16} color="#34C759" />
                  <Text style={styles.blockchainDataText}>
                    {createdCourses.length} course
                    {createdCourses.length !== 1 ? "s" : ""} created
                  </Text>
                </View>
              )}

              {/* Certificates Summary */}
              {certificates.length > 0 && (
                <View style={styles.blockchainDataItem}>
                  <Ionicons name="trophy-outline" size={16} color="#FF9500" />
                  <Text style={styles.blockchainDataText}>
                    {certificates.length} certificate
                    {certificates.length !== 1 ? "s" : ""} earned
                  </Text>
                </View>
              )}
            </View>
          )}

        {/* Wallet Control Buttons */}
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
            disabled={isPending || modalPreventionActive}
          >
            <Ionicons name="globe-outline" size={20} color="#007AFF" />
            <Text style={styles.manualNetworkButtonText}>
              {isPending ? "Switching..." : "Network"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Network Status */}
        {!isOnMantaNetwork && (
          <View style={styles.networkStatusCard}>
            <View style={styles.networkStatusHeader}>
              <Ionicons name="warning" size={20} color="#FF9500" />
              <Text style={styles.networkStatusTitle}>Network Notice</Text>
            </View>
            <Text style={styles.networkStatusDescription}>
              You're currently connected to a different network. Switch to Manta
              Pacific Testnet to access all EduVerse features.
            </Text>
            <TouchableOpacity
              style={styles.switchNetworkButton}
              onPress={handleSwitchToManta}
              disabled={isPending || modalPreventionActive}
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
              You're connected to the correct network. All features are
              available.
            </Text>
          </View>
        )}

        {/* System Status */}
        <View style={styles.systemStatusCard}>
          <Text style={styles.systemStatusTitle}>System Status</Text>
          <View style={styles.systemStatusItem}>
            <Ionicons
              name={isInitialized ? "checkmark-circle" : "time-outline"}
              size={16}
              color={isInitialized ? "#34C759" : "#FF9500"}
            />
            <Text style={styles.systemStatusText}>
              Smart Contracts: {isInitialized ? "Ready" : "Initializing..."}
            </Text>
          </View>
          <View style={styles.systemStatusItem}>
            <Ionicons
              name={isOnMantaNetwork ? "checkmark-circle" : "warning-outline"}
              size={16}
              color={isOnMantaNetwork ? "#34C759" : "#FF9500"}
            />
            <Text style={styles.systemStatusText}>
              Network: {isOnMantaNetwork ? "Connected" : "Switch Required"}
            </Text>
          </View>
          <View style={styles.systemStatusItem}>
            <Ionicons
              name={statsLoading ? "time-outline" : "checkmark-circle"}
              size={16}
              color={statsLoading ? "#FF9500" : "#34C759"}
            />
            <Text style={styles.systemStatusText}>
              Blockchain Data: {statsLoading ? "Loading..." : "Synced"}
            </Text>
          </View>
        </View>

        {/* Menu */}
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

        {/* Disconnect Button */}
        <View style={styles.disconnectSection}>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
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

  // Connected State
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

  // Stats
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
  statLoading: {
    height: 24,
    justifyContent: "center",
  },
  statLoadingText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#C7C7CC",
  },

  // Blockchain Data Section
  blockchainDataSection: {
    backgroundColor: "white",
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  blockchainDataTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  blockchainDataItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  blockchainDataText: {
    fontSize: 13,
    color: "#8E8E93",
    marginLeft: 8,
  },

  // Wallet Buttons
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

  // Network Status
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

  // System Status
  systemStatusCard: {
    backgroundColor: "white",
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  systemStatusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  systemStatusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  systemStatusText: {
    fontSize: 13,
    color: "#8E8E93",
    marginLeft: 8,
  },

  // Menu
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

  // Disconnect
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

  // Footer
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 11,
    color: "#8E8E93",
  },
});
