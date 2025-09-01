"use client"

import * as React from "react"
import { SidebarModeProvider, useSidebarMode } from "./SidebarModeProvider"
import { IntegratedSidebar } from "./IntegratedSidebar"
import { EduVerseNavbar } from "./EnhancedNavbar"
import { cn } from "@/lib/utils"

interface EnhancedLayoutProps {
  children: React.ReactNode
  className?: string
}

function LayoutContent({ children, className }: EnhancedLayoutProps) {
  const { mode } = useSidebarMode()

  // Calculate content margin based on sidebar state
  const getContentMargin = () => {
    if (mode === "hover") {
      return "ml-0" // No margin for hover mode
    }
    // Drawer mode - full sidebar visible
    return "ml-[280px]" // Full sidebar width (280px)
  }

  return (
    <div className={cn("flex h-screen w-full bg-background", className)}>
      {/* Integrated sidebar */}
      <IntegratedSidebar />

      {/* Main content area with dynamic margin */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          getContentMargin()
        )}
      >
        {/* Header */}
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

export function EnhancedLayout({ children, className }: EnhancedLayoutProps) {
  return (
    <SidebarModeProvider>
      <LayoutContent className={className}>
        {children}
      </LayoutContent>
    </SidebarModeProvider>
  )
}
