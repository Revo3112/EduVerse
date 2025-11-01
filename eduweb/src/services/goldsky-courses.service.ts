/**
 * ============================================================================
 * GOLDSKY COURSES SERVICE
 * ============================================================================
 * Service untuk fetch dan manage data courses untuk Browse Courses page
 * dari Goldsky indexer. Menyediakan fungsi query, filter, search, dan sort.
 * ============================================================================
 */

import { GraphQLClient } from "graphql-request";

// ============================================================================
// CONFIGURATION
// ============================================================================

const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || "";

if (!GOLDSKY_ENDPOINT) {
  console.error(
    "[Goldsky Courses] NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not configured. Please set it in .env.local"
  );
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (more dynamic than creator dashboard)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// GraphQL Client singleton
let graphqlClient: GraphQLClient | null = null;

/**
 * Get or create GraphQL client
 */
function getGraphQLClient(): GraphQLClient {
  if (!GOLDSKY_ENDPOINT) {
    throw new GoldskyCoursesError(
      "Goldsky endpoint not configured. Set NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT in .env.local",
      CoursesErrorCode.NETWORK_ERROR,
      { endpoint: "NOT_CONFIGURED" }
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

export class GoldskyCoursesError extends Error {
  constructor(message: string, public code?: string, public details?: unknown) {
    super(message);
    this.name = "GoldskyCoursesError";
  }
}

export const CoursesErrorCode = {
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  NOT_FOUND: "NOT_FOUND",
  CACHE_ERROR: "CACHE_ERROR",
  TRANSFORM_ERROR: "TRANSFORM_ERROR",
} as const;

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;
      console.warn(
        `[Goldsky Courses] Attempt ${i + 1}/${retries} failed:`,
        error
      );

      if (i < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * (i + 1))
        );
      }
    }
  }

  const errorMessage = lastError
    ? `Operation failed after ${retries} retries: ${
        lastError instanceof Error ? lastError.message : "Unknown error"
      }`
    : `Operation failed after ${retries} retries`;

  throw new GoldskyCoursesError(
    errorMessage,
    CoursesErrorCode.NETWORK_ERROR,
    lastError instanceof Error ? lastError.message : undefined
  );
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CourseBrowseData {
  id: string;
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string; // lowercase hex address
  category: number;
  categoryName: string;
  difficulty: number;
  difficultyName: string;

  // Price
  price: string; // Wei as string
  priceInEth: string; // ETH as decimal string
  priceInIDR: number; // Calculated from ETH rate

  // Statistics
  totalEnrollments: number;
  activeEnrollments: number;
  completedStudents: number;
  averageRating: number; // 0-5
  totalRatings: number;

  // Course info
  sectionsCount: number;
  totalDuration: number; // seconds
  durationFormatted: string; // "2h 30m"

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: number; // Unix seconds
  updatedAt: number; // Unix seconds
}

export interface CourseFilters {
  category?: number | null;
  difficulty?: number | null;
  searchTerm?: string;
  minRating?: number;
  maxPrice?: number; // in ETH
}

export interface CourseSortOptions {
  sortBy?: "newest" | "enrollments" | "rating" | "price";
  sortDirection?: "asc" | "desc";
}

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const GET_ALL_COURSES_QUERY = `
  query GetAllCourses($first: Int, $skip: Int) {
    courses(
      where: {
        isDeleted: false,
        isActive: true
      }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
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
      averageRating
      totalRatings
      sectionsCount
      totalDuration
      isActive
      createdAt
      updatedAt
    }
  }
`;

const GET_COURSES_BY_CATEGORY_QUERY = `
  query GetCoursesByCategory($category: BigInt!, $first: Int, $skip: Int) {
    courses(
      where: {
        isDeleted: false,
        isActive: true,
        category: $category
      }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
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
      averageRating
      totalRatings
      sectionsCount
      totalDuration
      isActive
      createdAt
      updatedAt
    }
  }
`;

const GET_COURSES_BY_DIFFICULTY_QUERY = `
  query GetCoursesByDifficulty($difficulty: BigInt!, $first: Int, $skip: Int) {
    courses(
      where: {
        isDeleted: false,
        isActive: true,
        difficulty: $difficulty
      }
      orderBy: createdAt
      orderDirection: desc
      first: $first
      skip: $skip
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
      averageRating
      totalRatings
      sectionsCount
      totalDuration
      isActive
      createdAt
      updatedAt
    }
  }
`;

const GET_COURSE_BY_ID_QUERY = `
  query GetCourseById($id: ID!) {
    course(id: $id) {
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
      averageRating
      totalRatings
      sectionsCount
      totalDuration
      isActive
      isDeleted
      createdAt
      updatedAt
    }
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert BigInt to number safely
 */
function bigIntToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    try {
      return parseInt(value, 10);
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Format Unix timestamp
 */
function formatTimestamp(timestamp: unknown): number {
  const ts = bigIntToNumber(timestamp);
  return ts;
}

/**
 * Convert category enum string from GraphQL to display name
 */
export function categoryEnumToDisplayName(enumValue: string): string {
  const mapping: Record<string, string> = {
    Programming: "Programming",
    Design: "Design",
    Business: "Business",
    Marketing: "Marketing",
    DataScience: "Data Science",
    Finance: "Finance",
    Healthcare: "Healthcare",
    Language: "Language",
    Arts: "Arts",
    Mathematics: "Mathematics",
    Science: "Science",
    Engineering: "Engineering",
    Technology: "Technology",
    Education: "Education",
    Psychology: "Psychology",
    Culinary: "Culinary",
    PersonalDevelopment: "Personal Development",
    Legal: "Legal",
    Sports: "Sports",
    Other: "Other",
  };
  return mapping[enumValue] || "Unknown";
}

/**
 * Convert category enum string to index number
 */
export function categoryEnumToNumber(enumValue: string): number {
  const mapping: Record<string, number> = {
    Programming: 0,
    Design: 1,
    Business: 2,
    Marketing: 3,
    DataScience: 4,
    Finance: 5,
    Healthcare: 6,
    Language: 7,
    Arts: 8,
    Mathematics: 9,
    Science: 10,
    Engineering: 11,
    Technology: 12,
    Education: 13,
    Psychology: 14,
    Culinary: 15,
    PersonalDevelopment: 16,
    Legal: 17,
    Sports: 18,
    Other: 19,
  };
  return mapping[enumValue] ?? 0;
}

/**
 * Convert difficulty enum string from GraphQL to display name
 */
export function difficultyEnumToDisplayName(enumValue: string): string {
  const mapping: Record<string, string> = {
    Beginner: "Beginner",
    Intermediate: "Intermediate",
    Advanced: "Advanced",
  };
  return mapping[enumValue] || "Unknown";
}

/**
 * Convert difficulty enum string to index number
 */
export function difficultyEnumToNumber(enumValue: string): number {
  const mapping: Record<string, number> = {
    Beginner: 0,
    Intermediate: 1,
    Advanced: 2,
  };
  return mapping[enumValue] ?? 0;
}

/**
 * Get category name from ID (MUST match contract enum)
 * @deprecated Use categoryEnumToDisplayName for GraphQL enum strings
 */
export function getCategoryName(categoryId: number): string {
  const categories = [
    "Programming",
    "Design",
    "Business",
    "Marketing",
    "Data Science",
    "Finance",
    "Healthcare",
    "Language",
    "Arts",
    "Mathematics",
    "Science",
    "Engineering",
    "Technology",
    "Education",
    "Psychology",
    "Culinary",
    "Personal Development",
    "Legal",
    "Sports",
    "Other",
  ];
  return categories[categoryId] || "Unknown";
}

/**
 * Get difficulty name from ID (MUST match contract enum)
 * @deprecated Use difficultyEnumToDisplayName for GraphQL enum strings
 */
export function getDifficultyName(difficultyId: number): string {
  const difficulties = ["Beginner", "Intermediate", "Advanced"];
  return difficulties[difficultyId] || "Unknown";
}

/**
 * Format duration in seconds to human-readable string
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
 * Calculate price in IDR from ETH
 */
export function calculatePriceInIDR(
  priceEth: string,
  ethToIDR: number
): number {
  return parseFloat(priceEth) * ethToIDR;
}

/**
 * Format price for display
 */
export function formatPriceETH(priceEth: string): string {
  const eth = parseFloat(priceEth);
  return eth.toFixed(4) + " ETH";
}

/**
 * Transform raw GraphQL course data to typed interface
 */
function transformCourse(
  raw: Record<string, unknown>,
  ethToIDR?: number
): CourseBrowseData {
  const priceInEth = raw.priceInEth as string;
  const priceInIDR = ethToIDR ? calculatePriceInIDR(priceInEth, ethToIDR) : 0;

  const categoryEnum = raw.category as string;
  const difficultyEnum = raw.difficulty as string;
  const totalDuration = bigIntToNumber(raw.totalDuration);

  return {
    id: raw.id as string,
    title: raw.title as string,
    description: raw.description as string,
    thumbnailCID: raw.thumbnailCID as string,
    creator: (raw.creator as string).toLowerCase(),
    category: categoryEnumToNumber(categoryEnum),
    categoryName: categoryEnumToDisplayName(categoryEnum),
    difficulty: difficultyEnumToNumber(difficultyEnum),
    difficultyName: difficultyEnumToDisplayName(difficultyEnum),
    price: raw.price as string,
    priceInEth,
    priceInIDR,
    totalEnrollments: bigIntToNumber(raw.totalEnrollments),
    activeEnrollments: bigIntToNumber(raw.activeEnrollments),
    completedStudents: bigIntToNumber(raw.completedStudents),
    averageRating: parseFloat(raw.averageRating as string) || 0,
    totalRatings: bigIntToNumber(raw.totalRatings),
    sectionsCount: bigIntToNumber(raw.sectionsCount),
    totalDuration,
    durationFormatted: formatDuration(totalDuration),
    isActive: raw.isActive as boolean,
    createdAt: formatTimestamp(raw.createdAt),
    updatedAt: formatTimestamp(raw.updatedAt),
  };
}

// ============================================================================
// FILTER & SORT FUNCTIONS
// ============================================================================

/**
 * Apply client-side filters to courses
 */
export function applyFilters(
  courses: CourseBrowseData[],
  filters: CourseFilters
): CourseBrowseData[] {
  return courses.filter((course) => {
    // Category filter
    if (filters.category !== null && filters.category !== undefined) {
      if (course.category !== filters.category) return false;
    }

    // Difficulty filter
    if (filters.difficulty !== null && filters.difficulty !== undefined) {
      if (course.difficulty !== filters.difficulty) return false;
    }

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const matchTitle = course.title.toLowerCase().includes(term);
      const matchDesc = course.description.toLowerCase().includes(term);
      const matchCategory = course.categoryName.toLowerCase().includes(term);

      if (!matchTitle && !matchDesc && !matchCategory) return false;
    }

    // Rating filter
    if (filters.minRating && course.averageRating < filters.minRating) {
      return false;
    }

    // Price filter (in ETH)
    if (filters.maxPrice && parseFloat(course.priceInEth) > filters.maxPrice) {
      return false;
    }

    return true;
  });
}

/**
 * Apply client-side sorting to courses
 */
export function applySorting(
  courses: CourseBrowseData[],
  options: CourseSortOptions
): CourseBrowseData[] {
  const { sortBy = "newest", sortDirection = "desc" } = options;
  const sorted = [...courses];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "newest":
        comparison = b.createdAt - a.createdAt;
        break;
      case "enrollments":
        comparison = b.totalEnrollments - a.totalEnrollments;
        break;
      case "rating":
        comparison = b.averageRating - a.averageRating;
        break;
      case "price":
        comparison = parseFloat(b.priceInEth) - parseFloat(a.priceInEth);
        break;
    }

    return sortDirection === "asc" ? -comparison : comparison;
  });

  return sorted;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all active courses
 */
export async function getAllCourses(options?: {
  first?: number;
  skip?: number;
  ethToIDR?: number;
}): Promise<CourseBrowseData[]> {
  const { first = 100, skip = 0, ethToIDR } = options || {};

  // Check cache
  const cacheKey = `courses-all-${first}-${skip}`;
  const cached = getCachedData<CourseBrowseData[]>(cacheKey);
  if (cached) return cached;

  // Execute query
  const client = getGraphQLClient();
  const variables = { first, skip };

  const data = (await executeWithRetry(() =>
    client.request(GET_ALL_COURSES_QUERY, variables)
  )) as {
    courses: Record<string, unknown>[];
  };

  // Transform data
  const courses = (data.courses || []).map((course) =>
    transformCourse(course, ethToIDR)
  );

  // Cache result
  setCachedData(cacheKey, courses);

  return courses;
}

/**
 * Get courses by category
 */
export async function getCoursesByCategory(
  category: number,
  options?: {
    first?: number;
    skip?: number;
    ethToIDR?: number;
  }
): Promise<CourseBrowseData[]> {
  const { first = 100, skip = 0, ethToIDR } = options || {};

  // Check cache
  const cacheKey = `courses-category-${category}-${first}-${skip}`;
  const cached = getCachedData<CourseBrowseData[]>(cacheKey);
  if (cached) return cached;

  // Execute query
  const client = getGraphQLClient();
  const variables = { category, first, skip };

  const data = (await executeWithRetry(() =>
    client.request(GET_COURSES_BY_CATEGORY_QUERY, variables)
  )) as {
    courses: Record<string, unknown>[];
  };

  // Transform data
  const courses = (data.courses || []).map((course) =>
    transformCourse(course, ethToIDR)
  );

  // Cache result
  setCachedData(cacheKey, courses);

  return courses;
}

/**
 * Get courses by difficulty
 */
export async function getCoursesByDifficulty(
  difficulty: number,
  options?: {
    first?: number;
    skip?: number;
    ethToIDR?: number;
  }
): Promise<CourseBrowseData[]> {
  const { first = 100, skip = 0, ethToIDR } = options || {};

  // Check cache
  const cacheKey = `courses-difficulty-${difficulty}-${first}-${skip}`;
  const cached = getCachedData<CourseBrowseData[]>(cacheKey);
  if (cached) return cached;

  // Execute query
  const client = getGraphQLClient();
  const variables = { difficulty, first, skip };

  const data = (await executeWithRetry(() =>
    client.request(GET_COURSES_BY_DIFFICULTY_QUERY, variables)
  )) as {
    courses: Record<string, unknown>[];
  };

  // Transform data
  const courses = (data.courses || []).map((course) =>
    transformCourse(course, ethToIDR)
  );

  // Cache result
  setCachedData(cacheKey, courses);

  return courses;
}

/**
 * Get single course by ID
 */
export async function getCourseById(
  courseId: string,
  ethToIDR?: number
): Promise<CourseBrowseData | null> {
  // Check cache
  const cacheKey = `course-${courseId}`;
  const cached = getCachedData<CourseBrowseData>(cacheKey);
  if (cached) return cached;

  // Execute query
  const client = getGraphQLClient();
  const variables = { id: courseId };

  const data = (await executeWithRetry(() =>
    client.request(GET_COURSE_BY_ID_QUERY, variables)
  )) as {
    course: Record<string, unknown> | null;
  };

  if (!data.course) {
    return null;
  }

  // Transform data
  const course = transformCourse(data.course, ethToIDR);

  // Cache result
  setCachedData(cacheKey, course);

  return course;
}

/**
 * Search courses by text (client-side filtering)
 * For server-side search, would need full-text search support in subgraph
 */
export async function searchCourses(
  searchTerm: string,
  ethToIDR?: number
): Promise<CourseBrowseData[]> {
  // Get all courses
  const allCourses = await getAllCourses({ ethToIDR });

  // Apply search filter
  return applyFilters(allCourses, { searchTerm });
}

/**
 * Refresh courses data (clear cache)
 */
export function refreshCoursesData(pattern?: string): void {
  clearCache(pattern);
}

/**
 * Get statistics for courses
 */
export function getCoursesStatistics(courses: CourseBrowseData[]): {
  totalCourses: number;
  totalEnrollments: number;
  averageRating: number;
  categoriesCount: Record<string, number>;
  difficultiesCount: Record<string, number>;
} {
  const categoriesCount: Record<string, number> = {};
  const difficultiesCount: Record<string, number> = {};

  let totalEnrollments = 0;
  let totalRating = 0;
  let coursesWithRatings = 0;

  courses.forEach((course) => {
    // Count by category
    const categoryName = course.categoryName;
    categoriesCount[categoryName] = (categoriesCount[categoryName] || 0) + 1;

    // Count by difficulty
    const difficultyName = course.difficultyName;
    difficultiesCount[difficultyName] =
      (difficultiesCount[difficultyName] || 0) + 1;

    // Sum enrollments
    totalEnrollments += course.totalEnrollments;

    // Average rating
    if (course.totalRatings > 0) {
      totalRating += course.averageRating;
      coursesWithRatings++;
    }
  });

  const averageRating =
    coursesWithRatings > 0 ? totalRating / coursesWithRatings : 0;

  return {
    totalCourses: courses.length,
    totalEnrollments,
    averageRating: Math.round(averageRating * 10) / 10,
    categoriesCount,
    difficultiesCount,
  };
}

// ============================================================================
// EXPORT ALL CATEGORIES AND DIFFICULTIES FOR UI
// ============================================================================

export const ALL_CATEGORIES = [
  { id: 0, name: "Programming" },
  { id: 1, name: "Design" },
  { id: 2, name: "Business" },
  { id: 3, name: "Marketing" },
  { id: 4, name: "Data Science" },
  { id: 5, name: "Finance" },
  { id: 6, name: "Healthcare" },
  { id: 7, name: "Language" },
  { id: 8, name: "Arts" },
  { id: 9, name: "Mathematics" },
  { id: 10, name: "Science" },
  { id: 11, name: "Engineering" },
  { id: 12, name: "Technology" },
  { id: 13, name: "Education" },
  { id: 14, name: "Psychology" },
  { id: 15, name: "Culinary" },
  { id: 16, name: "Personal Development" },
  { id: 17, name: "Legal" },
  { id: 18, name: "Sports" },
  { id: 19, name: "Other" },
];

export const ALL_DIFFICULTIES = [
  { id: 0, name: "Beginner" },
  { id: 1, name: "Intermediate" },
  { id: 2, name: "Advanced" },
];
