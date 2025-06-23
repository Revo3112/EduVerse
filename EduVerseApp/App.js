import "@walletconnect/react-native-compat";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, arbitrum, sepolia } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createAppKit,
  defaultWagmiConfig,
  AppKit,
} from "@reown/appkit-wagmi-react-native";

import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, LogBox } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ENV_PROJECT_ID } from "@env";
import { mantaPacificTestnet } from "./src/constants/blockchain";
import MainNavigation from "./src/navigation/MainNavigation";

// Ignore specific warnings
LogBox.ignoreLogs([
  "react-native-compat: Application module is not available",
  "Please use proxy object",
  "setLayoutAnimationEnabledExperimental is currently a no-op",
  "WalletConnect Core is already initialized",
  "Attempted to import the module",
  "Warning: Failed to create session",
  "getLoadedFonts is not a function", // Add this to ignore font loader warnings
]);

SplashScreen.preventAutoHideAsync();

// Setup queryClient
const queryClient = new QueryClient();

// Get projectId from environment
const projectId = ENV_PROJECT_ID;

// Improved metadata configuration
const metadata = {
  name: "EduVerse App",
  description: "Educational Blockchain Platform for Learning",
  url: "https://eduverse.app",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
  redirect: {
    native: "eduverse://",
    universal: "https://eduverse.app",
  },
};

// Chain configuration - put mainnet first as default, then add custom chains
const chains = [mainnet, sepolia, polygon, arbitrum, mantaPacificTestnet];

const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

// Create AppKit with improved configuration
createAppKit({
  projectId,
  wagmiConfig,
  defaultChain: mantaPacificTestnet, // Set Manta Pacific as default
  enableAnalytics: true,
  debug: false,
  features: {
    email: true,
    socials: ["x", "discord", "apple"],
    emailShowWallets: true,
    swaps: false,
  },
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
    "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369", // Rainbow
    "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", // Trust
  ],
});

// WagmiWeb3ModalProvider component
function WagmiWeb3ModalProvider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <AppKit />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Ensure polyfills are loaded
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Check if projectId is available
        if (!projectId) {
          console.error(
            "Project ID is not configured. Please check your .env file."
          );
        }
      } catch (e) {
        console.warn("App preparation error:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <WagmiWeb3ModalProvider>
        <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
          <NavigationContainer>
            <MainNavigation />
          </NavigationContainer>
          <StatusBar style="auto" />
        </SafeAreaView>
      </WagmiWeb3ModalProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
