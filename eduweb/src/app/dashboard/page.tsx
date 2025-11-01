"use client";

import { DashboardContainer } from "@/components/PageContainer";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useActiveAccount } from "thirdweb/react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StatCard {
  title: string;
  value: string | number;
  growth?: string;
  icon: LucideIcon;
  colorScheme: "blue" | "green" | "purple" | "orange";
}

type ColorScheme = {
  card: string;
  title: string;
  icon: string;
  value: string;
  growth: string;
};

// ============================================================================
// COLOR SCHEMES
// ============================================================================

const colorSchemes: Record<
  "blue" | "green" | "purple" | "orange",
  ColorScheme
> = {
  blue: {
    card: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50",
    title: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-900 dark:text-blue-100",
    growth: "text-blue-600 dark:text-blue-400",
  },
  green: {
    card: "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50",
    title: "text-green-700 dark:text-green-300",
    icon: "text-green-600 dark:text-green-400",
    value: "text-green-900 dark:text-green-100",
    growth: "text-green-600 dark:text-green-400",
  },
  purple: {
    card: "border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/50",
    title: "text-purple-700 dark:text-purple-300",
    icon: "text-purple-600 dark:text-purple-400",
    value: "text-purple-900 dark:text-purple-100",
    growth: "text-purple-600 dark:text-purple-400",
  },
  orange: {
    card: "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50",
    title: "text-orange-700 dark:text-orange-300",
    icon: "text-orange-600 dark:text-orange-400",
    value: "text-orange-900 dark:text-orange-100",
    growth: "text-orange-600 dark:text-orange-400",
  },
};

export default function DashboardPage() {
  // ============================================================================
  // WEB3 & DATA HOOKS
  // ============================================================================

  const account = useActiveAccount();
  const {
    stats,
    learningCourses,
    teachingCourses,
    activities,
    isLoading,
    error,
  } = useDashboardData();

  // ============================================================================
  // STATS CARDS MAPPING
  // ============================================================================

  const statsCards: StatCard[] = [
    {
      title: "Courses Enrolled",
      value: stats.coursesEnrolled,
      growth: stats.growth.enrolled + " from last month",
      icon: BookOpen,
      colorScheme: "blue",
    },
    {
      title: "Courses Created",
      value: stats.coursesCreated,
      growth: stats.growth.created + " from last month",
      icon: Users,
      colorScheme: "green",
    },
    {
      title: "Courses Completed",
      value: stats.coursesCompleted,
      growth: stats.growth.completed + " from last month",
      icon: Award,
      colorScheme: "purple",
    },
    {
      title: "ETH Earned",
      value: stats.ethEarned,
      growth: stats.growth.earned + " from last month",
      icon: TrendingUp,
      colorScheme: "orange",
    },
  ];

  // ============================================================================
  // ACTIVITY ICON MAPPING
  // ============================================================================

  const getActivityIcon = (
    type: string
  ): { icon: LucideIcon; color: string } => {
    switch (type) {
      case "certificate":
        return { icon: Award, color: "text-yellow-500" };
      case "section":
        return { icon: BookOpen, color: "text-blue-500" };
      case "enrollment":
        return { icon: Users, color: "text-green-500" };
      case "course_completed":
        return { icon: GraduationCap, color: "text-purple-500" };
      case "course_created":
        return { icon: BarChart3, color: "text-orange-500" };
      default:
        return { icon: BookOpen, color: "text-gray-500" };
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show connection prompt if wallet not connected
  if (!account) {
    return (
      <DashboardContainer className="space-y-6">
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-muted-foreground max-w-md">
                Please connect your wallet to view your EduVerse dashboard with
                real blockchain data.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardContainer>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <DashboardContainer className="space-y-6">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-muted-foreground">
            Loading dashboard data from blockchain...
          </p>
        </div>
      </DashboardContainer>
    );
  }

  // Show error state
  if (error) {
    return (
      <DashboardContainer className="space-y-6">
        <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load Dashboard
              </h3>
              <p className="text-muted-foreground max-w-md mb-4">{error}</p>
              <p className="text-sm text-muted-foreground">
                Make sure the Goldsky subgraph is deployed and
                NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT is configured.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardContainer>
    );
  }

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

      {/* Stats Cards - Real Blockchain Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const colors = colorSchemes[stat.colorScheme];
          const Icon = stat.icon;

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
                  <p className={`text-xs ${colors.growth}`}>{stat.growth}</p>
                )}
              </CardContent>
            </Card>
          );
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
              learningCourses.slice(0, 5).map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">{course.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Progress: {course.progress}%
                      </p>
                      <span className="text-xs text-muted-foreground">
                        ({course.completedSections}/{course.totalSections}{" "}
                        sections)
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      course.status === "Completed" ? "default" : "secondary"
                    }
                  >
                    {course.status}
                  </Badge>
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
                <p className="text-sm">
                  Create your first course to start teaching
                </p>
              </div>
            ) : (
              teachingCourses.slice(0, 5).map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">{course.title}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{course.studentCount} students</span>
                      <span>•</span>
                      <span>{course.activeEnrollments} active</span>
                      <span>•</span>
                      <span>{course.totalRevenue} ETH</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      course.status === "Active" ? "default" : "secondary"
                    }
                  >
                    {course.status}
                  </Badge>
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
                const { icon: Icon, color: iconColor } = getActivityIcon(
                  activity.type
                );

                return (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <Icon
                      className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`}
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {activity.relativeTime}
                        </p>
                        {activity.transactionHash && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              •
                            </span>
                            <a
                              href={`https://pacific-explorer.sepolia-testnet.manta.network/tx/${activity.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                            >
                              View Tx
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardContainer>
  );
}
