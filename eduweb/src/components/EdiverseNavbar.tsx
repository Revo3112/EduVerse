"use client"

import { WalletConnectButton } from "./WalletConnectButton"
import { ThemeSwitcher } from "./ThemeSwitcher"

export function EduVerseNavbar() {
  return (
    <nav className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-end px-6 gap-4">
        <WalletConnectButton />
        <ThemeSwitcher />
      </div>
    </nav>
  )
}
