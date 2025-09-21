"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Rating } from "@/components/ui/rating";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEthPrice } from "@/hooks/useEthPrice";
import {
  getCategoryName,
  getDifficultyName,
  mockCourses,
  type Course
} from "@/lib/mock-data";
import {
  BarChart3,
  BookOpen,
  DollarSign,
  Edit,
  Eye,
  MoreHorizontal,
  PlusCircle,
  Star,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";
import { useMemo, useState } from "react";

interface CreatorCourse extends Course {
  // Analytics data that would come from Goldsky indexer in production
  enrollments: number;
  activeStudents: number;
  completedStudents: number;
  totalRevenue: number; // in ETH
  lastMonthRevenue: number; // in ETH
  averageRating: number;
  totalRatings: number;
  lastActivity: Date;
}

/**
 * ===================================================================
 * GOLDSKY INDEXER INTEGRATION STRATEGY FOR CREATOR ANALYTICS
 * ===================================================================
 *
 * The analytics shown in this dashboard require complex data aggregation
 * across multiple smart contracts that would be too expensive to compute
 * on-chain. Here's how Goldsky indexer would provide this data:
 *
 * 1. ENROLLMENT ANALYTICS:
 *    - Index LicenseMinted events from CourseLicense contract
 *    - Track license renewals and expirations
 *    - Calculate active vs expired license counts
 *    - Monitor license transfer events for ownership changes
 *
 * 2. REVENUE ANALYTICS:
 *    - Aggregate license purchase payments from CourseLicense
 *    - Track certificate purchase fees from CertificateManager
 *    - Calculate monthly/quarterly revenue trends
 *    - Monitor platform fee distributions
 *
 * 3. COMPLETION ANALYTICS:
 *    - Index ProgressUpdated and CourseCompleted events from ProgressTracker
 *    - Calculate completion rates per course
 *    - Track student engagement and time-to-completion
 *    - Monitor section-level progress patterns
 *
 * 4. RATING ANALYTICS:
 *    - Index RatingAdded events from CourseFactory
 *    - Calculate average ratings and rating distributions
 *    - Track rating trends over time
 *    - Monitor rating changes and deletions
 *
 * 5. CROSS-CONTRACT QUERIES:
 *    - Join course data with license, progress, and certificate data
 *    - Calculate creator-specific metrics across all courses
 *    - Generate leaderboards and performance comparisons
 *    - Provide real-time dashboard updates via GraphQL subscriptions
 *
 * GOLDSKY SUBGRAPH ENTITIES NEEDED:
 * - Course, Creator, License, Progress, Certificate, Rating
 * - Relationships: Creator -> Courses, Course -> Licenses/Progress/Ratings
 * - Time-series data for revenue and enrollment trends
 * - Aggregated statistics for dashboard KPIs
 *
 * IMPLEMENTATION APPROACH:
 * 1. Deploy Goldsky subgraph indexing all 4 EduVerse contracts
 * 2. Replace mock data hooks with GraphQL queries to Goldsky endpoint
 * 3. Use GraphQL subscriptions for real-time dashboard updates
 * 4. Implement caching strategy for frequently accessed analytics
 * 5. Add pagination for large datasets (courses, students, transactions)
 * ===================================================================
 */

export default function MyCoursePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'analytics'>('overview');

  // Real-time ETH to IDR pricing
  const { ethToIDR, isLoading: priceLoading, lastUpdated } = useEthPrice();

  // Mock creator address - in production, this would come from wallet connection
  const mockCreatorAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;

  // Mock creator courses with analytics data
  // In production, this would come from Goldsky GraphQL queries
  const creatorCourses = useMemo<CreatorCourse[]>(() => {
    return mockCourses
      .filter(course => course.creator === mockCreatorAddress)
      .map(course => ({
        ...course,
        enrollments: Math.floor(Math.random() * 500) + 50,
        activeStudents: Math.floor(Math.random() * 200) + 20,
        completedStudents: Math.floor(Math.random() * 150) + 10,
        totalRevenue: Math.random() * 5 + 0.5, // 0.5-5.5 ETH
        lastMonthRevenue: Math.random() * 2 + 0.1, // 0.1-2.1 ETH
        averageRating: Math.random() * 2 + 3, // 3.0-5.0 stars
        totalRatings: Math.floor(Math.random() * 200) + 10,
        lastActivity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }));
  }, [mockCreatorAddress]);

  // Calculate overall analytics
  const analytics = useMemo(() => {
    const totalEnrollments = creatorCourses.reduce((sum, course) => sum + course.enrollments, 0);
    const totalRevenue = creatorCourses.reduce((sum, course) => sum + course.totalRevenue, 0);
    const totalActiveStudents = creatorCourses.reduce((sum, course) => sum + course.activeStudents, 0);
    const totalCompletedStudents = creatorCourses.reduce((sum, course) => sum + course.completedStudents, 0);
    const averageCompletionRate = totalEnrollments > 0 ? (totalCompletedStudents / totalEnrollments) * 100 : 0;
    const lastMonthRevenue = creatorCourses.reduce((sum, course) => sum + course.lastMonthRevenue, 0);
    const revenueGrowth = totalRevenue > 0 ? ((lastMonthRevenue / (totalRevenue - lastMonthRevenue)) * 100) : 0;

    return {
      totalCourses: creatorCourses.length,
      totalEnrollments,
      totalRevenue,
      totalActiveStudents,
      averageCompletionRate,
      revenueGrowth: Math.min(revenueGrowth, 999), // Cap at 999%
      revenueInIDR: totalRevenue * ethToIDR,
      lastMonthRevenueInIDR: lastMonthRevenue * ethToIDR
    };
  }, [creatorCourses, ethToIDR]);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatETH = (amount: number) => {
    return `${amount.toFixed(4)} ETH`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
              <p className="text-muted-foreground mt-2">
                Manage your courses, track analytics, and monitor student progress
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

              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'courses' | 'analytics')}>
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
          <TabsContent value="overview" className="mt-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {/* Total Revenue */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatETH(analytics.totalRevenue)}</div>
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
                  <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalEnrollments.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.totalActiveStudents} active students
                  </p>
                </CardContent>
              </Card>

              {/* Course Count */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Published Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalCourses}</div>
                  <p className="text-xs text-muted-foreground">
                    All courses active
                  </p>
                </CardContent>
              </Card>

              {/* Completion Rate */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Completion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.averageCompletionRate.toFixed(1)}%</div>
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
                <div className="space-y-4">
                  {creatorCourses.slice(0, 3).map((course) => (
                    <div key={course.id.toString()} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{course.title}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{course.enrollments} students</span>
                          <span>{formatETH(course.totalRevenue)} revenue</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{course.averageRating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{course.completedStudents} completed</p>
                        <p className="text-xs text-muted-foreground">
                          {((course.completedStudents / course.enrollments) * 100).toFixed(1)}% completion
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="mt-8">
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
                    {creatorCourses.map((course) => (
                      <TableRow key={course.id.toString()}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{course.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getDifficultyName(course.difficulty)}
                              </Badge>
                              <Badge variant={course.isActive ? "default" : "secondary"} className="text-xs">
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
                            <p className="font-medium">{course.enrollments}</p>
                            <p className="text-xs text-muted-foreground">
                              {course.activeStudents} active
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
                            <p className="font-medium">{formatETH(course.totalRevenue)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatIDR(course.totalRevenue * ethToIDR)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {course.lastActivity.toLocaleDateString()}
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
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-8">
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
                      <span className="font-medium">{formatETH(analytics.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Total Revenue (IDR)</span>
                      <span className="font-medium">{formatIDR(analytics.revenueInIDR)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Last Month Revenue</span>
                      <span className="font-medium">{formatIDR(analytics.lastMonthRevenueInIDR)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <span className="text-sm">Revenue Growth</span>
                      <span className="font-medium text-green-600">+{analytics.revenueGrowth.toFixed(1)}%</span>
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
                      <span className="font-medium">{analytics.totalEnrollments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Students</span>
                      <span className="font-medium">{analytics.totalActiveStudents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed Students</span>
                      <span className="font-medium">{analytics.totalActiveStudents}</span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completion Rate</span>
                        <span>{analytics.averageCompletionRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={analytics.averageCompletionRate} className="h-2" />
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
                  <div className="grid gap-4 md:grid-cols-3">
                    {creatorCourses.map((course) => (
                      <div key={course.id.toString()} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2 line-clamp-1">{course.title}</h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Rating value={course.averageRating} readOnly />
                          <span className="text-sm font-medium">{course.averageRating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {course.totalRatings} ratings from {course.enrollments} students
                        </p>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Rating Coverage</span>
                            <span>{((course.totalRatings / course.enrollments) * 100).toFixed(1)}%</span>
                          </div>
                          <Progress
                            value={(course.totalRatings / course.enrollments) * 100}
                            className="h-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
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
              📈 Real-time pricing updates every 5 minutes • Last updated: {lastUpdated?.toLocaleTimeString()}
            </p>
            <p>
              🔗 Connected to Manta Pacific Testnet (ChainID: 3441006)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
