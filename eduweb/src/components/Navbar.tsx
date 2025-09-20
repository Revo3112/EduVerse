"use client"

import { ConnectButton } from "./ConnectButton"
import { ThemeSwitcher } from "./ThemeSwitcher"

export function EduVerseNavbar() {
  return (
    <nav className="h-16 border-b dark:border-white/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-end px-6">
        {/* Right side - User controls */}
        <div className="flex items-center gap-4">
          <ConnectButton />
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  )
}
