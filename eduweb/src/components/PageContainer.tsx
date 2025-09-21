"use client"

import { cn } from "@/lib/utils"
import { memo } from "react"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  paddingY?: "sm" | "md" | "lg" | "xl"
  paddingX?: "sm" | "md" | "lg" | "xl"
}

/**
 * Standardized page container component for EduVerse frontend
 * Provides consistent margins, padding, and responsive behavior across all pages
 *
 * @param maxWidth - Controls maximum width (default: "xl" = 1280px)
 * @param paddingY - Vertical padding (default: "lg" = 2rem)
 * @param paddingX - Horizontal padding (default: "lg" = 2rem)
 */
export const PageContainer = memo<PageContainerProps>(({
  children,
  className,
  maxWidth = "xl",
  paddingY = "lg",
  paddingX = "lg"
}) => {
  // Responsive max-width classes
  const maxWidthClasses = {
    sm: "max-w-screen-sm",    // 640px
    md: "max-w-screen-md",    // 768px
    lg: "max-w-screen-lg",    // 1024px
    xl: "max-w-screen-xl",    // 1280px
    "2xl": "max-w-screen-2xl", // 1536px
    full: "max-w-full"
  }

  // Vertical padding classes
  const paddingYClasses = {
    sm: "py-4",   // 1rem
    md: "py-6",   // 1.5rem
    lg: "py-8",   // 2rem
    xl: "py-12"   // 3rem
  }

  // Horizontal padding classes with responsive behavior (WIDER MARGINS)
  const paddingXClasses = {
    sm: "px-6 sm:px-8",           // 1.5rem mobile, 2rem tablet+
    md: "px-6 sm:px-8 lg:px-12",  // 1.5rem mobile, 2rem tablet, 3rem desktop
    lg: "px-6 sm:px-8 lg:px-16",  // 1.5rem mobile, 2rem tablet, 4rem desktop
    xl: "px-6 sm:px-8 lg:px-20"   // 1.5rem mobile, 2rem tablet, 5rem desktop
  }

  return (
    <div className={cn(
      // Base container styles
      "w-full mx-auto",

      // Responsive max-width
      maxWidthClasses[maxWidth],

      // Responsive padding
      paddingYClasses[paddingY],
      paddingXClasses[paddingX],

      // Custom className
      className
    )}>
      {children}
    </div>
  )
})

PageContainer.displayName = 'PageContainer'

/**
 * Pre-configured page container variants for common use cases
 */

// For dashboard and main content pages
export const DashboardContainer = memo<{ children: React.ReactNode; className?: string }>(
  ({ children, className }) => (
    <PageContainer
      maxWidth="2xl"
      paddingY="lg"
      paddingX="md"
      className={className}
    >
      {children}
    </PageContainer>
  )
)

// For content-heavy pages like courses, learning
export const ContentContainer = memo<{ children: React.ReactNode; className?: string }>(
  ({ children, className }) => (
    <PageContainer
      maxWidth="2xl"
      paddingY="lg"
      paddingX="md"
      className={className}
    >
      {children}
    </PageContainer>
  )
)

// For forms and creation pages
export const FormContainer = memo<{ children: React.ReactNode; className?: string }>(
  ({ children, className }) => (
    <PageContainer
      maxWidth="2xl"
      paddingY="xl"
      paddingX="md"
      className={className}
    >
      {children}
    </PageContainer>
  )
)

// For analytics and data-heavy pages
export const AnalyticsContainer = memo<{ children: React.ReactNode; className?: string }>(
  ({ children, className }) => (
    <PageContainer
      maxWidth="full"
      paddingY="md"
      paddingX="md"
      className={className}
    >
      {children}
    </PageContainer>
  )
)

DashboardContainer.displayName = 'DashboardContainer'
ContentContainer.displayName = 'ContentContainer'
FormContainer.displayName = 'FormContainer'
AnalyticsContainer.displayName = 'AnalyticsContainer'
