/**
 * ============================================================================
 * GOLDSKY CREATOR SERVICE
 * ============================================================================
 * Service untuk fetch dan manage data course yang dibuat oleh creator
 * dari Goldsky indexer. Berbeda dengan myLearning yang menampilkan enrollments,
 * ini menampilkan courses yang user buat sebagai instructor/creator.
 * ============================================================================
 */

import { GraphQLClient } from "graphql-request";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

let graphqlClient: GraphQLClient | null = null;
let cachedEndpoint: string = "";

function getGraphQLClient(): GraphQLClient {
  const endpoint = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT;

  if (!endpoint) {
    throw new Error(
      "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT is not configured. Visit /test-env to diagnose."
    );
  }

  if (!graphqlClient || cachedEndpoint !== endpoint) {
    graphqlClient = new GraphQLClient(endpoint, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    cachedEndpoint = endpoint;
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

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

interface GraphQLErrorResponse {
  message?: string;
  status?: number;
  response?: {
    status?: number;
    errors?: Array<{
      extensions?: {
        code?: string;
      };
    }>;
  };
  stack?: string;
}

class GoldskyError extends Error {
  constructor(message: string, public code?: string, public details?: unknown) {
    super(message);
    this.name = "GoldskyError";
  }
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();

      return result;
    } catch (error: unknown) {
      lastError = error as Error;

      const errorObj = error as GraphQLErrorResponse;
      const errorStr = String(error);

      const isActual404 =
        errorObj?.response?.status === 404 ||
        errorObj?.status === 404 ||
        errorObj?.response?.errors?.[0]?.extensions?.code === "NOT_FOUND";

      if (isActual404) {
        throw new GoldskyError(
          `GraphQL endpoint not found (HTTP 404)`,
          "NOT_FOUND",
          error
        );
      }

      const isNetworkError =
        errorStr.includes("fetch") ||
        errorStr.includes("network") ||
        errorStr.includes("ECONNREFUSED") ||
        errorStr.includes("ENOTFOUND");

      if (!isNetworkError && i === 0) {
        throw error;
      }

      if (i < retries - 1) {
        const delay = RETRY_DELAY * (i + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new GoldskyError(
    `Operation failed after ${retries} retries: ${
      lastError?.message || "Unknown error"
    }`,
    "MAX_RETRIES_EXCEEDED",
    lastError
  );
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreatorCourseData {
  id: string;
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  category: number;
  difficulty: number;
  price: string;
  priceInEth: string;

  // Analytics
  totalEnrollments: number;
  activeEnrollments: number;
  completedStudents: number;
  totalRevenue: string;
  totalRevenueEth: string;

  // Ratings
  averageRating: number;
  totalRatings: number;

  // Sections
  sectionsCount: number;
  totalDuration: number;

  // Status
  isActive: boolean;
  isDeleted: boolean;

  // Timestamps
  createdAt: number;
  updatedAt: number;

  // Calculated fields
  completionRate: number;
  lastActivityAt?: number;
}

export interface CreatorStatsData {
  totalCourses: number;
  activeCourses: number;
  deletedCourses: number;
  totalEnrollments: number;
  totalActiveEnrollments: number;
  totalCompletedStudents: number;
  totalRevenue: string;
  totalRevenueEth: string;
  averageRating: number;
  totalRatings: number;
  totalStudents: number;
}

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const GET_CREATOR_COURSES_QUERY = `
  query GetCreatorCourses($creatorAddress: Bytes!) {
    courses(
      where: {
        creator: $creatorAddress,
        isDeleted: false
      }
      orderBy: createdAt
      orderDirection: desc
      first: 1000
    ) {
      id
      title
      description
      thumbnailCID
      creator
      category
      difficulty
      price
      priceInEth
      totalEnrollments
      activeEnrollments
      completedStudents
      totalRevenue
      totalRevenueEth
      averageRating
      totalRatings
      sectionsCount
      totalDuration
      isActive
      isDeleted
      createdAt
      updatedAt
    }

    userProfile(id: $creatorAddress) {
      id
      coursesCreated
      activeCoursesCreated
      deletedCoursesCreated
      totalStudents
      totalRevenue
      totalRevenueEth
      averageRating
      totalRatingsReceived
      firstCourseCreatedAt
      lastActivityAt
      createdAt
      updatedAt
    }
  }
`;

const GET_COURSE_DETAIL_QUERY = `
  query GetCourseDetail($courseId: ID!) {
    course(id: $courseId) {
      id
      title
      description
      thumbnailCID
      creator
      category
      difficulty
      price
      priceInEth
      totalEnrollments
      activeEnrollments
      completedStudents
      totalRevenue
      totalRevenueEth
      averageRating
      totalRatings
      sectionsCount
      totalDuration
      isActive
      isDeleted
      createdAt
      updatedAt

      sections(
        where: { isDeleted: false }
        orderBy: orderId
        orderDirection: asc
      ) {
        id
        sectionId
        orderId
        title
        contentCID
        duration
        startedCount
        completedCount
        dropoffRate
        isDeleted
        createdAt
      }
    }
  }
`;

const GET_CREATOR_STATS_QUERY = `
  query GetCreatorStats($creatorAddress: Bytes!) {
    userProfile(id: $creatorAddress) {
      id
      coursesCreated
      activeCoursesCreated
      deletedCoursesCreated
      totalStudents
      totalRevenue
      totalRevenueEth
      averageRating
      totalRatingsReceived
      revenueThisMonth
      revenueThisMonthEth
      firstCourseCreatedAt
      lastActivityAt
    }

    courses(
      where: {
        creator: $creatorAddress,
        isDeleted: false
      }
    ) {
      totalEnrollments
      activeEnrollments
      completedStudents
    }
  }
`;

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

function bigIntToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    try {
      const num = Number(value);
      if (Number.isSafeInteger(num)) {
        return num;
      }
      return Number(value);
    } catch {
      return 0;
    }
  }
  if (typeof value === "bigint") {
    const num = Number(value);

    return num;
  }
  return 0;
}

function formatTimestamp(timestamp: unknown): number {
  const ts = bigIntToNumber(timestamp);
  return ts;
}

function transformCourse(raw: Record<string, unknown>): CreatorCourseData {
  const totalEnrollments = bigIntToNumber(raw.totalEnrollments);
  const completedStudents = bigIntToNumber(raw.completedStudents);
  const completionRate =
    totalEnrollments > 0 ? (completedStudents / totalEnrollments) * 100 : 0;

  const safeParseFloat = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  return {
    id: raw.id as string,
    title: (raw.title as string) || "",
    description: (raw.description as string) || "",
    thumbnailCID: (raw.thumbnailCID as string) || "",
    creator: (raw.creator as string) || "",
    category: bigIntToNumber(raw.category),
    difficulty: bigIntToNumber(raw.difficulty),
    price: (raw.price as string) || "0",
    priceInEth: (raw.priceInEth as string) || "0",

    totalEnrollments,
    activeEnrollments: bigIntToNumber(raw.activeEnrollments),
    completedStudents,
    totalRevenue: (raw.totalRevenue as string) || "0",
    totalRevenueEth: (raw.totalRevenueEth as string) || "0",

    averageRating: safeParseFloat(raw.averageRating),
    totalRatings: bigIntToNumber(raw.totalRatings),

    sectionsCount: bigIntToNumber(raw.sectionsCount),
    totalDuration: bigIntToNumber(raw.totalDuration),

    isActive: Boolean(raw.isActive),
    isDeleted: Boolean(raw.isDeleted),

    createdAt: formatTimestamp(raw.createdAt),
    updatedAt: formatTimestamp(raw.updatedAt),

    completionRate: Math.round(completionRate * 100) / 100,
    lastActivityAt: formatTimestamp(raw.updatedAt),
  };
}

function calculateCreatorStats(
  courses: CreatorCourseData[],
  userProfile: Record<string, unknown> | null | undefined
): CreatorStatsData {
  const getStringValue = (key: string): string => {
    const value = userProfile?.[key];
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "bigint") return value.toString();
    return "0";
  };
  const totalEnrollments = courses.reduce(
    (sum, c) => sum + c.totalEnrollments,
    0
  );
  const totalActiveEnrollments = courses.reduce(
    (sum, c) => sum + c.activeEnrollments,
    0
  );
  const totalCompletedStudents = courses.reduce(
    (sum, c) => sum + c.completedStudents,
    0
  );

  // Calculate weighted average rating
  let totalWeightedRating = 0;
  let totalRatingCount = 0;
  courses.forEach((course) => {
    if (course.totalRatings > 0) {
      totalWeightedRating += course.averageRating * course.totalRatings;
      totalRatingCount += course.totalRatings;
    }
  });
  const averageRating =
    totalRatingCount > 0 ? totalWeightedRating / totalRatingCount : 0;

  return {
    totalCourses: courses.length,
    activeCourses: courses.filter((c) => c.isActive).length,
    deletedCourses: bigIntToNumber(userProfile?.deletedCoursesCreated),
    totalEnrollments,
    totalActiveEnrollments,
    totalCompletedStudents,
    totalRevenue: getStringValue("totalRevenue"),
    totalRevenueEth: getStringValue("totalRevenueEth"),
    averageRating: Math.round(averageRating * 100) / 100,
    totalRatings: totalRatingCount,
    totalStudents: bigIntToNumber(userProfile?.totalStudents),
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all courses created by a creator
 */
export async function getCreatorCourses(creatorAddress: string): Promise<{
  courses: CreatorCourseData[];
  stats: CreatorStatsData;
}> {
  // Normalize address
  const normalizedAddress = creatorAddress.toLowerCase();

  // Check cache
  const cacheKey = `creator-courses-${normalizedAddress}`;
  const cached = getCachedData<{
    courses: CreatorCourseData[];
    stats: CreatorStatsData;
  }>(cacheKey);
  if (cached) return cached;

  try {
    const client = getGraphQLClient();
    const variables = { creatorAddress: normalizedAddress };

    const data = (await executeWithRetry(async () => {
      const response = await client.request(
        GET_CREATOR_COURSES_QUERY,
        variables
      );
      return response;
    })) as {
      courses: Record<string, unknown>[];
      userProfile: Record<string, unknown> | null;
    };

    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Goldsky");
    }

    const courses = (data.courses || []).map(transformCourse);
    const stats = calculateCreatorStats(courses, data.userProfile);

    const result = { courses, stats };

    setCachedData(cacheKey, result);

    return result;
  } catch (error: unknown) {
    const emptyResult = {
      courses: [],
      stats: {
        totalCourses: 0,
        activeCourses: 0,
        deletedCourses: 0,
        totalEnrollments: 0,
        totalActiveEnrollments: 0,
        totalCompletedStudents: 0,
        totalStudents: 0,
        totalRevenue: "0",
        totalRevenueEth: "0",
        averageRating: 0,
        totalRatings: 0,
      } as CreatorStatsData,
    };

    if (error instanceof GoldskyError && error.code === "NOT_FOUND") {
      return emptyResult;
    }

    return emptyResult;
  }
}

/**
 * Get detailed course information (for creator view)
 */
export async function getCourseDetail(
  courseId: string
): Promise<CreatorCourseData | null> {
  // Check cache
  const cacheKey = `course-detail-${courseId}`;
  const cached = getCachedData<CreatorCourseData>(cacheKey);
  if (cached) return cached;

  // Execute query
  const client = getGraphQLClient();
  const variables = { courseId };

  try {
    const data = (await executeWithRetry(() =>
      client.request(GET_COURSE_DETAIL_QUERY, variables)
    )) as {
      course: Record<string, unknown> | null;
    };

    const course = data.course ? transformCourse(data.course) : null;

    if (course) {
      setCachedData(cacheKey, course);
    }

    return course;
  } catch (error: unknown) {
    if (error instanceof GoldskyError && error.code === "NOT_FOUND") {
      return null;
    }

    return null;
  }
}

/**
 * Get creator statistics only (lightweight query)
 */
export async function getCreatorStats(
  creatorAddress: string
): Promise<CreatorStatsData> {
  const normalizedAddress = creatorAddress.toLowerCase();
  const cacheKey = `stats:${normalizedAddress}`;
  const cached = getCachedData<CreatorStatsData>(cacheKey);
  if (cached) return cached;

  const emptyStats: CreatorStatsData = {
    totalCourses: 0,
    activeCourses: 0,
    deletedCourses: 0,
    totalEnrollments: 0,
    totalActiveEnrollments: 0,
    totalCompletedStudents: 0,
    totalStudents: 0,
    totalRevenue: "0",
    totalRevenueEth: "0",
    averageRating: 0,
    totalRatings: 0,
  };

  try {
    const client = getGraphQLClient();
    const variables = { creatorAddress: normalizedAddress };

    const data = (await executeWithRetry(() =>
      client.request(GET_CREATOR_STATS_QUERY, variables)
    )) as {
      courses: Record<string, unknown>[];
      userProfile: Record<string, unknown> | null;
    };

    const courses = (data.courses || []).map(transformCourse);
    const stats = calculateCreatorStats(courses, data.userProfile);

    setCachedData(cacheKey, stats);

    return stats;
  } catch {
    return emptyStats;
  }
}

/**
 * Refresh creator data (clear cache and refetch)
 */
export function refreshCreatorData(creatorAddress: string): void {
  const normalizedAddress = creatorAddress.toLowerCase();
  clearCache(normalizedAddress);
}

// ============================================================================
// HELPER FUNCTIONS FOR UI
// ============================================================================

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0m";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get IPFS URL for content
 */
export function getIPFSUrl(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`;
}

/**
 * Get Livepeer URL for video
 */
export function getLivepeerUrl(cid: string): string {
  return `https://livepeer.studio/asset/${cid}`;
}

/**
 * Get category name from ID
 */
export function getCategoryName(categoryId: number): string {
  const categories = [
    "Programming",
    "Design",
    "Business",
    "Marketing",
    "Personal Development",
    "Photography",
    "Music",
    "Health & Fitness",
    "Language",
    "Other",
  ];
  return categories[categoryId] || "Unknown";
}

/**
 * Get difficulty name from ID
 */
export function getDifficultyName(difficultyId: number): string {
  const difficulties = ["Beginner", "Intermediate", "Advanced"];
  return difficulties[difficultyId] || "Unknown";
}

/**
 * Calculate completion rate percentage
 */
export function getCompletionRateString(
  completed: number,
  total: number
): string {
  if (!Number.isFinite(total) || total === 0) return "0%";
  if (!Number.isFinite(completed)) return "0%";
  const rate = (completed / total) * 100;
  return `${Math.round(rate)}%`;
}

/**
 * Get revenue growth percentage
 */
export function getRevenueGrowth(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  if (!Number.isFinite(current)) return 0;
  const growth = ((current - previous) / previous) * 100;
  return Number.isFinite(growth) ? growth : 0;
}
