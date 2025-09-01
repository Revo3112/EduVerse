"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Image from "next/image"

// Simple navigation items
interface NavigationItem {
  title: string
  url: string
  icon: any
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

export function EduVerseSidebar() {
  const pathname = usePathname()

  return (
    <TooltipProvider>
      <Sidebar className="border-r">
        <SidebarHeader className="border-b p-6">
          <Link href="/dashboard" className="flex items-center space-x-3">
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
              <span className="text-lg font-bold">EduVerse</span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="p-4">
          <SidebarMenu className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.url

              return (
                <SidebarMenuItem key={item.title}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "w-full justify-start",
                          isActive && "bg-accent text-accent-foreground"
                        )}
                      >
                        <Link href={item.url} className="flex items-center space-x-3">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      <p>{item.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  )
}
