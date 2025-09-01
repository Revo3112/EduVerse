"use client"

import { WalletConnectButton } from "./wallet-connect-button"
import { ThemeSwitcher } from "./theme-switcher"

export function EduVerseNavbar() {
  return (
    <nav className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-end px-6">
        {/* Right side - User controls */}
        <div className="flex items-center gap-4">
          <WalletConnectButton />
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  )
}
