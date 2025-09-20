"use client"

import { cn } from "@/lib/utils"
import * as React from "react"
import { memo, useMemo } from "react"
import { EduVerseNavbar } from "./Navbar"
import { IntegratedSidebar } from "./Sidebar"
import { SidebarModeProvider, useSidebarMode } from "./SidebarProvider"

interface EnhancedLayoutProps {
  children: React.ReactNode
  className?: string
}

// Memoized layout content to prevent unnecessary re-renders
const LayoutContent = memo<EnhancedLayoutProps>(({ children, className }) => {
  const { mode } = useSidebarMode()

  // Memoize margin calculation to avoid recalculating on every render
  const contentMarginClass = useMemo(() => {
    if (mode === "hover") {
      return "ml-0" // No margin for hover mode
    }
    return "ml-[280px]" // Full sidebar width (280px) for drawer mode
  }, [mode]);

  // Memoize transition classes to avoid string concatenation on each render
  const mainContentClass = useMemo(() =>
    cn(
      "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
      contentMarginClass
    ),
    [contentMarginClass]
  );

  const containerClass = useMemo(() =>
    cn("flex h-screen w-full bg-background", className),
    [className]
  );

  return (
    <div className={containerClass}>
      {/* Integrated sidebar */}
      <IntegratedSidebar />

      {/* Main content area with dynamic margin */}
      <div className={mainContentClass}>
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
});

LayoutContent.displayName = 'LayoutContent';

// Main Layout wrapper with provider
export const Layout = memo<EnhancedLayoutProps>(({ children, className }) => {
  return (
    <SidebarModeProvider>
      <LayoutContent className={className}>
        {children}
      </LayoutContent>
    </SidebarModeProvider>
  )
});

Layout.displayName = 'Layout';
