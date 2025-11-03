/**
 * ============================================================================
 * GOLDSKY MYCOURSE SERVICE
 * ============================================================================
 * Service layer untuk fetch dan transform data dari Goldsky indexer
 * untuk halaman myCourse dengan caching, error handling, dan retry logic.
 * ============================================================================
 */

import { GraphQLClient } from "graphql-request";
import {
  GET_MY_COURSES_QUERY,
  GET_ENROLLMENT_DETAIL_QUERY,
  CHECK_ENROLLMENT_STATUS_QUERY,
  GET_USER_CERTIFICATES_QUERY,
  GET_CERTIFICATE_BY_TOKEN_ID,
  GET_USER_STATS_QUERY,
  type MyCoursesResponse,
  type GoldskyEnrollment,
  type GoldskyCourse,
  type GoldskyCourseSection,
  type GoldskyCertificate,
  type GoldskyUserProfile,
  type GetMyCoursesVariables,
  type GetEnrollmentDetailVariables,
  type CheckEnrollmentStatusVariables,
  type GetUserCertificatesVariables,
  type GetCertificateByTokenIdVariables,
  type GetUserStatsVariables,
} from "@/graphql/goldsky-mycourse.queries";
import { normalizeAddress } from "@/lib/address-helper";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Goldsky GraphQL endpoint
 * Uses NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT from .env.local
 */
const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || "";

/**
 * Cache configuration
 */
const CACHE_TTL = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

let graphqlClient: GraphQLClient | null = null;

/**
 * Initialize GraphQL client dengan error handling
 */
function getGraphQLClient(): GraphQLClient {
  if (!GOLDSKY_ENDPOINT) {
    throw new GoldskyError(
      "Goldsky endpoint not configured. Please set NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT in .env.local",
      "CONFIG_ERROR"
    );
  }

  if (!graphqlClient) {
    graphqlClient = new GraphQLClient(GOLDSKY_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return graphqlClient;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get data from cache if valid
 */
function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set data in cache
 */
function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear cache for specific key or all cache
 */
export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class GoldskyError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "GoldskyError";
  }
}

/**
 * Handle GraphQL errors dengan retry logic
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return executeWithRetry(operation, retries - 1);
    }

    let errorMessage = "Unknown error";
    let errorCode = "QUERY_ERROR";

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.message.includes("404")) {
        errorCode = "NOT_FOUND";
        errorMessage =
          "Data not found. This may indicate no enrollments exist yet for this address.";
      } else if (error.message.includes("Network")) {
        errorCode = "NETWORK_ERROR";
        errorMessage =
          "Network error connecting to Goldsky. Please check your connection.";
      }
    } else if (typeof error === "object" && error !== null) {
      if (
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null
      ) {
        const response = error.response as Record<string, unknown>;
        if (response.status === 404) {
          errorCode = "NOT_FOUND";
          errorMessage =
            "Goldsky endpoint returned 404. Verify NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT is correct.";
        } else if (response.errors && Array.isArray(response.errors)) {
          errorMessage = response.errors
            .map((e: { message?: string }) => e.message || "Unknown error")
            .join(", ");
        }
      } else if ("message" in error && typeof error.message === "string") {
        errorMessage = error.message;
      }
    }

    throw new GoldskyError(
      `Goldsky query failed: ${errorMessage}`,
      errorCode,
      error
    );
  }
}

// ============================================================================
// DATA TRANSFORMATION HELPERS
// ============================================================================

/**
 * Convert BigInt string to number (safely)
 */
function bigIntToNumber(value: string): number {
  try {
    return Number(value);
  } catch {
    return 0;
  }
}

/**
 * Convert Wei string to ETH number
 */
/**
 * Format timestamp to Date
 */
function formatTimestamp(timestamp: string): Date {
  const ts = bigIntToNumber(timestamp);
  return new Date(ts * 1000);
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "EXPIRED":
      return "red";
    case "COMPLETED":
      return "blue";
    default:
      return "gray";
  }
}

// ============================================================================
// TRANSFORMED DATA TYPES (untuk UI)
// ============================================================================

export interface EnrollmentData {
  id: string;
  courseId: string;

  // License
  isActive: boolean;
  status: "ACTIVE" | "EXPIRED" | "COMPLETED";
  expiryDate: Date;
  durationMonths: number;

  // Payment
  pricePaid: number; // ETH
  totalSpent: number; // ETH
  totalRenewals: number;

  // Progress
  isCompleted: boolean;
  completionPercentage: number;
  sectionsCompleted: number;
  totalSections: number;

  // Certificate
  hasCertificate: boolean;
  certificateTokenId: string | null;

  // Timestamps
  purchasedAt: Date;
  lastActivityAt: Date;
  completionDate: Date | null;

  // Course data
  course: CourseData;
}

export interface CourseData {
  id: string;
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  creatorName: string;
  category: string;
  difficulty: string;

  // Pricing
  pricePerMonth: number; // ETH

  // Stats
  totalEnrollments: number;
  activeEnrollments: number;
  completedStudents: number;
  totalRevenue: number; // ETH

  // Ratings
  averageRating: number;
  totalRatings: number;

  // Content
  totalSections: number;
  totalDuration: number; // seconds
  sections: CourseSectionData[];

  // Status
  isActive: boolean;
  isDeleted: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseSectionData {
  id: string;
  sectionId: number;
  orderId: number;
  title: string;
  contentCID: string;
  duration: number; // seconds

  // Analytics
  startedCount: number;
  completedCount: number;
  dropoffRate: number; // percentage

  createdAt: Date;
}

export interface CertificateData {
  id: string;
  tokenId: string;
  recipientName: string;
  totalCourses: number;

  // Display
  platformName: string;
  baseRoute: string;

  // Pricing
  mintPrice: number; // ETH
  totalPaid: number; // ETH (deprecated, use totalPaidEth)
  totalPaidEth: number; // ETH

  // Timestamps
  mintedAt: Date;
  lastUpdatedAt: Date;

  // Courses
  courses: {
    courseId: string;
    title: string;
    thumbnailCID: string;
    addedAt: Date;
    isCompleted: boolean;
    completionPercentage: number;
  }[];
}

export interface UserStatsData {
  coursesEnrolled: number;
  coursesCompleted: number;
  activeEnrollments: number;
  totalSpent: number; // ETH
  totalSpentOnCourses: number; // ETH
  totalSpentOnCertificates: number; // ETH
  totalSectionsCompleted: number;

  // Certificate
  hasCertificate: boolean;
  certificateTokenId: string | null;
  certificateName: string;
  totalCoursesInCertificate: number;

  // Activity
  lastActivityAt: Date | null;
  firstEnrollmentAt: Date | null;

  // Growth
  enrollmentsThisMonth: number;
  completionsThisMonth: number;
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform Goldsky enrollment to UI-friendly format
 */
function transformEnrollment(enrollment: GoldskyEnrollment): EnrollmentData {
  const course = enrollment.course;

  if (!course) {
    throw new GoldskyError(
      "Enrollment missing course data",
      "DATA_INTEGRITY_ERROR"
    );
  }

  return {
    id: enrollment.id,
    courseId: enrollment.courseId,

    isActive: enrollment.isActive,
    status: enrollment.status,
    expiryDate: formatTimestamp(enrollment.licenseExpiry),
    durationMonths: bigIntToNumber(enrollment.durationMonths),

    // Payment tracking
    pricePaid: parseFloat(enrollment.pricePaidEth || "0"),
    totalSpent: parseFloat(enrollment.totalSpentEth || "0"),
    totalRenewals: bigIntToNumber(enrollment.totalRenewals),

    // Progress
    isCompleted: enrollment.isCompleted,
    completionPercentage: bigIntToNumber(enrollment.completionPercentage),
    sectionsCompleted: bigIntToNumber(enrollment.sectionsCompleted),
    totalSections: bigIntToNumber(course.sectionsCount),

    // Certificate
    hasCertificate: enrollment.hasCertificate,
    certificateTokenId: enrollment.hasCertificate
      ? enrollment.certificateTokenId
      : null,

    // Timestamps
    purchasedAt: formatTimestamp(enrollment.purchasedAt),
    lastActivityAt: formatTimestamp(enrollment.lastActivityAt),
    completionDate: enrollment.isCompleted
      ? formatTimestamp(enrollment.completionDate)
      : null,

    // Course data
    course: transformCourse(course),
  };
}

/**
 * Transform Goldsky course to UI-friendly format
 */
function transformCourse(course: GoldskyCourse): CourseData {
  return {
    id: course.id,
    title: course.title || "Untitled Course",
    description: course.description || "",
    thumbnailCID: course.thumbnailCID || "",
    creator: course.creator || "",
    creatorName: course.creatorName || "Unknown",
    category: course.category || "Other",
    difficulty: course.difficulty || "Beginner",

    // Pricing
    pricePerMonth: parseFloat(course.priceInEth || "0"),

    // Stats
    totalEnrollments: bigIntToNumber(course.totalEnrollments),
    activeEnrollments: bigIntToNumber(course.activeEnrollments),
    completedStudents: bigIntToNumber(course.completedStudents),
    totalRevenue: parseFloat(course.totalRevenueEth || "0"),

    // Rating
    averageRating: parseFloat(course.averageRating || "0"),
    totalRatings: bigIntToNumber(course.totalRatings),

    // Sections
    totalSections: bigIntToNumber(course.sectionsCount),
    totalDuration: bigIntToNumber(course.totalDuration),
    sections: (course.sections || []).map(transformSection),

    // Status
    isActive: course.isActive || false,
    isDeleted: course.isDeleted || false,

    // Timestamps
    createdAt: formatTimestamp(course.createdAt),
    updatedAt: formatTimestamp(course.updatedAt),
  };
}

/**
 * Transform Goldsky section to UI-friendly format
 */
function transformSection(section: GoldskyCourseSection): CourseSectionData {
  return {
    id: section.id,
    sectionId: bigIntToNumber(section.sectionId),
    orderId: bigIntToNumber(section.orderId),
    title: section.title,
    contentCID: section.contentCID,
    duration: bigIntToNumber(section.duration),

    // Analytics
    startedCount: bigIntToNumber(section.startedCount),
    completedCount: bigIntToNumber(section.completedCount),
    dropoffRate: parseFloat(section.dropoffRate),

    createdAt: formatTimestamp(section.createdAt),
  };
}

/**
 * Transform Goldsky certificate to UI-friendly format
 */
function transformCertificate(
  certificate: GoldskyCertificate
): CertificateData {
  const totalPaidEth = parseFloat(certificate.totalRevenueEth);

  return {
    id: certificate.id,
    tokenId: certificate.tokenId,
    recipientName: certificate.recipientName,
    totalCourses: bigIntToNumber(certificate.totalCourses),

    // Display
    platformName: certificate.platformName,
    baseRoute: certificate.baseRoute,

    // Pricing
    mintPrice: totalPaidEth,
    totalPaid: totalPaidEth,
    totalPaidEth: totalPaidEth,

    // Timestamps
    mintedAt: formatTimestamp(certificate.createdAt),
    lastUpdatedAt: formatTimestamp(certificate.lastUpdated),

    // Courses
    courses: certificate.completedCourses.map((cc) => ({
      courseId: cc.course.id,
      title: cc.course.title,
      thumbnailCID: cc.course.thumbnailCID,
      addedAt: formatTimestamp(cc.addedAt),
      isCompleted: cc.enrollment.isCompleted,
      completionPercentage: bigIntToNumber(cc.enrollment.completionPercentage),
    })),
  };
}

/**
 * Transform Goldsky user profile to stats
 */
function transformUserStats(profile: GoldskyUserProfile | null): UserStatsData {
  if (!profile) {
    return {
      coursesEnrolled: 0,
      coursesCompleted: 0,
      activeEnrollments: 0,
      totalSpent: 0,
      totalSpentOnCourses: 0,
      totalSpentOnCertificates: 0,
      totalSectionsCompleted: 0,
      hasCertificate: false,
      certificateTokenId: null,
      certificateName: "",
      totalCoursesInCertificate: 0,
      lastActivityAt: null,
      firstEnrollmentAt: null,
      enrollmentsThisMonth: 0,
      completionsThisMonth: 0,
    };
  }

  return {
    coursesEnrolled: bigIntToNumber(profile.coursesEnrolled),
    coursesCompleted: bigIntToNumber(profile.coursesCompleted),
    activeEnrollments: bigIntToNumber(profile.activeEnrollments),
    totalSpent: parseFloat(profile.totalSpentEth),
    totalSpentOnCourses: parseFloat(profile.totalSpentOnCoursesEth),
    totalSpentOnCertificates: parseFloat(profile.totalSpentOnCertificatesEth),
    totalSectionsCompleted: bigIntToNumber(profile.totalSectionsCompleted),

    hasCertificate: profile.hasCertificate,
    certificateTokenId: profile.hasCertificate
      ? profile.certificateTokenId
      : null,
    certificateName: profile.certificateName,
    totalCoursesInCertificate: bigIntToNumber(
      profile.totalCoursesInCertificate
    ),

    lastActivityAt:
      profile.lastActivityAt !== "0"
        ? formatTimestamp(profile.lastActivityAt)
        : null,
    firstEnrollmentAt:
      profile.firstEnrollmentAt !== "0"
        ? formatTimestamp(profile.firstEnrollmentAt)
        : null,

    enrollmentsThisMonth: bigIntToNumber(profile.enrollmentsThisMonth),
    completionsThisMonth: bigIntToNumber(profile.completionsThisMonth),
  };
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Get all courses enrolled by user
 */
export async function getMyCourses(studentAddress: string): Promise<{
  enrollments: EnrollmentData[];
  userStats: UserStatsData;
  certificates: CertificateData[];
}> {
  if (!studentAddress) {
    return {
      enrollments: [],
      userStats: transformUserStats(null),
      certificates: [],
    };
  }

  const normalizedAddress = normalizeAddress(studentAddress);

  const cacheKey = `my-courses-${normalizedAddress}`;
  const cached = getCachedData<{
    enrollments: EnrollmentData[];
    userStats: UserStatsData;
    certificates: CertificateData[];
  }>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const client = getGraphQLClient();
    const variables: GetMyCoursesVariables = {
      studentAddress: normalizedAddress,
    };

    const data = await executeWithRetry(async () => {
      return await client.request<MyCoursesResponse>(
        GET_MY_COURSES_QUERY,
        variables
      );
    });

    const result = {
      enrollments: (data.enrollments || []).map(transformEnrollment),
      userStats: transformUserStats(data.userProfile || null),
      certificates: (data.certificates || []).map(transformCertificate),
    };

    setCachedData(cacheKey, result);

    return result;
  } catch {
    return {
      enrollments: [],
      userStats: transformUserStats(null),
      certificates: [],
    };
  }
}

/**
 * Get enrollment detail by ID
 */
export async function getEnrollmentDetail(
  enrollmentId: string
): Promise<EnrollmentData | null> {
  if (!enrollmentId) {
    return null;
  }

  const cacheKey = `enrollment-${enrollmentId}`;
  const cached = getCachedData<EnrollmentData | null>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const client = getGraphQLClient();
    const variables: GetEnrollmentDetailVariables = { enrollmentId };

    const data = await executeWithRetry(async () => {
      return await client.request<{ enrollment: GoldskyEnrollment | null }>(
        GET_ENROLLMENT_DETAIL_QUERY,
        variables
      );
    });

    const result = data.enrollment
      ? transformEnrollment(data.enrollment)
      : null;

    setCachedData(cacheKey, result);

    return result;
  } catch {
    return null;
  }
}

/**
 * Check if user is enrolled in specific course
 */
export async function checkEnrollmentStatus(
  studentAddress: string,
  courseId: string
): Promise<{
  isEnrolled: boolean;
  enrollment: EnrollmentData | null;
}> {
  if (!studentAddress || !courseId) {
    return { isEnrolled: false, enrollment: null };
  }

  const normalizedAddress = normalizeAddress(studentAddress);
  const cacheKey = `enrollment-status-${normalizedAddress}-${courseId}`;

  const cached = getCachedData<{
    isEnrolled: boolean;
    enrollment: EnrollmentData | null;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const client = getGraphQLClient();
    const variables: CheckEnrollmentStatusVariables = {
      studentAddress: normalizedAddress,
      courseId,
    };

    const data = await executeWithRetry(async () => {
      return await client.request<{
        studentCourseEnrollments: Array<{
          enrollment: GoldskyEnrollment;
        }>;
      }>(CHECK_ENROLLMENT_STATUS_QUERY, variables);
    });

    const isEnrolled =
      data.studentCourseEnrollments && data.studentCourseEnrollments.length > 0;
    let enrollment: EnrollmentData | null = null;

    if (isEnrolled) {
      const enrollmentId = data.studentCourseEnrollments[0].enrollment.id;
      enrollment = await getEnrollmentDetail(enrollmentId);
    }

    const result = { isEnrolled, enrollment };
    setCachedData(cacheKey, result);

    return result;
  } catch {
    return { isEnrolled: false, enrollment: null };
  }
}

/**
 * Get user certificates
 */
export async function getUserCertificates(
  studentAddress: string
): Promise<CertificateData[]> {
  if (!studentAddress) {
    return [];
  }

  const normalizedAddress = normalizeAddress(studentAddress);
  const cacheKey = `certificates-${normalizedAddress}`;

  const cached = getCachedData<CertificateData[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const client = getGraphQLClient();
    const variables: GetUserCertificatesVariables = {
      studentAddress: normalizedAddress,
    };

    const data = await executeWithRetry(async () => {
      return await client.request<{ certificates: GoldskyCertificate[] }>(
        GET_USER_CERTIFICATES_QUERY,
        variables
      );
    });

    const result = (data.certificates || []).map(transformCertificate);
    setCachedData(cacheKey, result);

    return result;
  } catch {
    return [];
  }
}

/**
 * Get certificate by tokenId (for QR verification)
 */
export async function getCertificateByTokenId(
  tokenId: string
): Promise<CertificateData | null> {
  if (!tokenId) {
    return null;
  }

  const cacheKey = `certificate-${tokenId}`;

  const cached = getCachedData<CertificateData>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const client = getGraphQLClient();
    const variables: GetCertificateByTokenIdVariables = {
      tokenId,
    };

    const data = await executeWithRetry(async () => {
      return await client.request<{ certificate: GoldskyCertificate | null }>(
        GET_CERTIFICATE_BY_TOKEN_ID,
        variables
      );
    });

    if (!data.certificate) {
      return null;
    }

    const result = transformCertificate(data.certificate);
    setCachedData(cacheKey, result);

    return result;
  } catch {
    return null;
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(
  studentAddress: string
): Promise<UserStatsData> {
  if (!studentAddress) {
    return transformUserStats(null);
  }

  const normalizedAddress = normalizeAddress(studentAddress);
  const cacheKey = `user-stats-${normalizedAddress}`;

  const cached = getCachedData<UserStatsData>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const client = getGraphQLClient();
    const variables: GetUserStatsVariables = {
      studentAddress: normalizedAddress,
    };

    const data = await executeWithRetry(async () => {
      return await client.request<{ userProfile: GoldskyUserProfile | null }>(
        GET_USER_STATS_QUERY,
        variables
      );
    });

    const result = transformUserStats(data.userProfile || null);
    setCachedData(cacheKey, result);

    return result;
  } catch {
    return transformUserStats(null);
  }
}

/**
 * Check certificate eligibility for a specific course
 * Business Logic:
 * 1. User must have completed ALL sections of the course (isCompleted === true)
 * 2. Completion can be before or after license expiry
 * 3. If not completed and license expired, must renew first
 */
export async function checkCertificateEligibility(
  studentAddress: string,
  courseId: string
): Promise<{
  eligible: boolean;
  reason: string | null;
  enrollmentData?: EnrollmentData;
}> {
  if (!studentAddress || !courseId) {
    return {
      eligible: false,
      reason: "Invalid student address or course ID",
    };
  }

  const normalizedAddress = normalizeAddress(studentAddress);

  try {
    const client = getGraphQLClient();
    const variables: CheckEnrollmentStatusVariables = {
      studentAddress: normalizedAddress,
      courseId,
    };

    const data = await executeWithRetry(async () => {
      return await client.request<{
        studentCourseEnrollments: Array<{
          enrollment: GoldskyEnrollment;
          course: GoldskyCourse;
        }>;
      }>(CHECK_ENROLLMENT_STATUS_QUERY, variables);
    });

    if (
      !data.studentCourseEnrollments ||
      data.studentCourseEnrollments.length === 0
    ) {
      return {
        eligible: false,
        reason:
          "You have not enrolled in this course. Please purchase a license first.",
      };
    }

    const enrollmentRaw = data.studentCourseEnrollments[0].enrollment;
    const courseRaw = data.studentCourseEnrollments[0].course;

    if (courseRaw.isDeleted || !courseRaw.isActive) {
      return {
        eligible: false,
        reason: "This course is no longer available.",
      };
    }

    if (!enrollmentRaw.isCompleted) {
      const now = Math.floor(Date.now() / 1000);
      const expiry = bigIntToNumber(enrollmentRaw.licenseExpiry);
      const isExpired = now > expiry;

      if (isExpired) {
        return {
          eligible: false,
          reason:
            "You have not completed this course and your license has expired. Please renew your license to continue learning and complete the course.",
        };
      } else {
        return {
          eligible: false,
          reason: `You have not completed this course yet. Progress: ${enrollmentRaw.completionPercentage}%. Please complete all sections first.`,
        };
      }
    }

    const enrollmentData = transformEnrollment(enrollmentRaw);

    return {
      eligible: true,
      reason: null,
      enrollmentData,
    };
  } catch (error) {
    console.error("[checkCertificateEligibility] Error:", error);
    return {
      eligible: false,
      reason: `Error checking eligibility: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Helper untuk clear cache untuk specific user
 * Useful untuk force refresh setelah transaction berhasil
 */
export function refreshUserData(address: string): void {
  const normalizedAddress = normalizeAddress(address);
  clearCache(`mycourses-${normalizedAddress}`);
  clearCache(`userstats-${normalizedAddress}`);
  clearCache(`certificates-${normalizedAddress}`);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format duration from seconds to human readable
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get IPFS URL for thumbnail
 */
export function getIPFSUrl(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`;
}

/**
 * Get Livepeer playback URL for section content
 */
export function getLivepeerUrl(cid: string): string {
  return `https://livepeer.studio/asset/${cid}/video`;
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Check if license needs renewal soon (< 7 days)
 */
export function needsRenewalSoon(expiryDate: Date): boolean {
  const daysLeft = getDaysUntilExpiry(expiryDate);
  return daysLeft > 0 && daysLeft <= 7;
}

/**
 * Get completion status message
 */
export function getCompletionStatus(percentage: number): {
  message: string;
  color: string;
} {
  if (percentage === 0) {
    return { message: "Not Started", color: "gray" };
  } else if (percentage < 25) {
    return { message: "Just Started", color: "blue" };
  } else if (percentage < 50) {
    return { message: "In Progress", color: "yellow" };
  } else if (percentage < 75) {
    return { message: "Halfway There", color: "orange" };
  } else if (percentage < 100) {
    return { message: "Almost Done", color: "green" };
  } else {
    return { message: "Completed", color: "green" };
  }
}
