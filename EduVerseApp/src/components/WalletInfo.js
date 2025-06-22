// src/components/WalletInfo.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function WalletInfo({ address }) {
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Connected</Text>
      <Text style={styles.address}>{formatAddress(address)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: "#666",
    fontFamily: "monospace",
  },
});
