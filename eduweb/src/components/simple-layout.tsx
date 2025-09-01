"use client"

import * as React from "react"
import { ModernFloatingSidebar } from "./modern-floating-sidebar"
import { EduVerseNavbar } from "./eduverse-navbar"
import { cn } from "@/lib/utils"

interface SimpleLayoutProps {
  children: React.ReactNode
  className?: string
}

export function SimpleLayout({ children, className }: SimpleLayoutProps) {
  return (
    <div className={cn("flex h-screen w-full bg-background", className)}>
      {/* Floating sidebar - no layout impact */}
      <ModernFloatingSidebar />

      {/* Full-width main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="flex h-16 items-center justify-end border-b bg-background/95 backdrop-blur px-6 supports-[backdrop-filter]:bg-background/60">
          <EduVerseNavbar />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
