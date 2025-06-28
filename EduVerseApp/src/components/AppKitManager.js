// src/components/AppKitManager.js - MASTER: Complete prevention
import { useEffect, useRef } from "react";
import { useAppKit, useAppKitState } from "@reown/appkit-wagmi-react-native";
import { useAccount } from "wagmi";
import { useWeb3 } from "../contexts/Web3Context";

export function AppKitManager() {
  const { open } = useAppKit();
  const { selectedNetworkId } = useAppKitState();
  const { isConnected, status } = useAccount();
  const { modalPreventionActive } = useWeb3();

  // ✅ MASTER: Track modal state to prevent auto-opening
  const modalStateRef = useRef({
    hasOpenedManually: false,
    lastConnectionStatus: null,
    isInitializing: true,
    preventionTimeout: null,
  });

  // ✅ CRITICAL: Override AppKit's auto-open behavior
  useEffect(() => {
    if (modalStateRef.current.isInitializing) {
      modalStateRef.current.preventionTimeout = setTimeout(() => {
        modalStateRef.current.isInitializing = false;
      }, 5000); // Extended initialization period
    }

    return () => {
      if (modalStateRef.current.preventionTimeout) {
        clearTimeout(modalStateRef.current.preventionTimeout);
      }
    };
  }, []);

  // ✅ MASTER: Monitor connection changes without triggering modal
  useEffect(() => {
    const currentStatus = status;
    const wasConnected =
      modalStateRef.current.lastConnectionStatus === "connected";
    const isNowConnected = currentStatus === "connected";

    // ✅ Only log significant state changes
    if (modalStateRef.current.lastConnectionStatus !== currentStatus) {
      console.log(
        `🔗 Connection status: ${modalStateRef.current.lastConnectionStatus} → ${currentStatus}`
      );
      modalStateRef.current.lastConnectionStatus = currentStatus;
    }

    // ✅ CRITICAL: NEVER auto-open modal during contract initialization
    if (modalPreventionActive) {
      console.log("🚫 Modal auto-opening prevented during initialization");
      return;
    }

    // ✅ CRITICAL: Do NOT auto-open modal on connection changes
    // Let user manually open modal via buttons ONLY
  }, [status, isConnected, modalPreventionActive]);

  // ✅ Don't render anything - this is just a state manager
  return null;
}
