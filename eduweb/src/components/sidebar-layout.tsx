"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { EduVerseSidebar } from "./eduverse-sidebar"
import { EduVerseNavbar } from "./eduverse-navbar"
import { cn } from "@/lib/utils"

interface SidebarLayoutProps {
  children: React.ReactNode
  className?: string
}

// Floating Sidebar Component with modern overlay behavior
function FloatingSidebar() {
  const { state, open, setOpen } = useSidebar()
  const [isVisible, setIsVisible] = React.useState(false)

  // Update visibility based on sidebar state
  React.useEffect(() => {
    setIsVisible(state === "collapsed" && open)
  }, [state, open])

  if (state === "expanded") return <EduVerseSidebar />

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Floating sidebar card */}
          <motion.div
            initial={{ x: -320, opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -320, opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className="fixed left-4 top-4 bottom-4 z-50 w-72"
          >
            <div className="h-full bg-background/95 backdrop-blur-md border rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
              {/* Gradient mask for top and bottom fade */}
              <div className="h-full overflow-hidden relative">
                <div
                  className="h-full overflow-y-auto"
                  style={{
                    maskImage: 'linear-gradient(transparent, white 12px, white calc(100% - 12px), transparent)',
                    WebkitMaskImage: 'linear-gradient(transparent, white 12px, white calc(100% - 12px), transparent)',
                  }}
                >
                  <EduVerseSidebar />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Modern hover trigger component with enhanced UX
function SidebarHoverTrigger() {
  const { state, open, setOpen } = useSidebar()
  const [isHovered, setIsHovered] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Handle hover logic dengan delay
  const handleMouseEnter = () => {
    if (state === "collapsed" && !open) {
      setIsHovered(true)
      setOpen(true)
    }
  }

  const handleMouseLeave = () => {
    if (state === "collapsed" && isHovered) {
      // Delay sebelum hide sidebar
      timeoutRef.current = setTimeout(() => {
        setOpen(false)
        setIsHovered(false)
      }, 300) // 300ms delay
    }
  }

  const handleMouseEnterProtection = () => {
    // Cancel timeout jika user masuk ke protection area
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  if (state === "expanded") return null

  return (
    <>
      {/* Enhanced hover trigger area dengan visual feedback */}
      <div
        className="fixed left-0 top-0 z-30 h-full w-6 bg-transparent hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent transition-all duration-200"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Protection area di sekitar floating sidebar */}
      {isHovered && (
        <div
          className="fixed left-0 top-0 z-45 h-full w-80 bg-transparent"
          onMouseEnter={handleMouseEnterProtection}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </>
  )
}

export function SidebarLayout({ children, className }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      {/* Full-width layout tanpa sidebar di layout flow */}
      <div className={cn("flex h-screen w-full", className)}>
        {/* Floating sidebar overlay */}
        <FloatingSidebar />

        {/* Hover trigger untuk collapsed state */}
        <SidebarHoverTrigger />

        {/* Main content area - full width */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          {/* Header with navbar */}
          <header className="flex h-16 items-center justify-end border-b bg-background/95 backdrop-blur px-6 supports-[backdrop-filter]:bg-background/60">
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
