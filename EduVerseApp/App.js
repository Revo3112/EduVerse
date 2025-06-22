// Order matters - polyfills first, then WalletConnect compat
import "@walletconnect/react-native-compat";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, arbitrum } from "@wagmi/core/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createAppKit,
  defaultWagmiConfig,
  AppKit,
} from "@reown/appkit-wagmi-react-native";

import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, LogBox } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import MainScreen from "./src/screens/MainScreen";

// Ignore specific warnings that we can't fix directly
LogBox.ignoreLogs([
  "react-native-compat: Application module is not available",
  "Please use proxy object",
  "setLayoutAnimationEnabledExperimental is currently a no-op",
  "WalletConnect Core is already initialized",
  "Attempted to import the module",
]);

// Keep the splash screen visible while we initialize the app
SplashScreen.preventAutoHideAsync();

// 0. Setup queryClient
const queryClient = new QueryClient();

// 1. Get projectId at https://cloud.reown.com
const projectId = "6d55c9d1dbc781ab9b518c4dcdc35827";

// 2. Create config
const metadata = {
  name: "EduVerseApp",
  description: "Educational Blockchain Platform",
  url: "https://eduverse.app",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
  redirect: {
    native: "eduverse://",
    universal: "https://eduverse.app",
  },
};

const chains = [mainnet, polygon, arbitrum];

const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

// 3. Create modal
createAppKit({
  projectId,
  wagmiConfig,
  defaultChain: mainnet,
  enableAnalytics: true,
  features: {
    email: true,
    socials: ["x", "discord", "apple"],
  },
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
        // Pre-load fonts, make API calls, etc.
        // Artificial delay to ensure polyfills are properly loaded
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately
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
          <MainScreen />
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
