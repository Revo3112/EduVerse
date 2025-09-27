/**
 * EduVerse Wallet State Hook
 *
 * Provides a unified interface for wallet state management using Thirdweb.
 * This hook centralizes wallet connection logic and can be used throughout
 * the application for consistent wallet handling.
 *
 * Features:
 * - Real wallet connection status
 * - Account information access
 * - Wallet instance access
 * - Safe disconnect functionality
 * - Toast notifications for user feedback
 * - Error handling
 */

import { useCallback } from "react"
import { toast } from "sonner"
import { useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react"

export const useWalletState = () => {
  const account = useActiveAccount()
  const wallet = useActiveWallet()
  const { disconnect } = useDisconnect()

  const handleDisconnect = useCallback(async () => {
    try {
      // For useDisconnect in thirdweb, we need to pass the wallet instance
      if (wallet) {
        await disconnect(wallet)
        toast.success("Wallet disconnected!")
      }
    } catch (error) {
      console.error("Disconnect error:", error)
      toast.error("Failed to disconnect wallet")
    }
  }, [disconnect, wallet])

  const handleConnect = useCallback(() => {
    // This function is for consistency, but actual connection
    // is handled by the ConnectButton component
    toast.info("Use the Connect Button to connect your wallet")
  }, [])

  return {
    // Connection status
    isConnected: !!account,
    isLoading: false, // Thirdweb handles loading state internally

    // Account and wallet information
    address: account?.address || null,
    account,
    wallet,

    // Actions
    connect: handleConnect,
    disconnect: handleDisconnect,

    // Helper methods
    formatAddress: useCallback((addr?: string) => {
      const address = addr || account?.address
      if (!address) return ""
      return `${address.slice(0, 6)}...${address.slice(-4)}`
    }, [account?.address]),

    // Network information (if needed later)
    chainId: wallet?.getChain()?.id,

    // Status helpers
    get isWalletReady() {
      return !!account && !!wallet
    }
  }
}

export type WalletState = ReturnType<typeof useWalletState>
