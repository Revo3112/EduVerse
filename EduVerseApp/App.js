// src/App.js - MASTER: Complete stability
import "@walletconnect/react-native-compat";
import { WagmiProvider } from "wagmi";
import { sepolia } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createAppKit,
  defaultWagmiConfig,
  AppKit,
} from "@reown/appkit-wagmi-react-native";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { StyleSheet, LogBox, Alert } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ENV_PROJECT_ID } from "@env";
import { mantaPacificTestnet } from "./src/constants/blockchain";
import MainNavigation from "./src/navigation/MainNavigation";
import { Web3Provider } from "./src/contexts/Web3Context";
import { AppKitManager } from "./src/components/AppKitManager";

// Ignore warnings
LogBox.ignoreLogs([
  "react-native-compat: Application module is not available",
  "Please use proxy object",
  "setLayoutAnimationEnabledExperimental is currently a no-op",
  "WalletConnect Core is already initialized",
  "Attempted to import the module",
  "Warning: Failed to create session",
  "getLoadedFonts is not a function",
  "Duplicate session",
  "Session already exists",
]);

SplashScreen.preventAutoHideAsync();

// ✅ MASTER: Stable configuration objects
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 120000, // Longer cache
      gcTime: 300000, // Extended garbage collection
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      refetchIntervalInBackground: false, // ✅ Prevent background refetch
    },
  },
});

const projectId = ENV_PROJECT_ID;

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

const chains = [mantaPacificTestnet, sepolia];

// ✅ MASTER: Ultra-stable wagmi config
const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  pollingInterval: 30000, // Much longer polling
  cacheTime: 300000, // Extended cache
  batch: {
    multicall: true,
  },
  autoConnect: false, // ✅ Critical: No auto-connect
  persister: null, // ✅ Disable persistence to prevent state conflicts
});

// ✅ MASTER: AppKit with minimal features to reduce state changes
createAppKit({
  projectId,
  wagmiConfig,
  defaultChain: mantaPacificTestnet,
  enableAnalytics: false,
  debug: false, // ✅ Disable debug in production
  features: {
    email: true,
    socials: ["x", "discord", "apple"],
    emailShowWallets: true,
    swaps: false,
    onramp: false, // ✅ Disable features that can cause state changes
  },
  themeMode: "light", // ✅ Fixed theme to prevent theme changes
  themeVariables: {
    "--w3m-z-index": 1000, // ✅ Ensure proper z-index
  },
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
    "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",
    "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0",
  ],
});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  // ✅ MASTER: Stable preparation with error handling
  useEffect(() => {
    async function prepare() {
      try {
        console.log("🚀 Starting app preparation...");

        if (!projectId) {
          console.error(
            "Project ID is not configured. Please check your .env file."
          );
          Alert.alert(
            "Configuration Error",
            "Project ID is missing. Please check your environment configuration."
          );
        }

        // ✅ Add preparation delay for stability
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log("✅ App preparation completed");
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

  // ✅ MASTER: Memoized providers to prevent unnecessary re-renders
  const providers = useMemo(
    () => (
      <SafeAreaProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <Web3Provider>
              <AppKitManager />
              <SafeAreaView
                style={styles.container}
                onLayout={onLayoutRootView}
              >
                <NavigationContainer>
                  <MainNavigation />
                </NavigationContainer>
                <StatusBar style="auto" />
                <AppKit />
              </SafeAreaView>
            </Web3Provider>
          </QueryClientProvider>
        </WagmiProvider>
      </SafeAreaProvider>
    ),
    [appIsReady, onLayoutRootView]
  );

  if (!appIsReady) {
    return null;
  }

  return providers;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
