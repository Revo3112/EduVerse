// src/screens/MainScreen.js - Improved with Network Switching
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { AppKitButton } from "@reown/appkit-wagmi-react-native";
import { mantaPacificTestnet } from "../constants/blockchain";
import WalletInfo from "../components/WalletInfo";
import ActionButtons from "../components/ActionButtons";

export default function MainScreen() {
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

  const isOnMantaNetwork = chainId === mantaPacificTestnet.id;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>EduVerse App</Text>
        <Text style={styles.subtitle}>Educational Blockchain Platform</Text>
      </View>

      <View style={styles.connectSection}>
        <AppKitButton />
      </View>

      {isConnected && (
        <>
          <View style={styles.networkSection}>
            <Text style={styles.sectionTitle}>Current Network</Text>
            <View style={styles.networkInfo}>
              <Text style={styles.networkName}>Chain ID: {chainId}</Text>
              <Text style={styles.networkName}>
                {chainId === 1 && "Ethereum Mainnet"}
                {chainId === 137 && "Polygon"}
                {chainId === 42161 && "Arbitrum"}
                {chainId === 11155111 && "Sepolia Testnet"}
                {chainId === 3441006 && "Manta Pacific Testnet"}
                {![1, 137, 42161, 11155111, 3441006].includes(chainId) &&
                  "Unknown Network"}
              </Text>
            </View>

            {!isOnMantaNetwork && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={handleSwitchToManta}
                disabled={isPending}
              >
                <Text style={styles.switchButtonText}>
                  {isPending ? "Switching..." : "Switch to Manta Pacific"}
                </Text>
              </TouchableOpacity>
            )}

            {isOnMantaNetwork && (
              <View style={styles.networkStatus}>
                <Text style={styles.networkStatusText}>
                  ✅ Connected to Manta Pacific Testnet
                </Text>
              </View>
            )}
          </View>

          <WalletInfo address={address} />

          {isOnMantaNetwork && <ActionButtons />}

          {!isOnMantaNetwork && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Please switch to Manta Pacific Testnet to access all features
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Reown AppKit</Text>
        <Text style={styles.versionText}>
          {isConnected ? `Connected: ${connector?.name}` : "Not Connected"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  connectSection: {
    marginBottom: 30,
  },
  networkSection: {
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  networkInfo: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  networkName: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  switchButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  switchButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  networkStatus: {
    backgroundColor: "#d4edda",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  networkStatusText: {
    color: "#155724",
    fontWeight: "500",
  },
  warningBox: {
    backgroundColor: "#fff3cd",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  warningText: {
    color: "#856404",
    fontWeight: "500",
    textAlign: "center",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
  versionText: {
    fontSize: 10,
    color: "#ccc",
    marginTop: 5,
  },
});
