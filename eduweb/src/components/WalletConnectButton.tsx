"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Wallet, LogOut } from "lucide-react"

interface WalletConnectButtonProps {
  className?: string
}

export function WalletConnectButton({ className }: WalletConnectButtonProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string>("")

  // Simulate wallet connection state - Replace with actual wallet logic
  const connectWallet = async () => {
    try {
      // This would be replaced with actual wallet connection logic
      // For now, simulating connection
      setIsConnected(true)
      setAddress("0x1234...5678")
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setAddress("")
  }

  const formatAddress = (addr: string) => {
    if (!addr) return ""
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          onClick={disconnectWallet}
          className="w-full justify-start"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <Wallet className="h-4 w-4 mr-2" />
              <span>{formatAddress(address)}</span>
            </div>
            <LogOut className="h-4 w-4" />
          </div>
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      <Button
        onClick={connectWallet}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
    </div>
  )
}
