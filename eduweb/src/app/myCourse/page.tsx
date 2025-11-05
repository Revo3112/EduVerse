"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
  refreshCreatorData,
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
  CheckCircle2,
} from "lucide-react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

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

  const { ethToIDR, isLoading: priceLoading } = useEthPrice();

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
    refetchInterval: 30000,
  });

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
          setTimeout(() => {
            if (creatorAddress) {
              refreshCreatorData(creatorAddress);
            }
            refetch();
          }, 2000);
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

  const handleRefresh = async () => {
    if (creatorAddress) {
      refreshCreatorData(creatorAddress);
    }
    await refetch();
    toast.success("Data refreshed successfully");
  };

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

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!creatorAddress) {
    return <NotConnectedState />;
  }

  return (
    <div className="min-h-screen bg-background">
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

              <Button disabled={isRefetching} onClick={handleRefresh}>
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

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Courses
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalCourses}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {courses.filter((c) => c.isActive).length} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Students
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.totalEnrollments}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.totalActiveStudents} currently active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatIDR(analytics.revenueInIDR)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatETH(analytics.totalRevenueEth)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg Completion
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.averageCompletionRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.totalEnrollments > 0
                      ? "Above average"
                      : "No data yet"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {courses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Create your first course to start earning and teaching
                    students
                  </p>
                  <Link href="/create">
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Your First Course
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courses.slice(0, 5).map((course) => (
                      <div key={course.id} className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {course.totalEnrollments} enrollments •{" "}
                            {course.activeEnrollments} active
                          </p>
                        </div>
                        <Badge
                          variant={course.isActive ? "default" : "secondary"}
                        >
                          {course.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            {courses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Create your first course to start earning
                  </p>
                  <Link href="/create">
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Course
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">
                          {course.title}
                        </CardTitle>
                        <Badge
                          variant={course.isActive ? "default" : "secondary"}
                        >
                          {course.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">
                          {getCategoryName(course.category)}
                        </Badge>
                        <Badge variant="outline">
                          {getDifficultyName(course.difficulty)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Students</p>
                          <p className="font-semibold">
                            {course.totalEnrollments}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Active</p>
                          <p className="font-semibold">
                            {course.activeEnrollments}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-semibold">
                            {formatETH(course.priceInEth)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Rating</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">
                              {course.averageRating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex gap-2">
                        <Link href={`/course/${course.id}`} className="flex-1">
                          <Button
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <Link
                          href={`/edit?courseId=${course.id}`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            handleDeleteClick(course.id, course.title)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Total Revenue
                      </p>
                      <p className="text-2xl font-bold">
                        {formatIDR(analytics.revenueInIDR)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatETH(analytics.totalRevenueEth)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Revenue Growth
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        +{analytics.revenueGrowth.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        vs last month
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Avg per Student
                      </p>
                      <p className="text-2xl font-bold">
                        {analytics.totalEnrollments > 0
                          ? formatIDR(
                              analytics.revenueInIDR /
                                analytics.totalEnrollments
                            )
                          : formatIDR(0)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        per enrollment
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Completion</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">
                          {course.title}
                        </TableCell>
                        <TableCell>
                          {course.totalEnrollments}
                          <span className="text-muted-foreground ml-1">
                            ({course.activeEnrollments} active)
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={course.completionRate}
                              className="w-16"
                            />
                            <span className="text-sm">
                              {course.completionRate.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{course.averageRating.toFixed(1)}</span>
                            <span className="text-muted-foreground">
                              ({course.totalRatings})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-medium">
                              {formatIDR(
                                parseFloat(course.priceInEth) * ethToIDR
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatETH(course.priceInEth)}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Total Enrollments
                        </span>
                        <span className="text-sm font-bold">
                          {analytics.totalEnrollments}
                        </span>
                      </div>
                      <Progress value={100} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Active Students
                        </span>
                        <span className="text-sm font-bold">
                          {analytics.totalActiveStudents}
                        </span>
                      </div>
                      <Progress
                        value={
                          analytics.totalEnrollments > 0
                            ? (analytics.totalActiveStudents /
                                analytics.totalEnrollments) *
                              100
                            : 0
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Completion Rate
                        </span>
                        <span className="text-sm font-bold">
                          {analytics.averageCompletionRate.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={analytics.averageCompletionRate} />
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                      <p className="text-2xl font-bold">
                        {analytics.averageCompletionRate.toFixed(1)}%
                      </p>
                      <p className="text-muted-foreground">
                        Average Completion Rate
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{courseToDelete?.title}</strong>? This will mark the
              course as inactive. Students who already enrolled will still have
              access until their license expires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-96" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <CardTitle>Failed to Load Courses</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message ||
                "An unexpected error occurred while fetching your courses"}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={onRetry} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                Go Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotConnectedState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Connect Your Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Please connect your wallet to view and manage your courses.
          </p>
          <Link href="/">
            <Button className="w-full">
              <Wallet className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
