"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  prepareDeleteCourseTransaction,
  prepareUpdateCourseTransaction,
} from "@/services/courseContract.service";
import {
  BarChart3,
  BookOpen,
  DollarSign,
  Edit,
  Eye,
  MoreHorizontal,
  PlusCircle,
  Power,
  PowerOff,
  Star,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";

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
 * ===================================================================
 * GOLDSKY SUBGRAPH SCHEMA DESIGN
 * ===================================================================
 *
 * ENTITIES:
 *
 * type Course @entity {
 *   id: ID!                          # courseId
 *   creator: Creator!                # Relation to Creator
 *   title: String!
 *   description: String!
 *   thumbnailCID: String!
 *   creatorName: String!
 *   category: CourseCategory!
 *   difficulty: CourseDifficulty!
 *   pricePerMonth: BigInt!           # In wei
 *   isActive: Boolean!
 *   createdAt: BigInt!               # Timestamp
 *   updatedAt: BigInt!               # Last update timestamp
 *
 *   # Aggregated metrics (computed from events)
 *   totalRevenue: BigInt!            # Sum of all license purchases
 *   totalEnrollments: Int!           # Count of LicenseMinted events
 *   activeEnrollments: Int!          # Count of active licenses
 *   completedStudents: Int!          # Count of CourseCompleted events
 *   averageRating: BigDecimal!       # Average of all ratings
 *   totalRatings: Int!               # Count of ratings
 *
 *   # Relations
 *   licenses: [License!]! @derivedFrom(field: "course")
 *   sections: [CourseSection!]! @derivedFrom(field: "course")
 *   progress: [StudentProgress!]! @derivedFrom(field: "course")
 *   ratings: [CourseRating!]! @derivedFrom(field: "course")
 *   certificates: [Certificate!]! @derivedFrom(field: "course")
 * }
 *
 * type Creator @entity {
 *   id: ID!                          # Creator address
 *   address: Bytes!
 *   name: String!                    # Latest creatorName from courses
 *   coursesCreated: Int!
 *   totalRevenue: BigInt!            # Sum across all courses
 *   totalEnrollments: Int!           # Sum across all courses
 *   averageRating: BigDecimal!       # Weighted average across all courses
 *
 *   courses: [Course!]! @derivedFrom(field: "creator")
 *
 *   createdAt: BigInt!
 *   lastActive: BigInt!
 * }
 *
 * type License @entity {
 *   id: ID!                          # licenseId
 *   course: Course!
 *   student: Bytes!                  # Student address
 *   durationMonths: Int!
 *   expiryTimestamp: BigInt!
 *   isActive: Boolean!
 *   priceAtPurchase: BigInt!         # Price when purchased
 *   purchasedAt: BigInt!
 *   renewedAt: BigInt                # Last renewal timestamp
 *   renewalCount: Int!               # Number of renewals
 * }
 *
 * type StudentProgress @entity {
 *   id: ID!                          # student-courseId
 *   course: Course!
 *   student: Bytes!
 *   completedSections: [Int!]!       # Array of section IDs
 *   totalSections: Int!
 *   progressPercentage: BigDecimal!
 *   isCompleted: Boolean!
 *   completedAt: BigInt              # Timestamp when completed
 *   startedAt: BigInt!
 *   lastProgressAt: BigInt!
 * }
 *
 * type CourseRating @entity {
 *   id: ID!                          # student-courseId
 *   course: Course!
 *   student: Bytes!
 *   rating: Int!                     # 1-5 stars
 *   createdAt: BigInt!
 *   updatedAt: BigInt!
 * }
 *
 * type Certificate @entity {
 *   id: ID!                          # certificateId
 *   course: Course!
 *   student: Bytes!
 *   studentName: String!
 *   imageCID: String!                # Certificate image IPFS CID
 *   qrCodeCID: String!               # QR code IPFS CID
 *   issuedAt: BigInt!
 *   expiresAt: BigInt!
 *   isValid: Boolean!
 * }
 *
 * type CourseSection @entity {
 *   id: ID!                          # courseId-sectionId
 *   course: Course!
 *   sectionId: Int!
 *   title: String!
 *   contentCID: String!              # Video IPFS CID
 *   duration: BigInt!                # Duration in seconds
 *   orderId: Int!
 *   isActive: Boolean!
 * }
 *
 * # Time-series entities for analytics
 * type DailyRevenue @entity {
 *   id: ID!                          # date-courseId
 *   course: Course!
 *   date: String!                    # YYYY-MM-DD
 *   revenue: BigInt!                 # Revenue for that day
 *   enrollments: Int!                # New enrollments that day
 * }
 *
 * type MonthlyRevenue @entity {
 *   id: ID!                          # month-courseId
 *   course: Course!
 *   month: String!                   # YYYY-MM
 *   revenue: BigInt!
 *   enrollments: Int!
 *   completions: Int!
 * }
 *
 * ===================================================================
 * EVENT HANDLERS TO IMPLEMENT
 * ===================================================================
 *
 * FROM CourseFactory.sol:
 * 1. handleCourseCreated(event: CourseCreated)
 *    - Create Course entity
 *    - Create or update Creator entity
 *    - Initialize metrics (totalRevenue=0, totalEnrollments=0, etc.)
 *
 * 2. handleCourseUpdated(event: CourseUpdated)
 *    - Update Course entity fields
 *    - Track price changes for revenue projections
 *    - Update updatedAt timestamp
 *
 * 3. handleCourseDeleted(event: CourseDeleted)
 *    - Set Course.isActive = false
 *    - Update updatedAt timestamp
 *
 * 4. handleSectionAdded(event: SectionAdded)
 *    - Create CourseSection entity
 *    - Update Course.sections array
 *
 * 5. handleBatchSectionsAdded(event: BatchSectionsAdded)
 *    - Create multiple CourseSection entities
 *    - Efficiently handle batch operations
 *
 * 6. handleRatingAdded(event: RatingAdded)
 *    - Create or update CourseRating entity
 *    - Recalculate Course.averageRating
 *    - Increment Course.totalRatings
 *
 * FROM CourseLicense.sol:
 * 7. handleLicenseMinted(event: LicenseMinted)
 *    - Create License entity
 *    - Increment Course.totalEnrollments
 *    - Increment Course.activeEnrollments
 *    - Add Course.totalRevenue += license price
 *    - Create/update DailyRevenue entity
 *    - Update Creator.totalRevenue and totalEnrollments
 *
 * 8. handleLicenseRenewed(event: LicenseRenewed)
 *    - Update License entity (renewedAt, renewalCount++)
 *    - Add Course.totalRevenue += renewal price
 *    - Create/update DailyRevenue entity
 *
 * 9. handleLicenseExpired(event: LicenseExpired)
 *    - Set License.isActive = false
 *    - Decrement Course.activeEnrollments
 *
 * FROM ProgressTracker.sol:
 * 10. handleProgressUpdated(event: ProgressUpdated)
 *     - Create or update StudentProgress entity
 *     - Update completedSections array
 *     - Recalculate progressPercentage
 *     - Update lastProgressAt timestamp
 *
 * 11. handleCourseCompleted(event: CourseCompleted)
 *     - Set StudentProgress.isCompleted = true
 *     - Set completedAt timestamp
 *     - Increment Course.completedStudents
 *
 * FROM CertificateManager.sol:
 * 12. handleCertificateIssued(event: CertificateIssued)
 *     - Create Certificate entity
 *     - Link to Course and student
 *     - Track certificate revenue (separate from course revenue)
 *
 * ===================================================================
 * GRAPHQL QUERIES FOR DASHBOARD
 * ===================================================================
 *
 * Query 1: Get creator's courses with analytics
 * ```graphql
 * query GetCreatorCourses($creatorAddress: Bytes!) {
 *   creator(id: $creatorAddress) {
 *     id
 *     name
 *     totalRevenue
 *     totalEnrollments
 *     averageRating
 *     courses(orderBy: createdAt, orderDirection: desc) {
 *       id
 *       title
 *       description
 *       thumbnailCID
 *       category
 *       difficulty
 *       pricePerMonth
 *       isActive
 *       totalRevenue
 *       totalEnrollments
 *       activeEnrollments
 *       completedStudents
 *       averageRating
 *       totalRatings
 *       createdAt
 *     }
 *   }
 * }
 * ```
 *
 * Query 2: Get monthly revenue trends
 * ```graphql
 * query GetMonthlyRevenue($courseId: ID!, $startMonth: String!, $endMonth: String!) {
 *   monthlyRevenues(
 *     where: { course: $courseId, month_gte: $startMonth, month_lte: $endMonth }
 *     orderBy: month
 *     orderDirection: asc
 *   ) {
 *     month
 *     revenue
 *     enrollments
 *     completions
 *   }
 * }
 * ```
 *
 * Query 3: Get student engagement metrics
 * ```graphql
 * query GetCourseEngagement($courseId: ID!) {
 *   course(id: $courseId) {
 *     totalEnrollments
 *     completedStudents
 *     progress(where: { isCompleted: false }) {
 *       student
 *       progressPercentage
 *       lastProgressAt
 *     }
 *   }
 * }
 * ```
 *
 * Query 4: Get rating distribution
 * ```graphql
 * query GetRatingDistribution($courseId: ID!) {
 *   course(id: $courseId) {
 *     averageRating
 *     totalRatings
 *     ratings {
 *       rating
 *       createdAt
 *     }
 *   }
 * }
 * ```
 *
 * Subscription: Real-time revenue updates
 * ```graphql
 * subscription OnRevenueUpdate($creatorAddress: Bytes!) {
 *   creator(id: $creatorAddress) {
 *     totalRevenue
 *     courses {
 *       id
 *       title
 *       totalRevenue
 *       totalEnrollments
 *     }
 *   }
 * }
 * ```
 *
 * ===================================================================
 * IMPLEMENTATION APPROACH
 * ===================================================================
 *
 * 1. Deploy Goldsky subgraph indexing all 4 EduVerse contracts:
 *    - CourseFactory (0x...)
 *    - CourseLicense (0x...)
 *    - ProgressTracker (0x...)
 *    - CertificateManager (0x...)
 *
 * 2. Replace mock data hooks with GraphQL queries to Goldsky endpoint:
 *    - Create useCreatorCourses() hook for course list
 *    - Create useCreatorAnalytics() hook for metrics
 *    - Create useCourseRevenue() hook for revenue trends
 *
 * 3. Use GraphQL subscriptions for real-time dashboard updates:
 *    - Subscribe to revenue changes
 *    - Subscribe to new enrollments
 *    - Subscribe to course completions
 *
 * 4. Implement caching strategy for frequently accessed analytics:
 *    - Cache creator totals (refresh every 5 minutes)
 *    - Cache course metrics (refresh on subscription updates)
 *    - Invalidate cache on user actions (edit, delete, unpublish)
 *
 * 5. Add pagination for large datasets:
 *    - Courses: 20 per page
 *    - Students: 50 per page
 *    - Transactions: 100 per page
 *
 * ===================================================================
 * BUSINESS LOGIC VALIDATION
 * ===================================================================
 *
 * This dashboard supports the instructor flow from business requirements:
 *
 * 1. ✅ View all created courses
 * 2. ✅ See performance metrics (revenue, enrollments, completions, ratings)
 * 3. ✅ Edit courses (navigate to /edit/[courseId])
 * 4. ✅ Unpublish courses (set isActive = false)
 * 5. ✅ Delete courses (soft delete, preserves student data)
 * 6. ✅ Republish courses (set isActive = true)
 * 7. ✅ Real-time pricing (ETH to IDR conversion)
 * 8. ✅ Analytics breakdown (revenue, students, ratings)
 *
 * All data is on-chain for transparency, indexed by Goldsky for performance.
 * ===================================================================
 */

export default function MyCoursePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'analytics'>('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<bigint | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CreatorCourse | null>(null);

  const router = useRouter();
  const activeAccount = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

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

  // Action Handlers
  const handleViewCourse = (courseId: bigint) => {
    router.push(`/course/${courseId}`);
  };

  const handleEditCourse = (courseId: bigint) => {
    router.push(`/edit?courseId=${courseId}`);
  };

  const handleOpenDeleteDialog = (course: CreatorCourse) => {
    setSelectedCourse(course);
    setSelectedCourseId(BigInt(course.id));
    setDeleteDialogOpen(true);
  };

  const handleOpenUnpublishDialog = (course: CreatorCourse) => {
    setSelectedCourse(course);
    setSelectedCourseId(BigInt(course.id));
    setUnpublishDialogOpen(true);
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourseId || !activeAccount) {
      toast.error("Error", {
        description: "Please connect your wallet first",
      });
      return;
    }

    try {
      const transaction = prepareDeleteCourseTransaction({
        courseId: selectedCourseId,
      });

      sendTransaction(transaction, {
        onSuccess: () => {
          toast.success("Course deleted successfully", {
            description: "The course has been marked as inactive",
          });
          setDeleteDialogOpen(false);
          setSelectedCourseId(null);
          setSelectedCourse(null);
        },
        onError: (error) => {
          console.error("Failed to delete course:", error);
          toast.error("Failed to delete course", {
            description: error.message || "Please try again",
          });
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Error preparing transaction", {
        description: errorMessage,
      });
    }
  };

  const handleUnpublishCourse = async () => {
    if (!selectedCourseId || !selectedCourse || !activeAccount) {
      toast.error("Error", {
        description: "Please connect your wallet first",
      });
      return;
    }

    try {
      const transaction = prepareUpdateCourseTransaction({
        courseId: selectedCourseId,
        metadata: {
          title: selectedCourse.title,
          description: selectedCourse.description,
          thumbnailCID: selectedCourse.thumbnailCID,
          creatorName: selectedCourse.creatorName,
          category: getCategoryName(selectedCourse.category),
          difficulty: getDifficultyName(selectedCourse.difficulty),
        },
        pricePerMonth: (Number(selectedCourse.pricePerMonth) / 1e18).toString(),
        isActive: false, // Unpublish
      });

      sendTransaction(transaction, {
        onSuccess: () => {
          toast.success("Course unpublished", {
            description: "The course is now inactive and hidden from students",
          });
          setUnpublishDialogOpen(false);
          setSelectedCourseId(null);
          setSelectedCourse(null);
        },
        onError: (error) => {
          console.error("Failed to unpublish course:", error);
          toast.error("Failed to unpublish course", {
            description: error.message || "Please try again",
          });
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Error preparing transaction", {
        description: errorMessage,
      });
    }
  };

  const handleRepublishCourse = async (course: CreatorCourse) => {
    if (!activeAccount) {
      toast.error("Error", {
        description: "Please connect your wallet first",
      });
      return;
    }

    try {
      const transaction = prepareUpdateCourseTransaction({
        courseId: BigInt(course.id),
        metadata: {
          title: course.title,
          description: course.description,
          thumbnailCID: course.thumbnailCID,
          creatorName: course.creatorName,
          category: getCategoryName(course.category),
          difficulty: getDifficultyName(course.difficulty),
        },
        pricePerMonth: (Number(course.pricePerMonth) / 1e18).toString(),
        isActive: true, // Republish
      });

      sendTransaction(transaction, {
        onSuccess: () => {
          toast.success("Course republished", {
            description: "The course is now active and visible to students",
          });
        },
        onError: (error) => {
          console.error("Failed to republish course:", error);
          toast.error("Failed to republish course", {
            description: error.message || "Please try again",
          });
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Error preparing transaction", {
        description: errorMessage,
      });
    }
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
                  <Button onClick={() => router.push('/create')}>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCourse(BigInt(course.id))}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCourse(BigInt(course.id))}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {course.isActive ? (
                                  <DropdownMenuItem onClick={() => handleOpenUnpublishDialog(course)}>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Unpublish Course
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleRepublishCourse(course)}>
                                    <Power className="h-4 w-4 mr-2" />
                                    Republish Course
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleOpenDeleteDialog(course)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Course
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedCourse?.title}&quot;? This action will mark the course as inactive.
              Enrolled students will retain access to their purchased content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCourse}
            >
              Delete Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpublish Confirmation Dialog */}
      <Dialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to unpublish &quot;{selectedCourse?.title}&quot;? The course will be hidden from new students
              but existing enrollments will remain active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnpublishDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUnpublishCourse}>
              Unpublish Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
