"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Rating } from "@/components/ui/rating";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEthPrice } from "@/hooks/useEthPrice";
import { useCreatorCourses } from "@/hooks/useCreatorCourses";
import {
  getCategoryName,
  getDifficultyName,
} from "@/services/goldsky-creator.service";
import { prepareDeleteCourseTransaction } from "@/services/courseContract.service";
import {
  BarChart3,
  BookOpen,
  DollarSign,
  Edit,
  Eye,
  PlusCircle,
  Star,
  TrendingUp,
  Users,
  Wallet,
  AlertCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

/**
 * ===================================================================
 * GOLDSKY INDEXER INTEGRATION FOR CREATOR ANALYTICS
 * ===================================================================
 *
 * This page displays courses created by the logged-in creator/instructor
 * with comprehensive analytics powered by Goldsky indexer:
 *
 * 1. COURSE MANAGEMENT:
 *    - List all courses created by creator
 *    - View enrollments and active students per course
 *    - Track revenue per course
 *    - Monitor ratings and feedback
 *
 * 2. REVENUE ANALYTICS:
 *    - Total revenue across all courses
 *    - Revenue per course breakdown
 *    - ETH and IDR pricing with real-time conversion
 *    - Revenue growth trends
 *
 * 3. STUDENT ANALYTICS:
 *    - Total enrollments across all courses
 *    - Active vs completed students
 *    - Average completion rates
 *    - Student engagement metrics
 *
 * 4. PERFORMANCE METRICS:
 *    - Course ratings and reviews
 *    - Completion rates per course
 *    - Section analytics and dropoff rates
 *    - Student progress tracking
 *
 * DATA SOURCE:
 * - Goldsky subgraph indexes CourseFactory, CourseLicense, ProgressTracker
 * - Real-time updates via GraphQL queries
 * - Cached with 5-minute TTL for performance
 * - Automatic refetch on user actions
 * ===================================================================
 */

export default function MyCoursePage() {
  const account = useActiveAccount();
  const creatorAddress = account?.address;
  const { mutate: sendTransaction } = useSendTransaction();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { ethToIDR, isLoading: priceLoading, lastUpdated } = useEthPrice();

  const handleDeleteClick = (courseId: string, courseTitle: string) => {
    setCourseToDelete({ id: courseId, title: courseTitle });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    setIsDeleting(true);
    try {
      const transaction = prepareDeleteCourseTransaction({
        courseId: BigInt(courseToDelete.id),
      });

      sendTransaction(transaction, {
        onSuccess: () => {
          toast.success("Course deleted successfully", {
            description: "The course has been marked as inactive",
          });
          setDeleteDialogOpen(false);
          setCourseToDelete(null);
          refetch();
        },
        onError: (error) => {
          toast.error("Failed to delete course", {
            description: error.message || "Please try again",
          });
        },
      });
    } catch (error) {
      toast.error("Failed to prepare transaction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const {
    courses,
    analytics,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCreatorCourses(creatorAddress, ethToIDR, {
    enabled: !!creatorAddress,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatETH = (amount: string | number) => {
    const eth = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${eth.toFixed(4)} ETH`;
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Not connected state
  if (!creatorAddress) {
    return <NotConnectedState />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
              <p className="text-muted-foreground mt-2">
                Manage your courses, track analytics, and monitor student
                progress
              </p>
            </div>

            {/* Real-time Pricing Display */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Card className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">ETH Price</p>
                    <p className="font-semibold">
                      {priceLoading ? "..." : formatIDR(ethToIDR)}
                    </p>
                  </div>
                </div>
              </Card>

              <Button disabled={isRefetching} onClick={() => refetch()}>
                {isRefetching ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>

              <Link href="/create">
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full lg:w-[400px] grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Revenue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatETH(analytics.totalRevenueEth)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatIDR(analytics.revenueInIDR)}
                  </p>
                  <div className="flex items-center pt-1">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-xs text-green-600">
                      +{analytics.revenueGrowth.toFixed(1)}% from last month
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Total Enrollments */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Enrollments
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalEnrollments.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.totalActiveStudents} active students
                  </p>
                </CardContent>
              </Card>

              {/* Course Count */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Published Courses
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalCourses}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All courses active
                  </p>
                </CardContent>
              </Card>

              {/* Completion Rate */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Completion Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.averageCompletionRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all courses
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Courses Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Overview of your top performing courses
                </p>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No courses created yet
                    </p>
                    <Button className="mt-4">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Your First Course
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.slice(0, 3).map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{course.title}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{course.totalEnrollments} students</span>
                            <span>
                              {formatETH(course.totalRevenueEth)} revenue
                            </span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{course.averageRating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {course.completedStudents} completed
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {course.completionRate.toFixed(1)}% completion
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Courses</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Manage and monitor your published courses
                    </p>
                  </div>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create New Course
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No courses created yet
                    </p>
                    <Button className="mt-4">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Your First Course
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {getDifficultyName(course.difficulty)}
                                </Badge>
                                <Badge
                                  variant={
                                    course.isActive ? "default" : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {course.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryName(course.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {course.totalEnrollments}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {course.activeEnrollments} active
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Rating value={course.averageRating} readOnly />
                              <span className="text-sm text-muted-foreground">
                                ({course.totalRatings})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {formatETH(course.totalRevenueEth)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatIDR(
                                  parseFloat(course.totalRevenueEth) * ethToIDR
                                )}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {new Date(
                                course.lastActivityAt! * 1000
                              ).toLocaleDateString()}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteClick(course.id, course.title)
                                }
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Revenue breakdown and trends
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Total Revenue (ETH)</span>
                      <span className="font-medium">
                        {formatETH(analytics.totalRevenueEth)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Total Revenue (IDR)</span>
                      <span className="font-medium">
                        {formatIDR(analytics.revenueInIDR)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Last Month Revenue</span>
                      <span className="font-medium">
                        {formatIDR(analytics.lastMonthRevenueInIDR)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <span className="text-sm">Revenue Growth</span>
                      <span className="font-medium text-green-600">
                        +{analytics.revenueGrowth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Analytics</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Student engagement and completion metrics
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Enrollments</span>
                      <span className="font-medium">
                        {analytics.totalEnrollments}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Students</span>
                      <span className="font-medium">
                        {analytics.totalActiveStudents}
                      </span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion Rate</span>
                        <span>
                          {analytics.averageCompletionRate.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={analytics.averageCompletionRate}
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Rating Analytics */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Rating Analytics</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Course ratings and feedback overview
                  </p>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No courses to display ratings
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                      {courses.map((course) => (
                        <div key={course.id} className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2 line-clamp-1">
                            {course.title}
                          </h4>
                          <div className="flex items-center gap-2 mb-2">
                            <Rating value={course.averageRating} readOnly />
                            <span className="text-sm font-medium">
                              {course.averageRating.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {course.totalRatings} ratings from{" "}
                            {course.totalEnrollments} students
                          </p>
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Rating Coverage</span>
                              <span>
                                {course.totalEnrollments > 0
                                  ? (
                                      (course.totalRatings /
                                        course.totalEnrollments) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                course.totalEnrollments > 0
                                  ? (course.totalRatings /
                                      course.totalEnrollments) *
                                    100
                                  : 0
                              }
                              className="h-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Info */}
      <div className="border-t bg-muted/30 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>
              📈 Real-time pricing updates every 5 minutes • Last updated:{" "}
              {lastUpdated?.toLocaleTimeString()}
            </p>
            <p>🔗 Connected to Manta Pacific Testnet (ChainID: 3441006)</p>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{courseToDelete?.title}
              &quot;? This will mark the course as inactive and delete all
              sections. Enrolled students will retain their license, but course
              content will no longer be accessible. New enrollments will be
              disabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-5 w-5" />
            <CardTitle>Failed to Load Courses</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message || "An unknown error occurred"}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Unable to fetch your courses from Goldsky indexer. This might be
              due to:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Network connection issues</li>
              <li>Goldsky service temporarily unavailable</li>
              <li>Invalid wallet address</li>
            </ul>
          </div>

          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// NOT CONNECTED STATE
// ============================================================================

function NotConnectedState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-5 w-5" />
            <CardTitle>Connect Your Wallet</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Please connect your wallet to view and manage your courses.
          </p>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              This page shows courses you created as an instructor. To view
              enrolled courses, visit My Learning.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
