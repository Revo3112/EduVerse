/**
 * Goldsky Analytics Service for EduVerse Platform
 *
 * Provides comprehensive analytics data from Goldsky GraphQL indexer
 * Implements type-safe queries with proper error handling and data transformation
 *
 * @author EduVerse Team
 * @version 2.0.0 - PRODUCTION READY
 * @note All queries match Goldsky schema v1.2.0
 */

import { fetchGraphQL } from "./goldsky.service";
import { request } from "graphql-request";
import {
  ANALYTICS_NETWORK_STATS,
  ANALYTICS_PLATFORM_STATS,
} from "@/graphql/goldsky-analytics.queries";

const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT;

if (!GOLDSKY_ENDPOINT) {
  console.error(
    "[Goldsky Analytics] NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not configured"
  );
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Platform-wide analytics metrics
 */
export interface PlatformAnalyticsData {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalCertificates: number;
  totalRevenue: string; // Wei
  totalRevenueEth: string; // ETH
  platformFees: string; // Wei
  platformFeesEth: string; // ETH
  creatorRevenue: string; // Wei
  creatorRevenueEth: string; // ETH
  averageCoursePrice: string; // ETH
  averageCompletionRate: string; // Percentage
  averageRating: string; // 0-5
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  lastUpdateTimestamp: number;
}

/**
 * Course-specific analytics
 */
export interface CourseAnalyticsData {
  totalCourses: number;
  activeCourses: number;
  deletedCourses: number;
  coursesByCategory: Record<string, number>;
  coursesByDifficulty: Record<string, number>;
  averagePrice: string; // ETH
  averageRating: string; // 0-5
  totalRatings: number;
  coursesWithRatings: number;
  totalSections: number;
  averageSectionsPerCourse: number;
}

/**
 * User engagement analytics
 */
export interface UserAnalyticsData {
  uniqueAddresses: number;
  activeStudents: number;
  activeCreators: number;
  blacklistedUsers: number;
  studentsWithEnrollments: number;
  studentsWithCompletions: number;
  creatorsWithRevenue: number;
}

/**
 * Progress tracking analytics
 */
export interface ProgressAnalyticsData {
  totalSectionsCompleted: number;
  totalCoursesCompleted: number;
  uniqueStudentsWithProgress: number;
  averageCompletionPercentage: string;
  totalSectionsStarted: number;
  averageDropoffRate: string; // Percentage
}

/**
 * License/Enrollment analytics
 */
export interface LicenseAnalyticsData {
  totalLicensesMinted: number;
  totalLicensesRenewed: number;
  activeLicenses: number;
  expiredLicenses: number;
  totalLicenseRevenue: string; // Wei
  totalLicenseRevenueEth: string; // ETH
  averageLicensePrice: string; // ETH
  averageRenewalCount: string;
}

/**
 * Certificate analytics
 */
export interface CertificateAnalyticsData {
  totalCertificateHolders: number;
  totalCoursesInCertificates: number;
  certificateUpdates: number;
  totalCertificateRevenue: string; // Wei
  totalCertificateRevenueEth: string; // ETH
  averageCoursesPerCertificate: string;
}

/**
 * Activity event data from ActivityEvent entity
 */
export interface ActivityEventData {
  id: string;
  type: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  description: string;
  metadata: string | null;
  user: {
    id: string;
    address: string;
  };
  course: {
    id: string;
    title: string;
  } | null;
  enrollment: {
    id: string;
  } | null;
  certificate: {
    id: string;
    tokenId: string;
  } | null;
}

/**
 * Comprehensive analytics combining all data sources
 */
interface ComprehensiveAnalytics {
  platform: PlatformAnalyticsData;
  courses: CourseAnalyticsData;
  users: UserAnalyticsData;
  progress: ProgressAnalyticsData;
  licenses: LicenseAnalyticsData;
  certificates: CertificateAnalyticsData;
  network: {
    totalTransactions: number;
    totalCourseCreations: number;
    totalLicenseMints: number;
    totalCertificateMints: number;
    totalProgressUpdates: number;
    courseFactoryInteractions: number;
    courseLicenseInteractions: number;
    progressTrackerInteractions: number;
    certificateManagerInteractions: number;
    averageBlockTime: number;
  };
}

export type { ComprehensiveAnalytics };

// ============================================================================
// GRAPHQL RESPONSE TYPES
// ============================================================================

interface NetworkStatsData {
  id: string;
  totalTransactions: string;
  totalCourseCreations: string;
  totalLicenseMints: string;
  totalCertificateMints: string;
  totalProgressUpdates: string;
  courseFactoryInteractions: string;
  courseLicenseInteractions: string;
  progressTrackerInteractions: string;
  certificateManagerInteractions: string;
  lastBlockNumber: string;
  lastBlockTimestamp: string;
  averageBlockTime: string;
}

interface PlatformStatsData {
  id: string;
  totalUsers: string;
  totalCourses: string;
  totalEnrollments: string;
  totalCertificates: string;
  totalRevenue: string;
  totalRevenueEth: string;
  platformFees: string;
  platformFeesEth: string;
  creatorRevenue: string;
  creatorRevenueEth: string;
  averageCoursePrice: string;
  averageCompletionRate: string;
  averageRating: string;
  dailyActiveUsers: string;
  monthlyActiveUsers: string;
  lastUpdateTimestamp: string;
  lastUpdateBlock: string;
}

interface GraphQLCourse {
  id: string;
  totalRevenue?: string;
  totalRevenueEth?: string;
  totalRatings?: string;
  averageRating?: string;
  completedStudents?: string;
  totalEnrollments?: string;
  isDeleted?: boolean;
  isActive?: boolean;
  category?: string;
  difficulty?: string;
  price?: string;
  sections?: GraphQLCourseSection[];
}

interface GraphQLCourseSection {
  id: string;
  courseId?: string;
  isPublished?: boolean;
  isDeleted?: boolean;
  startedCount?: string;
  completedCount?: string;
  dropoffRate?: string;
}

interface GraphQLUserProfile {
  id: string;
  lastActivityAt?: string;
  totalCoursesCreated?: string;
  totalCoursesEnrolled?: string;
  totalCertificatesEarned?: string;
  isBlacklisted?: boolean;
  coursesEnrolled?: string;
  coursesCompleted?: string;
  totalRevenue?: string;
  totalSectionsCompleted?: string;
}

interface GraphQLEnrollment {
  id: string;
  studentAddress?: string;
  courseId?: string;
  isCompleted?: boolean;
  timestamp?: string;
  isActive?: boolean;
  totalRenewals?: string;
  totalSpent?: string;
  totalSpentEth?: string;
  licenseExpiry?: string;
}

interface GraphQLCertificate {
  id: string;
  recipientAddress?: string;
  totalRevenue?: string;
  timestamp?: string;
  totalCourses?: string;
}

interface GraphQLActivityEvent {
  id: string;
  type: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  description: string;
  metadata: string | null;
  user: {
    id: string;
    address: string;
  } | null;
  course: {
    id: string;
    title: string;
  } | null;
  enrollment: {
    id: string;
  } | null;
  certificate: {
    id: string;
    tokenId: string;
  } | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely parse BigInt string to number
 */
function parseBigIntSafe(
  value: string | number | bigint | null | undefined
): number {
  if (!value) return 0;
  try {
    return parseInt(value.toString());
  } catch {
    return 0;
  }
}

/**
 * Calculate average from number array
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate platform fee (2% of revenue)
 */
function calculatePlatformFee(revenue: string): string {
  try {
    const revenueBigInt = BigInt(revenue);
    const fee = (revenueBigInt * BigInt(200)) / BigInt(10000); // 2%
    return fee.toString();
  } catch {
    return "0";
  }
}

/**
 * Wei to ETH conversion
 */
function weiToEth(wei: string): string {
  try {
    const weiBigInt = BigInt(wei);
    const eth = Number(weiBigInt) / 1e18;
    return eth.toFixed(6);
  } catch {
    return "0";
  }
}

// ============================================================================
// PLATFORM ANALYTICS - Aggregated from all entities
// ============================================================================

/**
 * Get platform-wide analytics
 * Calculates metrics by aggregating Course, Enrollment, Certificate, UserProfile
 */
export async function getPlatformAnalytics(): Promise<PlatformAnalyticsData> {
  const query = `
    query GetPlatformAnalytics {
      courses(first: 1000) {
        id
        totalRevenue
        totalRevenueEth
        averageRating
        totalRatings
        completedStudents
        totalEnrollments
      }
      userProfiles(first: 1000) {
        id
        lastActivityAt
      }
      enrollments(first: 1000) {
        id
        totalSpent
      }
      certificates(first: 1000) {
        id
        totalRevenue
        totalRevenueEth
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query, {}, "getPlatformAnalytics");

    const courses: GraphQLCourse[] = data.courses || [];
    const users: GraphQLUserProfile[] = data.userProfiles || [];
    const enrollments: GraphQLEnrollment[] = data.enrollments || [];
    const certificates: GraphQLCertificate[] = data.certificates || [];

    // Calculate total revenue from courses
    const courseRevenue = courses.reduce(
      (sum: bigint, c: GraphQLCourse) => sum + BigInt(c.totalRevenue || "0"),
      BigInt(0)
    );

    // Calculate total revenue from certificates
    const certRevenue = certificates.reduce(
      (sum: bigint, c: GraphQLCertificate) =>
        sum + BigInt(c.totalRevenue || "0"),
      BigInt(0)
    );

    const totalRevenue = courseRevenue + certRevenue;
    const totalRevenueStr = totalRevenue.toString();
    const totalRevenueEth = weiToEth(totalRevenueStr);

    // Calculate platform fees (2%)
    const platformFees = calculatePlatformFee(totalRevenueStr);
    const platformFeesEth = weiToEth(platformFees);

    // Calculate creator revenue (98%)
    const creatorRevenue = (totalRevenue - BigInt(platformFees)).toString();
    const creatorRevenueEth = weiToEth(creatorRevenue);

    // Calculate average course price
    const coursesWithPrice = courses.filter(
      (c: GraphQLCourse) => parseFloat(c.totalRevenueEth || "0") > 0
    );
    const avgPrice =
      coursesWithPrice.length > 0
        ? (
            coursesWithPrice.reduce(
              (sum: number, c: GraphQLCourse) =>
                sum + parseFloat(c.totalRevenueEth || "0"),
              0
            ) / coursesWithPrice.length
          ).toFixed(6)
        : "0";

    // Calculate average rating
    const coursesWithRatings = courses.filter(
      (c: GraphQLCourse) => parseBigIntSafe(c.totalRatings) > 0
    );
    const avgRating =
      coursesWithRatings.length > 0
        ? (
            coursesWithRatings.reduce(
              (sum: number, c: GraphQLCourse) =>
                sum + parseFloat(c.averageRating || "0"),
              0
            ) / coursesWithRatings.length
          ).toFixed(2)
        : "0";

    // Calculate completion rate
    const totalCompletions = courses.reduce(
      (sum: number, c: GraphQLCourse) =>
        sum + parseBigIntSafe(c.completedStudents),
      0
    );
    const totalEnrollmentsCount = courses.reduce(
      (sum: number, c: GraphQLCourse) =>
        sum + parseBigIntSafe(c.totalEnrollments),
      0
    );
    const completionRate =
      totalEnrollmentsCount > 0
        ? ((totalCompletions / totalEnrollmentsCount) * 100).toFixed(2)
        : "0";

    // Calculate active users (last 24 hours)
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
    const dailyActive = users.filter(
      (u: GraphQLUserProfile) => parseBigIntSafe(u.lastActivityAt) > oneDayAgo
    ).length;

    // Calculate monthly active users (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 2592000;
    const monthlyActive = users.filter(
      (u: GraphQLUserProfile) =>
        parseBigIntSafe(u.lastActivityAt) > thirtyDaysAgo
    ).length;

    return {
      totalUsers: users.length,
      totalCourses: courses.length,
      totalEnrollments: enrollments.length,
      totalCertificates: certificates.length,
      totalRevenue: totalRevenueStr,
      totalRevenueEth,
      platformFees,
      platformFeesEth,
      creatorRevenue,
      creatorRevenueEth,
      averageCoursePrice: avgPrice,
      averageCompletionRate: completionRate,
      averageRating: avgRating,
      dailyActiveUsers: dailyActive,
      monthlyActiveUsers: monthlyActive,
      lastUpdateTimestamp: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error("[Goldsky Analytics] getPlatformAnalytics failed:", error);
    // Return empty data instead of throwing
    return {
      totalUsers: 0,
      totalCourses: 0,
      totalEnrollments: 0,
      totalCertificates: 0,
      totalRevenue: "0",
      totalRevenueEth: "0",
      platformFees: "0",
      platformFeesEth: "0",
      creatorRevenue: "0",
      creatorRevenueEth: "0",
      averageCoursePrice: "0",
      averageCompletionRate: "0",
      averageRating: "0",
      dailyActiveUsers: 0,
      monthlyActiveUsers: 0,
      lastUpdateTimestamp: Math.floor(Date.now() / 1000),
    };
  }
}

// ============================================================================
// COURSE ANALYTICS
// ============================================================================

/**
 * Get course-specific analytics
 * Aggregates data from Course entities
 */
export async function getCourseAnalytics(): Promise<CourseAnalyticsData> {
  const query = `
    query GetCourseAnalytics {
      courses(first: 1000) {
        id
        category
        difficulty
        priceInEth
        averageRating
        totalRatings
        sectionsCount
        isActive
        isDeleted
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query, {}, "getCourseAnalytics");
    const courses = data.courses || [];

    // Aggregate data
    const totalCourses = courses.length;
    const activeCourses = courses.filter(
      (c: GraphQLCourse) => c.isActive && !c.isDeleted
    ).length;
    const deletedCourses = courses.filter(
      (c: GraphQLCourse) => c.isDeleted
    ).length;

    // Category breakdown
    const categoryCount: Record<string, number> = {};
    courses.forEach((c: GraphQLCourse) => {
      const cat = c.category || "Other";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Group by difficulty
    const byDifficulty: Record<string, number> = {};
    courses.forEach((c: GraphQLCourse) => {
      const diff = c.difficulty || "Beginner";
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
    });

    // Price statistics
    const prices = courses
      .map((c: GraphQLCourse) => parseFloat(c.price || "0"))
      .filter((p: number) => p > 0);
    const averagePrice =
      prices.length > 0 ? calculateAverage(prices).toFixed(6) : "0";

    // Rating statistics
    const ratings = courses
      .filter((c: GraphQLCourse) => parseBigIntSafe(c.totalRatings) > 0)
      .map((c: GraphQLCourse) => parseFloat(c.averageRating || "0"));
    const averageRating =
      ratings.length > 0 ? calculateAverage(ratings).toFixed(2) : "0";
    const totalRatings = courses.reduce(
      (sum: number, c: GraphQLCourse) => sum + parseBigIntSafe(c.totalRatings),
      0
    );
    const coursesWithRatings = ratings.length;

    // Section statistics
    const totalSections = courses.reduce(
      (sum: number, c: GraphQLCourse) => sum + (c.sections?.length || 0),
      0
    );
    const averageSectionsPerCourse =
      totalCourses > 0 ? totalSections / totalCourses : 0;

    return {
      totalCourses,
      activeCourses,
      deletedCourses,
      coursesByCategory: categoryCount,
      coursesByDifficulty: byDifficulty,
      averagePrice,
      averageRating,
      totalRatings,
      coursesWithRatings,
      totalSections,
      averageSectionsPerCourse,
    };
  } catch (error) {
    console.error("[Goldsky Analytics] getCourseAnalytics failed:", error);
    return {
      totalCourses: 0,
      activeCourses: 0,
      deletedCourses: 0,
      coursesByCategory: {},
      coursesByDifficulty: {},
      averagePrice: "0",
      averageRating: "0",
      totalRatings: 0,
      coursesWithRatings: 0,
      totalSections: 0,
      averageSectionsPerCourse: 0,
    };
  }
}

// ============================================================================
// USER ANALYTICS
// ============================================================================

/**
 * Get user engagement analytics
 * Aggregates UserProfile data
 */
export async function getUserAnalytics(): Promise<UserAnalyticsData> {
  if (!GOLDSKY_ENDPOINT) {
    return {
      uniqueAddresses: 0,
      activeStudents: 0,
      activeCreators: 0,
      blacklistedUsers: 0,
      studentsWithEnrollments: 0,
      studentsWithCompletions: 0,
      creatorsWithRevenue: 0,
    };
  }

  const query = `
    query GetUserAnalytics {
      userProfiles(first: 1000) {
        id
        coursesEnrolled
        coursesCompleted
        coursesCreated
        totalRevenue
        isBlacklisted
      }
    }
  `;

  try {
    const data = await request<{ userProfiles: GraphQLUserProfile[] }>(
      GOLDSKY_ENDPOINT,
      query
    );
    const users: GraphQLUserProfile[] = data.userProfiles || [];

    const uniqueAddresses = new Set(users.map((u: GraphQLUserProfile) => u.id))
      .size;
    const activeStudents = users.filter(
      (u: GraphQLUserProfile) => parseBigIntSafe(u.totalCoursesEnrolled) > 0
    ).length;
    const activeCreators = users.filter(
      (u: GraphQLUserProfile) => parseBigIntSafe(u.totalCoursesCreated) > 0
    ).length;
    const blacklistedUsers = users.filter(
      (u: GraphQLUserProfile) => u.isBlacklisted
    ).length;
    const studentsWithEnrollments = users.filter(
      (u: GraphQLUserProfile) => parseBigIntSafe(u.coursesEnrolled) > 0
    ).length;
    const studentsWithCompletions = users.filter(
      (u: GraphQLUserProfile) => parseBigIntSafe(u.coursesCompleted) > 0
    ).length;
    const creatorsWithRevenue = users.filter(
      (u: GraphQLUserProfile) => parseBigIntSafe(u.totalRevenue) > 0
    ).length;

    return {
      uniqueAddresses,
      activeStudents,
      activeCreators,
      blacklistedUsers,
      studentsWithEnrollments,
      studentsWithCompletions,
      creatorsWithRevenue,
    };
  } catch (error) {
    console.error("[Goldsky Analytics] getUserAnalytics failed:", error);
    return {
      uniqueAddresses: 0,
      activeStudents: 0,
      activeCreators: 0,
      blacklistedUsers: 0,
      studentsWithEnrollments: 0,
      studentsWithCompletions: 0,
      creatorsWithRevenue: 0,
    };
  }
}

// ============================================================================
// PROGRESS ANALYTICS
// ============================================================================

/**
 * Get progress tracking analytics
 * Aggregates data from UserProfile and CourseSection
 */
export async function getProgressAnalytics(): Promise<ProgressAnalyticsData> {
  if (!GOLDSKY_ENDPOINT) {
    return {
      totalSectionsCompleted: 0,
      totalCoursesCompleted: 0,
      uniqueStudentsWithProgress: 0,
      averageCompletionPercentage: "0",
      totalSectionsStarted: 0,
      averageDropoffRate: "0",
    };
  }

  const query = `
    query GetProgressAnalytics {
      userProfiles(first: 1000) {
        id
        totalSectionsCompleted
        coursesCompleted
      }
      courseSections(first: 1000, where: { isDeleted: false }) {
        id
        startedCount
        completedCount
        dropoffRate
      }
    }
  `;

  try {
    const data = await request<{
      userProfiles: GraphQLUserProfile[];
      courseSections: GraphQLCourseSection[];
    }>(GOLDSKY_ENDPOINT, query);
    const users: GraphQLUserProfile[] = data.userProfiles || [];
    const sections: GraphQLCourseSection[] = data.courseSections || [];

    // Total sections completed across all users
    const totalSectionsCompleted = users.reduce(
      (sum: number, u: GraphQLUserProfile) =>
        sum + parseBigIntSafe(u.totalSectionsCompleted),
      0
    );

    // Total courses completed across all users
    const totalCoursesCompleted = users.reduce(
      (sum: number, u: GraphQLUserProfile) =>
        sum + parseBigIntSafe(u.coursesCompleted),
      0
    );

    // Unique students with progress
    const uniqueStudentsWithProgress = users.filter(
      (u: GraphQLUserProfile) => parseBigIntSafe(u.totalSectionsCompleted) > 0
    ).length;

    // Calculate average completion percentage from sections
    const totalStarted = sections.reduce(
      (sum: number, s: GraphQLCourseSection) =>
        sum + parseBigIntSafe(s.startedCount),
      0
    );
    const totalCompleted = sections.reduce(
      (sum: number, s: GraphQLCourseSection) =>
        sum + parseBigIntSafe(s.completedCount),
      0
    );
    const avgCompletionPercentage =
      totalStarted > 0
        ? ((totalCompleted / totalStarted) * 100).toFixed(2)
        : "0";

    // Calculate average dropoff rate
    const dropoffRates = sections
      .map((s: GraphQLCourseSection) => parseFloat(s.dropoffRate || "0"))
      .filter((r: number) => r > 0);
    const avgDropoffRate =
      dropoffRates.length > 0 ? calculateAverage(dropoffRates).toFixed(2) : "0";

    return {
      totalSectionsCompleted,
      totalCoursesCompleted,
      uniqueStudentsWithProgress,
      averageCompletionPercentage: avgCompletionPercentage,
      totalSectionsStarted: totalStarted,
      averageDropoffRate: avgDropoffRate,
    };
  } catch (error) {
    console.error("[Goldsky Analytics] getProgressAnalytics failed:", error);
    return {
      totalSectionsCompleted: 0,
      totalCoursesCompleted: 0,
      uniqueStudentsWithProgress: 0,
      averageCompletionPercentage: "0",
      totalSectionsStarted: 0,
      averageDropoffRate: "0",
    };
  }
}

// ============================================================================
// LICENSE ANALYTICS
// ============================================================================

/**
 * Get license/enrollment analytics
 * Aggregates data from Enrollment entities
 */
export async function getLicenseAnalytics(): Promise<LicenseAnalyticsData> {
  if (!GOLDSKY_ENDPOINT) {
    return {
      totalLicensesMinted: 0,
      totalLicensesRenewed: 0,
      activeLicenses: 0,
      expiredLicenses: 0,
      totalLicenseRevenue: "0",
      totalLicenseRevenueEth: "0",
      averageLicensePrice: "0",
      averageRenewalCount: "0",
    };
  }

  const query = `
    query GetLicenseAnalytics {
      enrollments(first: 1000) {
        id
        isActive
        totalRenewals
        pricePaid
        pricePaidEth
      }
    }
  `;

  try {
    const data = await request<{ enrollments: GraphQLEnrollment[] }>(
      GOLDSKY_ENDPOINT,
      query
    );
    const enrollments: GraphQLEnrollment[] = data.enrollments || [];

    const totalLicensesMinted = enrollments.length;
    const activeLicenses = enrollments.filter(
      (e: GraphQLEnrollment) => e.isActive
    ).length;
    const expiredLicenses = enrollments.filter(
      (e: GraphQLEnrollment) => !e.isActive
    ).length;

    // Total renewals
    const totalRenewals = enrollments.reduce(
      (sum: number, e: GraphQLEnrollment) =>
        sum + parseBigIntSafe(e.totalRenewals),
      0
    );

    // Calculate total revenue from licenses
    const totalRevenue = enrollments.reduce(
      (sum: bigint, e: GraphQLEnrollment) => sum + BigInt(e.totalSpent || "0"),
      BigInt(0)
    );
    const totalRevenueStr = totalRevenue.toString();
    const totalRevenueEth = weiToEth(totalRevenueStr);

    // Calculate average license price
    const prices = enrollments
      .map((e: GraphQLEnrollment) => parseFloat(e.totalSpentEth || "0"))
      .filter((p: number) => p > 0);
    const avgPrice =
      prices.length > 0 ? calculateAverage(prices).toFixed(6) : "0";

    // Calculate average renewal count
    const avgRenewalCount =
      totalLicensesMinted > 0
        ? (totalRenewals / totalLicensesMinted).toFixed(2)
        : "0";

    return {
      totalLicensesMinted,
      totalLicensesRenewed: totalRenewals,
      activeLicenses,
      expiredLicenses,
      totalLicenseRevenue: totalRevenueStr,
      totalLicenseRevenueEth: totalRevenueEth,
      averageLicensePrice: avgPrice,
      averageRenewalCount: avgRenewalCount,
    };
  } catch (error) {
    console.error("[Goldsky Analytics] getLicenseAnalytics failed:", error);
    return {
      totalLicensesMinted: 0,
      totalLicensesRenewed: 0,
      activeLicenses: 0,
      expiredLicenses: 0,
      totalLicenseRevenue: "0",
      totalLicenseRevenueEth: "0",
      averageLicensePrice: "0",
      averageRenewalCount: "0",
    };
  }
}

// ============================================================================
// CERTIFICATE ANALYTICS
// ============================================================================

/**
 * Get certificate analytics
 * Aggregates data from Certificate and CertificateCourse entities
 */
export async function getCertificateAnalytics(): Promise<CertificateAnalyticsData> {
  if (!GOLDSKY_ENDPOINT) {
    return {
      totalCertificateHolders: 0,
      totalCoursesInCertificates: 0,
      certificateUpdates: 0,
      totalCertificateRevenue: "0",
      totalCertificateRevenueEth: "0",
      averageCoursesPerCertificate: "0",
    };
  }

  const query = `
    query GetCertificateAnalytics {
      certificates(first: 1000) {
        id
        totalCourses
        totalRevenue
        totalRevenueEth
        lastUpdated
      }
      certificateCourses(first: 1000) {
        id
      }
    }
  `;

  try {
    const data = await request<{
      certificates: GraphQLCertificate[];
      certificateCourses: Array<{ id: string }>;
    }>(GOLDSKY_ENDPOINT, query);
    const certificates: GraphQLCertificate[] = data.certificates || [];
    const certificateCourses: Array<{ id: string }> =
      data.certificateCourses || [];

    const totalCertificateHolders = certificates.length;
    const totalCoursesInCertificates = certificateCourses.length;

    // Calculate total revenue from certificates
    const totalRevenue = certificates.reduce(
      (sum: bigint, c: GraphQLCertificate) =>
        sum + BigInt(c.totalRevenue || "0"),
      BigInt(0)
    );
    const totalRevenueStr = totalRevenue.toString();
    const totalRevenueEth = weiToEth(totalRevenueStr);

    // Calculate average courses per certificate
    const avgCoursesPerCert =
      totalCertificateHolders > 0
        ? (totalCoursesInCertificates / totalCertificateHolders).toFixed(1)
        : "0";

    // Certificate updates count (approximated by checking revenue changes)
    const certificateUpdates = certificates.filter(
      (c: GraphQLCertificate) => parseBigIntSafe(c.totalCourses) > 1
    ).length;

    return {
      totalCertificateHolders,
      totalCoursesInCertificates,
      certificateUpdates,
      totalCertificateRevenue: totalRevenueStr,
      totalCertificateRevenueEth: totalRevenueEth,
      averageCoursesPerCertificate: avgCoursesPerCert,
    };
  } catch (error) {
    console.error("[Goldsky Analytics] getCertificateAnalytics failed:", error);
    return {
      totalCertificateHolders: 0,
      totalCoursesInCertificates: 0,
      certificateUpdates: 0,
      totalCertificateRevenue: "0",
      totalCertificateRevenueEth: "0",
      averageCoursesPerCertificate: "0",
    };
  }
}

// ============================================================================
// ACTIVITY EVENTS
// ============================================================================

/**
 * Get recent platform activities
 * Fetches ActivityEvent entities ordered by timestamp
 */
export async function getRecentActivities(
  limit: number = 50
): Promise<ActivityEventData[]> {
  const query = `
    query GetRecentActivities($limit: Int!) {
      activityEvents(
        first: $limit
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        type
        timestamp
        blockNumber
        transactionHash
        description
        metadata
        user {
          id
          address
        }
        course {
          id
          title
        }
        enrollment {
          id
        }
        certificate {
          id
          tokenId
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query, { limit }, "getRecentActivities");
    const events: GraphQLActivityEvent[] = data.activityEvents || [];

    return events.map((event: GraphQLActivityEvent) => ({
      id: event.id,
      type: event.type,
      timestamp: parseBigIntSafe(event.timestamp),
      blockNumber: parseBigIntSafe(event.blockNumber),
      transactionHash: event.transactionHash,
      description: event.description,
      metadata: event.metadata,
      user: {
        id: event.user?.id || "",
        address: event.user?.address || "",
      },
      course: event.course
        ? {
            id: event.course.id,
            title: event.course.title,
          }
        : null,
      enrollment: event.enrollment
        ? {
            id: event.enrollment.id,
          }
        : null,
      certificate: event.certificate
        ? {
            id: event.certificate.id,
            tokenId: event.certificate.tokenId.toString(),
          }
        : null,
    }));
  } catch (error) {
    console.error("[Goldsky Analytics] getRecentActivities failed:", error);
    return [];
  }
}

// ============================================================================
// COMPREHENSIVE ANALYTICS
// ============================================================================

/**
 * Get all analytics in one call
 * Combines data from all analytics functions
 */
async function getNetworkStats(): Promise<{
  totalTransactions: number;
  totalCourseCreations: number;
  totalLicenseMints: number;
  totalCertificateMints: number;
  totalProgressUpdates: number;
  courseFactoryInteractions: number;
  courseLicenseInteractions: number;
  progressTrackerInteractions: number;
  certificateManagerInteractions: number;
  averageBlockTime: number;
}> {
  if (!GOLDSKY_ENDPOINT) {
    console.error(
      "[Goldsky Analytics] Cannot fetch network stats: Endpoint not configured. Please set NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT in .env.local"
    );
    return {
      totalTransactions: 0,
      totalCourseCreations: 0,
      totalLicenseMints: 0,
      totalCertificateMints: 0,
      totalProgressUpdates: 0,
      courseFactoryInteractions: 0,
      courseLicenseInteractions: 0,
      progressTrackerInteractions: 0,
      certificateManagerInteractions: 0,
      averageBlockTime: 2.1,
    };
  }

  try {
    const data = await request<{ networkStats: NetworkStatsData | null }>(
      GOLDSKY_ENDPOINT,
      ANALYTICS_NETWORK_STATS
    );

    const stats = data.networkStats;

    if (!stats) {
      return {
        totalTransactions: 0,
        totalCourseCreations: 0,
        totalLicenseMints: 0,
        totalCertificateMints: 0,
        totalProgressUpdates: 0,
        courseFactoryInteractions: 0,
        courseLicenseInteractions: 0,
        progressTrackerInteractions: 0,
        certificateManagerInteractions: 0,
        averageBlockTime: 2.1,
      };
    }

    return {
      totalTransactions: parseInt(stats.totalTransactions),
      totalCourseCreations: parseInt(stats.totalCourseCreations),
      totalLicenseMints: parseInt(stats.totalLicenseMints),
      totalCertificateMints: parseInt(stats.totalCertificateMints),
      totalProgressUpdates: parseInt(stats.totalProgressUpdates),
      courseFactoryInteractions: parseInt(stats.courseFactoryInteractions),
      courseLicenseInteractions: parseInt(stats.courseLicenseInteractions),
      progressTrackerInteractions: parseInt(stats.progressTrackerInteractions),
      certificateManagerInteractions: parseInt(
        stats.certificateManagerInteractions
      ),
      averageBlockTime: parseFloat(stats.averageBlockTime),
    };
  } catch (error) {
    console.error("[Goldsky Analytics] getNetworkStats failed:", error);
    return {
      totalTransactions: 0,
      totalCourseCreations: 0,
      totalLicenseMints: 0,
      totalCertificateMints: 0,
      totalProgressUpdates: 0,
      courseFactoryInteractions: 0,
      courseLicenseInteractions: 0,
      progressTrackerInteractions: 0,
      certificateManagerInteractions: 0,
      averageBlockTime: 2.1,
    };
  }
}

async function getPlatformStatsFromSubgraph(): Promise<{
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalCertificates: number;
  totalRevenueEth: string;
  platformFeesEth: string;
  creatorRevenueEth: string;
  averageCoursePrice: string;
  averageCompletionRate: string;
  averageRating: string;
}> {
  if (!GOLDSKY_ENDPOINT) {
    console.error(
      "[Goldsky Analytics] Cannot fetch platform stats: Endpoint not configured. Please set NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT in .env.local"
    );
    return {
      totalUsers: 0,
      totalCourses: 0,
      totalEnrollments: 0,
      totalCertificates: 0,
      totalRevenueEth: "0",
      platformFeesEth: "0",
      creatorRevenueEth: "0",
      averageCoursePrice: "0",
      averageCompletionRate: "0",
      averageRating: "0",
    };
  }

  try {
    const data = await request<{ platformStats: PlatformStatsData | null }>(
      GOLDSKY_ENDPOINT,
      ANALYTICS_PLATFORM_STATS
    );

    const stats = data.platformStats;

    if (!stats) {
      return {
        totalUsers: 0,
        totalCourses: 0,
        totalEnrollments: 0,
        totalCertificates: 0,
        totalRevenueEth: "0",
        platformFeesEth: "0",
        creatorRevenueEth: "0",
        averageCoursePrice: "0",
        averageCompletionRate: "0",
        averageRating: "0",
      };
    }

    return {
      totalUsers: parseInt(stats.totalUsers),
      totalCourses: parseInt(stats.totalCourses),
      totalEnrollments: parseInt(stats.totalEnrollments),
      totalCertificates: parseInt(stats.totalCertificates),
      totalRevenueEth: stats.totalRevenueEth,
      platformFeesEth: stats.platformFeesEth,
      creatorRevenueEth: stats.creatorRevenueEth,
      averageCoursePrice: stats.averageCoursePrice,
      averageCompletionRate: stats.averageCompletionRate,
      averageRating: stats.averageRating,
    };
  } catch (error) {
    console.error(
      "[Goldsky Analytics] getPlatformStatsFromSubgraph failed:",
      error
    );
    return {
      totalUsers: 0,
      totalCourses: 0,
      totalEnrollments: 0,
      totalCertificates: 0,
      totalRevenueEth: "0",
      platformFeesEth: "0",
      creatorRevenueEth: "0",
      averageCoursePrice: "0",
      averageCompletionRate: "0",
      averageRating: "0",
    };
  }
}

export async function getComprehensiveAnalytics(): Promise<ComprehensiveAnalytics> {
  try {
    const [
      platform,
      courses,
      users,
      progress,
      licenses,
      certificates,
      networkStats,
    ] = await Promise.all([
      getPlatformAnalytics(),
      getCourseAnalytics(),
      getUserAnalytics(),
      getProgressAnalytics(),
      getLicenseAnalytics(),
      getCertificateAnalytics(),
      getNetworkStats(),
    ]);

    return {
      platform,
      courses,
      users,
      progress,
      licenses,
      certificates,
      network: networkStats,
    };
  } catch (error) {
    console.error(
      "[Goldsky Analytics] getComprehensiveAnalytics failed:",
      error
    );
    throw error;
  }
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

const goldskyAnalyticsService = {
  getPlatformAnalytics,
  getCourseAnalytics,
  getUserAnalytics,
  getProgressAnalytics,
  getLicenseAnalytics,
  getCertificateAnalytics,
  getRecentActivities,
  getComprehensiveAnalytics,
  getNetworkStats,
  getPlatformStatsFromSubgraph,
};

export default goldskyAnalyticsService;
