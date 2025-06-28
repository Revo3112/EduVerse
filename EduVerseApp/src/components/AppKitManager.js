// src/components/AppKitManager.js - PRODUCTION READY: Zero auto-triggers
import { useEffect, useRef } from "react";
import { useAppKit, useAppKitState } from "@reown/appkit-wagmi-react-native";
import { useAccount } from "wagmi";
import { useSmartContract } from "../hooks/useBlockchain";

export function AppKitManager() {
  const { open } = useAppKit();
  const { selectedNetworkId } = useAppKitState();
  const { isConnected, status } = useAccount();
  const { modalPreventionActive } = useSmartContract();

  // ✅ PRODUCTION: Track modal state to prevent auto-opening
  const modalStateRef = useRef({
    hasOpenedManually: false,
    lastConnectionStatus: null,
    isInitializing: true,
    preventionTimeout: null,
  });

  // ✅ PRODUCTION: Extended initialization period
  useEffect(() => {
    if (modalStateRef.current.isInitializing) {
      modalStateRef.current.preventionTimeout = setTimeout(() => {
        modalStateRef.current.isInitializing = false;
        console.log("✅ AppKit initialization period completed");
      }, 5000);
    }

    return () => {
      if (modalStateRef.current.preventionTimeout) {
        clearTimeout(modalStateRef.current.preventionTimeout);
      }
    };
  }, []);

  // ✅ PRODUCTION: Monitor connection changes without triggering modal
  useEffect(() => {
    const currentStatus = status;

    // Only log significant state changes
    if (modalStateRef.current.lastConnectionStatus !== currentStatus) {
      console.log(
        `🔗 Connection status: ${modalStateRef.current.lastConnectionStatus} → ${currentStatus}`
      );
      modalStateRef.current.lastConnectionStatus = currentStatus;
    }

    // ✅ CRITICAL: NEVER auto-open modal
    // All modal opening should be user-initiated through buttons
  }, [status, isConnected]);

  // ✅ PRODUCTION: Monitor prevention state
  useEffect(() => {
    if (modalPreventionActive) {
      console.log("🚫 Modal prevention is active");
    }
  }, [modalPreventionActive]);

  // Don't render anything - this is just a state manager
  return null;
}
