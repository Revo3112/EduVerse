"use client"

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { EduVerseSidebar } from "./eduverse-sidebar"
import { EduVerseNavbar } from "./eduverse-navbar"
import { cn } from "@/lib/utils"

interface SidebarLayoutProps {
  children: React.ReactNode
  className?: string
}

export function SidebarLayout({ children, className }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <div className={cn("flex h-screen w-full", className)}>
        <EduVerseSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with sidebar trigger and navbar */}
          <header className="flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-6 supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1" />
            <EduVerseNavbar />
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-auto bg-background/50">
            <div className="h-full w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
