"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  PlusCircle,
  User,
  Award,
  PanelLeft,
  MousePointer,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { useSidebarMode } from "./SidebarProvider"

interface NavigationItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    description: "Your learning & teaching hub"
  },
  {
    title: "Browse Courses",
    url: "/courses",
    icon: BookOpen,
    description: "Discover new knowledge"
  },
  {
    title: "My Learning",
    url: "/learning",
    icon: GraduationCap,
    description: "Track progress & achievements"
  },
  {
    title: "Create Course",
    url: "/create",
    icon: PlusCircle,
    description: "Share your expertise"
  },
  {
    title: "My Courses",
    url: "/instructor/courses",
    icon: BookOpen,
    description: "Manage your content"
  },
  {
    title: "Analytics",
    url: "/instructor/analytics",
    icon: BarChart3,
    description: "Track student engagement"
  },
  {
    title: "Certificates",
    url: "/certificates",
    icon: Award,
    description: "Your earned credentials"
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
    description: "Manage your account"
  }
]

const SIDEBAR_WIDTH = 280
const SIDEBAR_WIDTH_COLLAPSED = 64

interface IntegratedSidebarProps {
  className?: string
}

export function IntegratedSidebar({ className }: IntegratedSidebarProps) {
  const { mode, toggleMode, isHoverOpen, setIsHoverOpen } = useSidebarMode()
  const [isHoverVisible, setIsHoverVisible] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const pathname = usePathname()
  const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Hover functions for hover mode
  const showHoverSidebar = () => {
    if (mode !== "hover") return

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setIsHoverOpen(true)
    setIsHovered(true)
  }

  const hideHoverSidebar = () => {
    if (mode !== "hover") return

    setIsHovered(false)
    hideTimeoutRef.current = setTimeout(() => {
      setIsHoverOpen(false)
    }, 300)
  }

  const keepHoverSidebarVisible = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
  }

  const closeHoverSidebar = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setIsHoverOpen(false)
    setIsHovered(false)
  }

  // Render drawer mode sidebar
  if (mode === "drawer") {
    return (
      <aside
        className={cn(
          "fixed left-0 top-0 z-20 h-full bg-background border-r transition-all duration-300",
          `w-[${SIDEBAR_WIDTH}px]`,
          className
        )}
        style={{
          width: SIDEBAR_WIDTH,
          transition: "width 300ms ease-in-out"
        }}
      >
        <TooltipProvider>
          <div className="flex h-full flex-col">
            {/* Header with Logo and Controls */}
            <div className="flex items-center justify-between border-b p-4 h-16">
              {/* Logo Section */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden">
                  <Image
                    src="/Eduverse_logo.png"
                    alt="EduVerse Logo"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <div>
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    EduVerse
                  </span>
                </div>
              </div>

              {/* Hide Drawer Button */}
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMode}
                      className="h-8 w-8 p-0"
                    >
                      <PanelLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Hide drawer</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-hidden p-2">
              <div className="h-full overflow-y-auto space-y-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.url
                  const Icon = item.icon

                  return (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.url}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-sm",
                            isActive
                              ? "bg-primary/10 text-primary font-medium shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="flex-1">{item.title}</span>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 bg-primary rounded-full"
                            />
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        <p>{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </aside>
    )
  }

  // Render hover mode
  return (
    <div className={className}>
      {/* Hover trigger area for hover mode */}
      <div
        className="fixed left-0 top-0 z-40 h-full w-4 bg-transparent hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200"
        onMouseEnter={showHoverSidebar}
        onMouseLeave={hideHoverSidebar}
      />

      {/* Hover sidebar overlay */}
      <AnimatePresence>
        {isHoverOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-45 bg-black/10 backdrop-blur-sm"
              onClick={closeHoverSidebar}
            />

            {/* Hover sidebar card */}
            <motion.div
              initial={{ x: -300, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -300, opacity: 0, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 35,
                opacity: { duration: 0.15 }
              }}
              className="fixed left-4 top-4 bottom-4 z-50 w-72 bg-background/95 backdrop-blur-xl border rounded-2xl shadow-xl overflow-hidden"
              onMouseEnter={keepHoverSidebarVisible}
              onMouseLeave={hideHoverSidebar}
            >
              <TooltipProvider>
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="border-b p-4 flex items-center justify-between">
                    <Link
                      href="/dashboard"
                      className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                      onClick={closeHoverSidebar}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden">
                        <Image
                          src="/Eduverse_logo.png"
                          alt="EduVerse Logo"
                          width={32}
                          height={32}
                          className="w-full h-full object-contain"
                          priority
                        />
                      </div>
                      <div>
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          EduVerse
                        </span>
                      </div>
                    </Link>

                    {/* Control buttons */}
                    <div className="flex items-center gap-1">
                      {/* Mode toggle button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleMode}
                            className="h-8 w-8 p-0"
                          >
                            <PanelLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Show drawer</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex-1 p-4 overflow-hidden">
                    <div className="h-full overflow-y-auto space-y-1">
                      {navigationItems.map((item) => {
                        const isActive = pathname === item.url
                        const Icon = item.icon

                        return (
                          <Tooltip key={item.title}>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.url}
                                onClick={closeHoverSidebar}
                                className={cn(
                                  "flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-sm",
                                  isActive
                                    ? "bg-primary/10 text-primary font-medium shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                              >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1">{item.title}</span>
                                {isActive && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-2 h-2 bg-primary rounded-full"
                                  />
                                )}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                              <p>{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </TooltipProvider>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
