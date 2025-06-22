// src/components/ActionButtons.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAccount, useBalance, useDisconnect } from "wagmi";

export default function ActionButtons() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address: address,
  });

  const handleViewBalance = () => {
    if (balance) {
      Alert.alert(
        "Wallet Balance",
        `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`,
        [{ text: "OK" }]
      );
    } else {
      Alert.alert("Balance", "Unable to fetch balance", [{ text: "OK" }]);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleViewBalance}>
        <Text style={styles.buttonText}>View Balance</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.disconnectButton]}
        onPress={handleDisconnect}
      >
        <Text style={[styles.buttonText, styles.disconnectText]}>
          Disconnect
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 12,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  disconnectButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disconnectText: {
    color: "white",
  },
});
