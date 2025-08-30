"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "../app/client";
import { chain } from "../lib/chains";

export function ConnectWallet() {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-foreground mb-1">Connect Your Wallet</h3>
        <p className="text-sm text-muted-foreground">
          Access decentralized learning features
        </p>
      </div>
      <ConnectButton
        client={client}
        chain={chain}
        connectModal={{
          size: "wide",
          titleIcon: "🎓",
          showThirdwebBranding: false,
        }}
        connectButton={{
          label: "Connect to EduVerse",
          style: {
            background: "linear-gradient(135deg, #3B82F6, #6366F1)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
          },
        }}
        detailsButton={{
          style: {
            background: "linear-gradient(135deg, #10B981, #059669)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            fontWeight: "500",
            fontSize: "14px",
          },
        }}
      />
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Supports 500+ wallets including MetaMask, WalletConnect & more
        </p>
      </div>
    </div>
  );
}
