// src/components/WalletInfo.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useBalance, useChainId } from "wagmi";

export default function WalletInfo({ address }) {
  const chainId = useChainId();
  const { data: balance, isLoading } = useBalance({
    address,
  });

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = () => {
    // In React Native, you would typically use a clipboard library
    // For now, this is just a placeholder
    console.log("Address copied:", address);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Information</Text>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Address:</Text>
        <TouchableOpacity
          onPress={copyToClipboard}
          style={styles.addressContainer}
        >
          <Text style={styles.address}>{formatAddress(address)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Balance:</Text>
        <Text style={styles.value}>
          {isLoading
            ? "Loading..."
            : `${balance?.formatted || "0"} ${balance?.symbol || "ETH"}`}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Chain ID:</Text>
        <Text style={styles.value}>{chainId}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "100%",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    color: "#333",
    fontWeight: "400",
  },
  addressContainer: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  address: {
    fontSize: 14,
    color: "#007AFF",
    fontFamily: "monospace",
  },
});
