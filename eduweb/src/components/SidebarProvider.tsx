"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type SidebarMode = "drawer" | "hover"

interface SidebarModeContextType {
  mode: SidebarMode
  setMode: (mode: SidebarMode) => void
  toggleMode: () => void
  isHoverOpen: boolean
  setIsHoverOpen: (open: boolean) => void
}

const SidebarModeContext = createContext<SidebarModeContextType | undefined>(undefined)

interface SidebarModeProviderProps {
  children: React.ReactNode
}

export function SidebarModeProvider({ children }: SidebarModeProviderProps) {
  const [mode, setModeState] = useState<SidebarMode>("drawer")
  const [isHoverOpen, setIsHoverOpen] = useState(false)

  // Load saved preference on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("eduverse-sidebar-mode")

    if (savedMode === "drawer" || savedMode === "hover") {
      setModeState(savedMode)
    }
  }, [])

  // Save mode preference when changed
  const setMode = (newMode: SidebarMode) => {
    setModeState(newMode)
    localStorage.setItem("eduverse-sidebar-mode", newMode)

    // Close hover when switching to drawer
    if (newMode === "drawer") {
      setIsHoverOpen(false)
    }
  }

  const toggleMode = () => {
    const newMode = mode === "drawer" ? "hover" : "drawer"
    setMode(newMode)
  }

  return (
    <SidebarModeContext.Provider value={{
      mode,
      setMode,
      toggleMode,
      isHoverOpen,
      setIsHoverOpen
    }}>
      {children}
    </SidebarModeContext.Provider>
  )
}

export function useSidebarMode() {
  const context = useContext(SidebarModeContext)
  if (context === undefined) {
    throw new Error("useSidebarMode must be used within a SidebarModeProvider")
  }
  return context
}
