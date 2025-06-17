import {
  StyleSheet,
  Image,
  View,
  SafeAreaView,
  Platform,
  StatusBar,
  Pressable,
  Modal,
  TouchableOpacity,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { HelloWave } from "@/components/HelloWave";
import { ThemedText } from "@/components/ThemedText";
import {
  ConnectEmbed,
  lightTheme,
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
} from "thirdweb/react";
import { client } from "@/constants/thirdweb";
import { createWallet } from "thirdweb/wallets";
import { useState, useEffect } from "react";
import { shortenAddress } from "thirdweb/utils";
import { mantaPacificTestnet } from "thirdweb/chains";
import {
  getUserEmail,
  hasStoredPasskey,
  inAppWallet,
} from "thirdweb/wallets/in-app";

// Define supported wallets directly in this file, following the pattern in index.tsx
const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "facebook",
        "discord",
        "telegram",
        "email",
        "phone",
        "passkey",
      ],
      passkeyDomain: "thirdweb.com",
    },
    smartAccount: {
      chain: mantaPacificTestnet,
      sponsorGas: true,
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet", {
    appMetadata: { name: "EduVerse" },
    mobileConfig: {
      callbackURL: Platform.OS === "web" ? window.location.href : "eduverse://",
    },
  }),
  createWallet("me.rainbow"),
  createWallet("com.trustwallet.app"),
  createWallet("io.zerion.wallet"),
];

const Home = () => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const [email, setEmail] = useState<string | undefined>();

  // Get email for inApp wallet
  useEffect(() => {
    if (wallet && wallet.id === "inApp") {
      getUserEmail({ client }).then(setEmail);
    }
  }, [wallet]);

  // Close modal when connected
  useEffect(() => {
    if (wallet && account) {
      setShowConnectModal(false);
    }
  }, [wallet, account]);

  // Render connect or wallet button
  const renderWalletButton = () => {
    if (account && wallet) {
      return (
        <Pressable
          style={styles.connectedWalletButton}
          onPress={() => setShowAccountModal(true)}
        >
          <View style={styles.walletIconContainer}>
            <View style={styles.walletIcon}>
              <ThemedText style={styles.walletIconText}>
                {wallet.id === "inApp"
                  ? "E"
                  : wallet.id.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          </View>
        </Pressable>
      );
    } else {
      return (
        <Pressable
          style={styles.connectWalletButton}
          onPress={() => setShowConnectModal(true)}
        >
          <ThemedText style={styles.connectButtonText}>
            Connect Wallet
          </ThemedText>
        </Pressable>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <View style={styles.titleContainer}>
          <HelloWave />
          <ThemedText type="title">EduVerse</ThemedText>
        </View>
        {renderWalletButton()}
      </ThemedView>

      {/* Connect Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={showConnectModal}
        onRequestClose={() => setShowConnectModal(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <ThemedText style={styles.modalTitle}>
                  ✨ Connect to EduVerse
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setShowConnectModal(false)}
                style={styles.closeButton}
              >
                <ThemedText style={styles.closeButtonText}>×</ThemedText>
              </Pressable>
            </View>
            <View style={styles.connectEmbedContainer}>
              <ConnectEmbed
                client={client}
                chain={mantaPacificTestnet}
                wallets={wallets}
                theme={lightTheme({
                  colors: {
                    primaryButtonBg: "#F9F4FF",
                    modalBg: "#FFFFFF",
                    borderColor: "#B76DE8",
                    accentButtonBg: "#9747FF",
                    primaryText: "#9747FF",
                    secondaryIconColor: "#9747FF",
                    secondaryText: "#7E6F96",
                    secondaryButtonBg: "#9747FF",
                    connectedButtonBg: "#F9F4FF",
                    connectedButtonBgHover: "#EFE6FF",
                  },
                })}
                onConnect={() => setShowConnectModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Details Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={showAccountModal}
        onRequestClose={() => setShowAccountModal(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.accountModalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Account Details</ThemedText>
              <Pressable
                onPress={() => setShowAccountModal(false)}
                style={styles.closeButton}
              >
                <ThemedText style={styles.closeButtonText}>×</ThemedText>
              </Pressable>
            </View>
            {account && wallet && (
              <View style={styles.accountDetailsContainer}>
                <View style={styles.accountInfoSection}>
                  <ThemedText style={styles.accountInfoLabel}>
                    Wallet
                  </ThemedText>
                  <ThemedText style={styles.accountInfoValue}>
                    {wallet.id}
                  </ThemedText>
                </View>
                <View style={styles.accountInfoSection}>
                  <ThemedText style={styles.accountInfoLabel}>
                    Address
                  </ThemedText>
                  <ThemedText style={styles.accountInfoValue}>
                    {shortenAddress(account.address)}
                  </ThemedText>
                </View>
                {email && (
                  <View style={styles.accountInfoSection}>
                    <ThemedText style={styles.accountInfoLabel}>
                      Email
                    </ThemedText>
                    <ThemedText style={styles.accountInfoValue}>
                      {email}
                    </ThemedText>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={() => {
                    disconnect(wallet);
                    setShowAccountModal(false);
                  }}
                >
                  <ThemedText style={styles.disconnectButtonText}>
                    Disconnect
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  titleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  connectWalletButton: {
    backgroundColor: "#F2E6FF",
    borderRadius: 9999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#9747FF",
    shadowColor: "#9747FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  connectButtonText: {
    color: "#8021FF",
    fontWeight: "600",
    fontSize: 16,
    textTransform: "lowercase",
  },
  connectedWalletButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  walletIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9747FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#9341CC",
    justifyContent: "center",
    alignItems: "center",
  },
  walletIconText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 440,
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accountModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  modalTitleContainer: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#000000" },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#555",
    lineHeight: 24,
    textAlign: "center",
  },
  connectEmbedContainer: { width: "100%", padding: 16, height: 500 },
  accountDetailsContainer: { padding: 16 },
  accountInfoSection: { marginBottom: 16 },
  accountInfoLabel: { fontSize: 14, color: "#666", marginBottom: 4 },
  accountInfoValue: { fontSize: 16, color: "#333", fontWeight: "500" },
  disconnectButton: {
    backgroundColor: "#ff4d4f",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  disconnectButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 16 },
});

export default Home;
