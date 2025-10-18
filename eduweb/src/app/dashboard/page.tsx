'use client'

import { DashboardContainer } from "@/components/PageContainer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { Award, BarChart3, BookOpen, GraduationCap, TrendingUp, Users } from "lucide-react"
import { useState } from "react"

// ============================================================================
// TYPE DEFINITIONS - Aligned with Smart Contract Events
// ============================================================================

interface StatCard {
  title: string
  value: string | number
  growth?: string
  icon: LucideIcon
  colorScheme: 'blue' | 'green' | 'purple' | 'orange'
}

interface LearningCourse {
  id: string
  title: string
  progress: number // 0-100
  status: 'In Progress' | 'Not Started' | 'Completed'
}

interface TeachingCourse {
  id: string
  title: string
  studentCount: number
  status: 'Active' | 'Inactive' | 'Draft'
}

interface Activity {
  id: string
  type: 'certificate' | 'section' | 'enrollment' | 'course_completed'
  title: string
  description: string
  timestamp: string
  icon: LucideIcon
  iconColor: string
}

// ============================================================================
// COLOR SCHEMES - Pre-defined for Tailwind CSS purging
// ============================================================================

const colorSchemes = {
  blue: {
    card: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50",
    title: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-900 dark:text-blue-100",
    growth: "text-blue-600 dark:text-blue-400"
  },
  green: {
    card: "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50",
    title: "text-green-700 dark:text-green-300",
    icon: "text-green-600 dark:text-green-400",
    value: "text-green-900 dark:text-green-100",
    growth: "text-green-600 dark:text-green-400"
  },
  purple: {
    card: "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/50",
    title: "text-purple-700 dark:text-purple-300",
    icon: "text-purple-600 dark:text-purple-400",
    value: "text-purple-900 dark:text-purple-100",
    growth: "text-purple-600 dark:text-purple-400"
  },
  orange: {
    card: "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50",
    title: "text-orange-700 dark:text-orange-300",
    icon: "text-orange-600 dark:text-orange-400",
    value: "text-orange-900 dark:text-orange-100",
    growth: "text-orange-600 dark:text-orange-400"
  }
}

export default function DashboardPage() {
  // ============================================================================
  // STATE MANAGEMENT - Ready for Goldsky/GraphQL integration
  // ============================================================================

  // Stats Cards - Will be populated from smart contract events
  const [stats] = useState<StatCard[]>([
    {
      title: "Courses Enrolled",
      value: 12,
      growth: "+2 from last month",
      icon: BookOpen,
      colorScheme: 'blue'
    },
    {
      title: "Courses Created",
      value: 5,
      growth: "+1 from last month",
      icon: Users,
      colorScheme: 'green'
    },
    {
      title: "Courses Completed", // ✅ FIXED: Was "Certificates Earned"
      value: 8,                    // This represents CourseAddedToCertificate event count
      growth: "+3 from last month",
      icon: Award,
      colorScheme: 'purple'
    },
    {
      title: "ETH Earned",
      value: "0.156",
      growth: "+0.023 from last month",
      icon: TrendingUp,
      colorScheme: 'orange'
    }
  ])

  // Continue Learning - Will be populated from ProgressTracker events
  const [learningCourses] = useState<LearningCourse[]>([
    {
      id: "1",
      title: "Advanced Solidity Development",
      progress: 75,
      status: "In Progress"
    },
    {
      id: "2",
      title: "DeFi Protocol Design",
      progress: 45,
      status: "In Progress"
    }
  ])

  // Teaching Overview - Will be populated from CourseFactory events
  const [teachingCourses] = useState<TeachingCourse[]>([
    {
      id: "1",
      title: "Blockchain Fundamentals",
      studentCount: 156,
      status: "Active"
    },
    {
      id: "2",
      title: "Smart Contract Security",
      studentCount: 89,
      status: "Active"
    }
  ])

  // Recent Activity - Will be populated from multiple contract events
  const [activities] = useState<Activity[]>([
    {
      id: "1",
      type: "certificate",
      title: "Certificate Earned",
      description: 'Completed "Advanced DeFi Strategies" course',
      timestamp: "2 hours ago",
      icon: Award,
      iconColor: "text-yellow-500"
    },
    {
      id: "2",
      type: "section",
      title: "Course Section Added",
      description: 'Added new section to "Blockchain Fundamentals"',
      timestamp: "1 day ago",
      icon: BookOpen,
      iconColor: "text-blue-500"
    },
    {
      id: "3",
      type: "enrollment",
      title: "New Student Enrollment",
      description: "23 new students enrolled in your courses this week",
      timestamp: "3 days ago",
      icon: Users,
      iconColor: "text-green-500"
    }
  ])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DashboardContainer className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome to EduVerse
        </h1>
        <p className="text-muted-foreground">
          Your unified Web3 education dashboard - Learn, Teach, and Earn
        </p>
      </div>

      {/* Stats Cards - Dynamic Rendering */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const colors = colorSchemes[stat.colorScheme]
          const Icon = stat.icon

          return (
            <Card key={index} className={colors.card}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${colors.title}`}>
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${colors.icon}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${colors.value}`}>
                  {stat.value}
                </div>
                {stat.growth && (
                  <p className={`text-xs ${colors.growth}`}>
                    {stat.growth}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions - Dynamic Rendering */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Continue Learning Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Continue Learning
            </CardTitle>
            <CardDescription>
              Pick up where you left off in your learning journey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {learningCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No courses enrolled yet</p>
                <p className="text-sm">Explore courses to start learning</p>
              </div>
            ) : (
              learningCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{course.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Progress: {course.progress}%
                    </p>
                  </div>
                  <Badge variant="secondary">{course.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Teaching Overview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Teaching Overview
            </CardTitle>
            <CardDescription>
              Monitor your courses and student engagement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teachingCourses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No courses created yet</p>
                <p className="text-sm">Create your first course to start teaching</p>
              </div>
            ) : (
              teachingCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{course.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {course.studentCount} students enrolled
                    </p>
                  </div>
                  <Badge variant="default">{course.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Dynamic Rendering */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest interactions on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">No recent activity</p>
              <p className="text-sm">Your activity will appear here</p>
            </div>
          ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = activity.icon

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-4 rounded-lg bg-muted/50"
                    >
                      <Icon className={`h-5 w-5 ${activity.iconColor} mt-0.5`} />
                      <div className="space-y-1">
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
          )}
        </CardContent>
      </Card>
    </DashboardContainer>
  )
}
