// src/screens/MainScreen.js
import { AppKitButton } from "@reown/appkit-wagmi-react-native";
import WalletInfo from "../components/WalletInfo";
import ActionButtons from "../components/ActionButtons";
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAccount, useDisconnect } from "wagmi";

export default function MainScreen() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>EduVerse App</Text>
        <Text style={styles.subtitle}>Connect your wallet to get started</Text>
      </View>

      <View style={styles.connectSection}>
        <AppKitButton />
      </View>

      {isConnected && (
        <>
          <WalletInfo address={address} />
          <ActionButtons />
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Reown AppKit</Text>
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
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
});
