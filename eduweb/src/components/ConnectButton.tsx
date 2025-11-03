"use client";

import { client } from "@/app/client";
import { chain } from "@/lib/chains";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  darkTheme,
  lightTheme,
  ConnectButton as ThirdWebButton,
} from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";

// Import wallet configs statically untuk menghindari dynamic import 404 errors
// Ini adalah workaround untuk issue Turbopack dengan thirdweb wallet dynamic imports

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { resolvedTheme } = useTheme(); // Use resolvedTheme to properly handle "system" mode
  const [mounted, setMounted] = useState(false);

  // Fix hydration error by ensuring component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Enhanced wallet configuration with full options
  // Gunakan useMemo untuk memastikan wallet configs stabil dan tidak re-create setiap render
  const wallets = useState(() => [
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
  ])[0];

  // Enhanced theme configuration matching EduVerse design system (globals.css)
  // Colors extracted from oklch values with accurate HSL conversion
  const getThemeConfig = () => {
    if (!mounted) return undefined;

    if (resolvedTheme === "dark") {
      return darkTheme({
        colors: {
          // Core modal colors matching #18181D background
          modalBg: "hsl(252, 10%, 11%)", // #18181D - main dark background with purple tint
          primaryText: "hsl(0, 0%, 98%)", // #FAFAFA - foreground text
          secondaryText: "hsl(0, 0%, 71%)", // #B5B5B5 - muted foreground
          accentText: "hsl(0, 0%, 98%)", // #FAFAFA - accent text

          // Border and separator colors
          borderColor: "hsl(0, 0%, 12%)", // #1F1F1F - subtle border
          separatorLine: "hsl(0, 0%, 12%)", // #1F1F1F - consistent separator

          // Button colors
          primaryButtonBg: "hsl(0, 0%, 92%)", // #EBEBEB - light button on dark (primary)
          primaryButtonText: "hsl(0, 0%, 15%)", // #262626 - dark text on light button
          accentButtonBg: "hsl(0, 0%, 92%)", // #EBEBEB - matching primary
          accentButtonText: "hsl(0, 0%, 15%)", // #262626 - matching primary foreground

          // Secondary button colors (elevated elements)
          secondaryButtonBg: "hsl(0, 0%, 22%)", // #373737 - elevated UI elements
          secondaryButtonHoverBg: "hsl(0, 0%, 26%)", // Slightly lighter on hover
          secondaryButtonText: "hsl(0, 0%, 71%)", // #B5B5B5 - muted text

          // Connected wallet button colors
          connectedButtonBg: "hsl(0, 0%, 22%)", // #373737 - matching secondary
          connectedButtonBgHover: "hsl(0, 0%, 26%)", // Consistent hover state

          // Input and tertiary backgrounds
          tertiaryBg: "hsl(0, 0%, 15%)", // #262626 - card background
          inputAutofillBg: "hsl(0, 0%, 22%)", // #373737 - input background

          // Icon colors
          secondaryIconColor: "hsl(0, 0%, 71%)", // #B5B5B5 - muted icons
          secondaryIconHoverColor: "hsl(0, 0%, 98%)", // #FAFAFA - icon hover
          secondaryIconHoverBg: "hsl(0, 0%, 22%)", // #373737 - icon hover bg

          // Utility colors
          selectedTextBg: "hsl(0, 0%, 22%)", // #373737 - selection background
          selectedTextColor: "hsl(0, 0%, 98%)", // #FAFAFA - selection text
          skeletonBg: "hsl(0, 0%, 22%)", // #373737 - loading skeleton
          scrollbarBg: "hsl(0, 0%, 22%)", // #373737 - scrollbar
          tooltipBg: "hsl(0, 0%, 15%)", // #262626 - tooltip background
          tooltipText: "hsl(0, 0%, 98%)", // #FAFAFA - tooltip text

          // Overlay
          modalOverlayBg: "rgba(24, 24, 29, 0.8)", // Semi-transparent background overlay

          // Status colors (keep standard)
          success: "hsl(142, 76%, 36%)",
          danger: "hsl(0, 84%, 60%)",
        },
      });
    } else {
      return lightTheme({
        colors: {
          // Core modal colors matching #FFFFFF background
          modalBg: "hsl(0, 0%, 100%)", // #FFFFFF - white background
          primaryText: "hsl(0, 0%, 13%)", // #212121 - foreground text
          secondaryText: "hsl(0, 0%, 56%)", // #8E8E8E - muted foreground
          accentText: "hsl(0, 0%, 13%)", // #212121 - accent text

          // Border and separator colors
          borderColor: "hsl(0, 0%, 92%)", // #EBEBEB - border
          separatorLine: "hsl(0, 0%, 92%)", // #EBEBEB - consistent separator

          // Button colors
          primaryButtonBg: "hsl(0, 0%, 19%)", // #313131 - primary button
          primaryButtonText: "hsl(0, 0%, 98%)", // #FAFAFA - light text on dark button
          accentButtonBg: "hsl(0, 0%, 19%)", // #313131 - matching primary
          accentButtonText: "hsl(0, 0%, 98%)", // #FAFAFA - matching primary foreground

          // Secondary button colors (elevated elements)
          secondaryButtonBg: "hsl(0, 0%, 97%)", // #F7F7F7 - subtle elevation
          secondaryButtonHoverBg: "hsl(0, 0%, 94%)", // Slightly darker on hover
          secondaryButtonText: "hsl(0, 0%, 56%)", // #8E8E8E - muted text

          // Connected wallet button colors
          connectedButtonBg: "hsl(0, 0%, 97%)", // #F7F7F7 - matching secondary
          connectedButtonBgHover: "hsl(0, 0%, 94%)", // Consistent hover state

          // Input and tertiary backgrounds
          tertiaryBg: "hsl(0, 0%, 97%)", // #F7F7F7 - subtle background
          inputAutofillBg: "hsl(0, 0%, 97%)", // #F7F7F7 - input background

          // Icon colors
          secondaryIconColor: "hsl(0, 0%, 56%)", // #8E8E8E - muted icons
          secondaryIconHoverColor: "hsl(0, 0%, 13%)", // #212121 - icon hover
          secondaryIconHoverBg: "hsl(0, 0%, 97%)", // #F7F7F7 - icon hover bg

          // Utility colors
          selectedTextBg: "hsl(0, 0%, 97%)", // #F7F7F7 - selection background
          selectedTextColor: "hsl(0, 0%, 13%)", // #212121 - selection text
          skeletonBg: "hsl(0, 0%, 97%)", // #F7F7F7 - loading skeleton
          scrollbarBg: "hsl(0, 0%, 92%)", // #EBEBEB - scrollbar
          tooltipBg: "hsl(0, 0%, 13%)", // #212121 - tooltip background
          tooltipText: "hsl(0, 0%, 98%)", // #FAFAFA - tooltip text

          // Overlay
          modalOverlayBg: "rgba(255, 255, 255, 0.8)", // Semi-transparent white overlay

          // Status colors (keep standard)
          success: "hsl(142, 76%, 36%)",
          danger: "hsl(0, 84%, 60%)",
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
            subtitle:
              "Access decentralized learning features with your wallet. Choose from 500+ supported wallets.",
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
            // Matching design system colors
            borderColor:
              resolvedTheme === "dark" ? "hsl(0, 0%, 12%)" : "hsl(0, 0%, 92%)",
            backgroundColor:
              resolvedTheme === "dark" ? "hsl(0, 0%, 92%)" : "hsl(0, 0%, 19%)",
            color:
              resolvedTheme === "dark" ? "hsl(0, 0%, 15%)" : "hsl(0, 0%, 98%)",
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
            // Matching design system colors
            borderColor:
              resolvedTheme === "dark" ? "hsl(0, 0%, 12%)" : "hsl(0, 0%, 92%)",
            backgroundColor:
              resolvedTheme === "dark" ? "hsl(0, 0%, 22%)" : "hsl(0, 0%, 97%)",
            color:
              resolvedTheme === "dark" ? "hsl(0, 0%, 71%)" : "hsl(0, 0%, 56%)",
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
