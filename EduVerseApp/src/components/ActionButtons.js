// src/components/ActionButtons.js - PRODUCTION READY: Complete prevention
import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { AppKitButton, useAppKit } from "@reown/appkit-wagmi-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSmartContract } from "../hooks/useBlockchain";
import { mantaPacificTestnet } from "../constants/blockchain";

export default function ActionButtons({ navigation }) {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();

  // ✅ CRITICAL: Get prevention status from hooks
  const { modalPreventionActive, isInitialized } = useSmartContract();

  const isOnCorrectNetwork = chainId === mantaPacificTestnet.id;

  // ✅ PRODUCTION: Safe modal opening with prevention check
  const handleOpenWalletModal = useCallback(() => {
    if (modalPreventionActive) {
      console.log("🚫 Modal opening prevented during contract initialization");
      Alert.alert(
        "Please Wait",
        "System is initializing contracts. Please wait a moment before opening wallet settings.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      open();
    } catch (error) {
      console.error("Failed to open wallet modal:", error);
      Alert.alert(
        "Error",
        "Failed to open wallet settings. Please try again.",
        [{ text: "OK" }]
      );
    }
  }, [modalPreventionActive, open]);

  // ✅ Safe network switching
  const handleSwitchNetwork = useCallback(async () => {
    if (modalPreventionActive) {
      Alert.alert(
        "Please Wait",
        "System is initializing. Please wait before switching networks.",
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
  }, [modalPreventionActive, switchChain]);

  // ✅ Safe navigation handlers
  const handleViewCourses = useCallback(() => {
    if (navigation) {
      navigation.navigate("MyCourses");
    }
  }, [navigation]);

  const handleCreateCourse = useCallback(() => {
    if (!isInitialized) {
      Alert.alert(
        "Please Wait",
        "Contracts are still initializing. Please wait a moment.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!isOnCorrectNetwork) {
      Alert.alert(
        "Wrong Network",
        "Please switch to Manta Pacific Testnet to create courses.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Switch Network", onPress: handleSwitchNetwork },
        ]
      );
      return;
    }

    if (navigation) {
      navigation.navigate("CreateCourse");
    }
  }, [isInitialized, isOnCorrectNetwork, navigation, handleSwitchNetwork]);

  const handleViewCertificates = useCallback(() => {
    if (!isInitialized) {
      Alert.alert(
        "Please Wait",
        "Contracts are still initializing. Please wait a moment.",
        [{ text: "OK" }]
      );
      return;
    }

    if (navigation) {
      navigation.navigate("Certificates");
    }
  }, [isInitialized, navigation]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      "Disconnect Wallet",
      "Are you sure you want to disconnect your wallet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnect(),
        },
      ]
    );
  }, [disconnect]);

  // ✅ PRODUCTION: Safe connect button - no auto triggers
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.disconnectedState}>
          <View style={styles.iconContainer}>
            <Ionicons name="wallet-outline" size={48} color="#007AFF" />
          </View>
          <Text style={styles.disconnectedTitle}>Connect Your Wallet</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your wallet to access EduVerse features
          </Text>

          {/* ✅ SAFE: Use AppKitButton with minimal config */}
          <View style={styles.connectButtonContainer}>
            <AppKitButton
              label="Connect Wallet"
              size="md"
              balance="hide"
              disabled={modalPreventionActive}
            />
          </View>

          {/* ✅ Alternative: Manual trigger button */}
          <Pressable
            style={[
              styles.manualConnectButton,
              modalPreventionActive && styles.disabledButton,
            ]}
            onPress={handleOpenWalletModal}
            disabled={modalPreventionActive}
          >
            <Ionicons name="link-outline" size={20} color="white" />
            <Text style={styles.manualConnectButtonText}>
              {modalPreventionActive ? "Initializing..." : "Open Wallet Modal"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ SAFE: Simplified wallet info display */}
      <View style={styles.walletInfo}>
        <View style={styles.walletHeader}>
          <View style={styles.walletIcon}>
            <Ionicons name="wallet" size={20} color="#007AFF" />
          </View>
          <View style={styles.walletDetails}>
            <Text style={styles.walletAddress}>
              {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
            </Text>
            <Text style={styles.walletConnector}>{connector?.name}</Text>
          </View>
        </View>

        {/* ✅ Network Status Indicator */}
        <View style={styles.networkStatus}>
          <View
            style={[
              styles.networkDot,
              { backgroundColor: isOnCorrectNetwork ? "#34C759" : "#FF9500" },
            ]}
          />
          <Text style={styles.networkText}>
            {isOnCorrectNetwork ? "Manta Pacific" : "Wrong Network"}
          </Text>
        </View>
      </View>

      {/* ✅ SAFE: Manual control buttons */}
      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.buttonGrid}>
          <Pressable style={styles.actionButton} onPress={handleViewCourses}>
            <Ionicons name="book-outline" size={20} color="white" />
            <Text style={styles.buttonText}>My Courses</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              (!isInitialized || !isOnCorrectNetwork) &&
                styles.disabledActionButton,
            ]}
            onPress={handleCreateCourse}
            disabled={!isInitialized || !isOnCorrectNetwork}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Create Course</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              !isInitialized && styles.disabledActionButton,
            ]}
            onPress={handleViewCertificates}
            disabled={!isInitialized}
          >
            <Ionicons name="trophy-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Certificates</Text>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              modalPreventionActive && styles.disabledActionButton,
            ]}
            onPress={handleOpenWalletModal}
            disabled={modalPreventionActive}
          >
            <Ionicons name="settings-outline" size={20} color="white" />
            <Text style={styles.buttonText}>
              {modalPreventionActive ? "Initializing..." : "Wallet Settings"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ✅ Network Actions */}
      {!isOnCorrectNetwork && (
        <View style={styles.networkSection}>
          <Text style={styles.networkWarningTitle}>Network Required</Text>
          <Text style={styles.networkWarningText}>
            Switch to Manta Pacific Testnet to access all features
          </Text>
          <Pressable
            style={[
              styles.switchNetworkButton,
              (isSwitchPending || modalPreventionActive) &&
                styles.disabledButton,
            ]}
            onPress={handleSwitchNetwork}
            disabled={isSwitchPending || modalPreventionActive}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color="white" />
            <Text style={styles.switchNetworkButtonText}>
              {isSwitchPending ? "Switching..." : "Switch to Manta Pacific"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ✅ System Status */}
      <View style={styles.statusSection}>
        <View style={styles.statusItem}>
          <Ionicons
            name={isInitialized ? "checkmark-circle" : "time-outline"}
            size={16}
            color={isInitialized ? "#34C759" : "#FF9500"}
          />
          <Text style={styles.statusText}>
            Contracts: {isInitialized ? "Ready" : "Initializing..."}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Ionicons
            name={isOnCorrectNetwork ? "checkmark-circle" : "warning-outline"}
            size={16}
            color={isOnCorrectNetwork ? "#34C759" : "#FF9500"}
          />
          <Text style={styles.statusText}>
            Network: {isOnCorrectNetwork ? "Connected" : "Switch Required"}
          </Text>
        </View>
      </View>

      {/* ✅ Disconnect Button */}
      <View style={styles.disconnectSection}>
        <Pressable style={styles.disconnectButton} onPress={handleDisconnect}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 16,
  },

  // ✅ Disconnected State
  disconnectedState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  disconnectedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  disconnectedSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  connectButtonContainer: {
    width: "100%",
    marginBottom: 12,
  },
  manualConnectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
  },
  manualConnectButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },

  // ✅ Connected State
  walletInfo: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  walletDetails: {
    flex: 1,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "monospace",
  },
  walletConnector: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
  },
  networkStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  networkText: {
    fontSize: 12,
    color: "#8E8E93",
  },

  // ✅ Action Section
  actionSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: "48%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: "#C7C7CC",
    opacity: 0.6,
  },
  disabledActionButton: {
    backgroundColor: "#C7C7CC",
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 6,
  },

  // ✅ Network Section
  networkSection: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9500",
  },
  networkWarningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF9500",
    marginBottom: 4,
  },
  networkWarningText: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 12,
  },
  switchNetworkButton: {
    backgroundColor: "#FF9500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  switchNetworkButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 6,
  },

  // ✅ Status Section
  statusSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    color: "#8E8E93",
    marginLeft: 8,
  },

  // ✅ Disconnect Section
  disconnectSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF3B30",
    backgroundColor: "transparent",
  },
  disconnectButtonText: {
    color: "#FF3B30",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
});
