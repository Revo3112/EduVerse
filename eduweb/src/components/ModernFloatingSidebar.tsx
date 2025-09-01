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
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

interface ModernFloatingSidebarProps {
  className?: string
}

export function ModernFloatingSidebar({ className }: ModernFloatingSidebarProps) {
  const [isVisible, setIsVisible] = React.useState(false)
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

  // Show sidebar on hover trigger
  const showSidebar = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setIsVisible(true)
    setIsHovered(true)
  }

  // Hide sidebar with delay
  const hideSidebar = () => {
    setIsHovered(false)
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 300)
  }

  // Keep sidebar visible when hovering over it
  const keepSidebarVisible = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
  }

  // Close sidebar immediately
  const closeSidebar = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setIsVisible(false)
    setIsHovered(false)
  }

  return (
    <div className={className}>
      {/* Hover trigger area */}
      <div
        className="fixed left-0 top-0 z-40 h-full w-4 bg-transparent hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200"
        onMouseEnter={showSidebar}
        onMouseLeave={hideSidebar}
      />

      {/* Floating sidebar overlay */}
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-45 bg-black/10 backdrop-blur-sm"
              onClick={closeSidebar}
            />

            {/* Floating sidebar card */}
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
              className="fixed left-4 top-4 bottom-4 z-50 w-72"
              onMouseEnter={keepSidebarVisible}
              onMouseLeave={hideSidebar}
            >
              <TooltipProvider>
                <div className="h-full bg-background/95 backdrop-blur-xl border rounded-2xl shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="border-b border-border/50 p-6">
                    <Link
                      href="/dashboard"
                      className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                      onClick={closeSidebar}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden">
                        <Image
                          src="/Eduverse_logo.png"
                          alt="EduVerse Logo"
                          width={40}
                          height={40}
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
                  </div>

                  {/* Navigation */}
                  <div className="p-4 h-full overflow-hidden">
                    <div className="h-full overflow-y-auto space-y-1">
                      {navigationItems.map((item) => {
                        const isActive = pathname === item.url
                        const Icon = item.icon

                        return (
                          <Tooltip key={item.title}>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.url}
                                onClick={closeSidebar}
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
                              <p>{item.description}</p>
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
