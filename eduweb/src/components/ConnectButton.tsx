"use client";

import { useState, useEffect } from "react";
import { ConnectButton as ThirdWebButton } from "thirdweb/react";
import { client } from "@/app/client";
import { chain } from "@/lib/chains";
import { useTheme } from "next-themes";
import { darkTheme, lightTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Fix hydration error by ensuring component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Enhanced wallet configuration with full options
  const wallets = [
    inAppWallet({
      auth: {
        options: [
          "google",
          "discord",
          "telegram",
          "farcaster",
          "email",
          "x",
          "passkey",
          "phone",
        ],
      },
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("io.rabby"),
    createWallet("io.zerion.wallet"),
    createWallet("org.uniswap"),
  ];

  // Enhanced theme configuration with better color schemes
  const getThemeConfig = () => {
    if (!mounted) return undefined;

    if (theme === "dark") {
      return darkTheme({
        colors: {
          secondaryText: "hsl(215, 13%, 65%)",
          accentText: "hsl(0, 0%, 100%)",
          modalBg: "hsl(222, 84%, 4%)",
          borderColor: "hsl(217, 32%, 17%)",
          accentButtonBg: "hsl(0, 0%, 100%)",
          accentButtonText: "hsl(222, 84%, 4%)",
          primaryButtonBg: "hsl(0, 0%, 100%)",
          primaryButtonText: "hsl(222, 84%, 4%)",
          primaryText: "hsl(0, 0%, 100%)",
          secondaryButtonBg: "hsl(217, 32%, 17%)",
          secondaryButtonText: "hsl(215, 13%, 65%)",
          connectedButtonBg: "hsl(217, 32%, 17%)",
          connectedButtonBgHover: "hsl(217, 32%, 25%)",
        },
      });
    } else {
      return lightTheme({
        colors: {
          secondaryText: "hsl(215, 13%, 35%)",
          accentText: "hsl(222, 84%, 4%)",
          modalBg: "hsl(0, 0%, 100%)",
          borderColor: "hsl(214, 32%, 91%)",
          accentButtonBg: "hsl(222, 84%, 4%)",
          accentButtonText: "hsl(0, 0%, 100%)",
          primaryButtonBg: "hsl(222, 84%, 4%)",
          primaryButtonText: "hsl(0, 0%, 100%)",
          primaryText: "hsl(222, 84%, 4%)",
          secondaryButtonBg: "hsl(214, 32%, 91%)",
          secondaryButtonText: "hsl(215, 13%, 35%)",
          connectedButtonBg: "hsl(214, 32%, 91%)",
          connectedButtonBgHover: "hsl(214, 32%, 85%)",
        },
      });
    }
  };

  // Show loading state during hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className={className}>
        <div className="h-10 w-36 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className={className}>
      <ThirdWebButton
        client={client}
        chain={chain}
        wallets={wallets}
        theme={getThemeConfig()}
        appMetadata={{
          name: "EduVerse",
          description: "Web3 Educational Platform - Learn, Earn, Grow",
          logoUrl: "/Eduverse_logo.png",
          url: "https://eduverse.com",
        }}
        connectModal={{
          size: "wide",
          title: "Welcome to EduVerse",
          showThirdwebBranding: false,
          welcomeScreen: {
            title: "Connect to EduVerse",
            subtitle: "Access decentralized learning features with your wallet. Choose from 500+ supported wallets.",
            img: {
              src: "/Eduverse_logo.png",
              width: 80,
              height: 80,
            },
          },
        }}
        connectButton={{
          label: "Connect Wallet",
          style: {
            minWidth: "150px",
            height: "42px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "14px",
            transition: "all 0.2s ease-in-out",
            border: "1px solid",
            borderColor: theme === "dark" ? "hsl(217, 32%, 17%)" : "hsl(214, 32%, 91%)",
            backgroundColor: theme === "dark" ? "hsl(0, 0%, 100%)" : "hsl(222, 84%, 4%)",
            color: theme === "dark" ? "hsl(222, 84%, 4%)" : "hsl(0, 0%, 100%)",
          },
        }}
        detailsButton={{
          displayBalanceToken: {
            [chain.id]: "ETH",
          },
          style: {
            minWidth: "150px",
            height: "42px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "14px",
            transition: "all 0.2s ease-in-out",
            border: "1px solid",
            borderColor: theme === "dark" ? "hsl(217, 32%, 17%)" : "hsl(214, 32%, 91%)",
            backgroundColor: theme === "dark" ? "hsl(217, 32%, 17%)" : "hsl(214, 32%, 91%)",
            color: theme === "dark" ? "hsl(215, 13%, 65%)" : "hsl(215, 13%, 35%)",
          },
        }}
        detailsModal={{
          hideSwitchWallet: false,
          hideDisconnect: false,
        }}
        locale="en_US"
      />
    </div>
  );
}
