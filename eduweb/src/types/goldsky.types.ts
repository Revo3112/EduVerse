/**
 * Goldsky GraphQL Response Types
 *
 * Type definitions matching the EduVerse subgraph schema
 * Based on schema.graphql from goldsky-indexer/subgraph-custom/
 *
 * @module goldsky.types
 */

// ============================================================================
// ENUMS - Match Solidity Contract Enums
// ============================================================================

export enum CourseCategory {
  Programming = "Programming",
  Design = "Design",
  Business = "Business",
  Marketing = "Marketing",
  DataScience = "DataScience",
  Finance = "Finance",
  Healthcare = "Healthcare",
  Language = "Language",
  Arts = "Arts",
  Mathematics = "Mathematics",
  Science = "Science",
  Engineering = "Engineering",
  Technology = "Technology",
  Education = "Education",
  Psychology = "Psychology",
  Culinary = "Culinary",
  PersonalDevelopment = "PersonalDevelopment",
  Legal = "Legal",
  Sports = "Sports",
  Other = "Other",
}

export enum CourseDifficulty {
  Beginner = "Beginner",
  Intermediate = "Intermediate",
  Advanced = "Advanced",
}

export enum EnrollmentStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  COMPLETED = "COMPLETED",
}

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Course Entity from Goldsky
 */
export interface GoldskyCourse {
  id: string;
  creator: string; // Ethereum address (0x...)
  creatorName: string;

  // Metadata
  title: string;
  description: string;
  thumbnailCID: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;

  // Pricing
  price: string; // BigInt as string
  priceInEth: string; // BigDecimal as string
  isActive: boolean;
  isDeleted: boolean;

  // Certificate pricing
  certificatePrice: string; // BigInt as string
  certificatePriceEth: string; // BigDecimal as string

  // Emergency management
  isEmergencyDeactivated: boolean;
  emergencyDeactivationReason?: string;
  ratingsDisabled: boolean;

  // Content structure
  sectionsCount: string; // BigInt as string
  totalDuration: string; // BigInt as string (seconds)

  // Rating system
  averageRating: string; // BigDecimal as string
  totalRatings: string; // BigInt as string
  ratingSum: string; // BigInt as string

  // Analytics
  totalEnrollments: string; // BigInt as string
  activeEnrollments: string; // BigInt as string
  totalRevenue: string; // BigInt as string (wei)
  totalRevenueEth: string; // BigDecimal as string
  completedStudents: string; // BigInt as string
  completionRate: string; // BigDecimal as string

  // Timestamps
  createdAt: string; // BigInt as string (unix timestamp)
  updatedAt: string; // BigInt as string
  lastRatingAt: string; // BigInt as string

  // Transaction references
  creationTxHash: string; // 0x...
  blockNumber: string; // BigInt as string

  // Relationships (when queried)
  sections?: GoldskyCourseSection[];
  enrollments?: GoldskyEnrollment[];
}

/**
 * CourseSection Entity from Goldsky
 */
export interface GoldskyCourseSection {
  id: string; // Format: "courseId-sectionId"
  course: GoldskyCourse | { id: string }; // Can be full object or just ref
  sectionId: string; // BigInt as string
  orderId: string; // BigInt as string (for display order)
  title: string;
  contentCID: string; // IPFS/Livepeer CID
  duration: string; // BigInt as string (seconds)
  createdAt: string; // BigInt as string
  isDeleted: boolean;

  // Section analytics
  startedCount: string; // BigInt as string
  completedCount: string; // BigInt as string
  dropoffRate: string; // BigDecimal as string

  // Transaction references
  txHash: string;
  blockNumber: string;
}

/**
 * Enrollment Entity from Goldsky
 */
export interface GoldskyEnrollment {
  id: string; // Format: "studentAddress-courseId"
  student: string; // Ethereum address
  course: GoldskyCourse | { id: string };
  courseId: string; // BigInt as string

  // License details
  durationMonths: string; // BigInt as string
  purchasedAt: string; // BigInt as string (unix timestamp)
  expiryTimestamp: string; // BigInt as string
  isActive: boolean;

  // Progress tracking
  lastAccessedAt: string; // BigInt as string
  completedSectionsCount: string; // BigInt as string
  completionPercentage: string; // BigDecimal as string
  status: EnrollmentStatus;

  // Payment
  amountPaidWei: string; // BigInt as string
  amountPaidEth: string; // BigDecimal as string

  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string; // Optional, only if status is COMPLETED

  // Transaction
  enrollmentTxHash: string;
  blockNumber: string;

  // Relationships (when queried)
  progress?: GoldskyProgress[];
}

/**
 * Certificate Entity from Goldsky
 */
export interface GoldskyCertificate {
  id: string; // tokenId
  tokenId: string; // BigInt as string
  platformName: string;
  recipientName: string;
  recipientAddress: string; // Ethereum address
  lifetimeFlag: boolean;
  isValid: boolean;
  ipfsCID: string;
  baseRoute: string;

  // Metrics
  createdAt: string; // BigInt as string
  lastUpdated: string; // BigInt as string
  totalCourses: string; // BigInt as string

  // Transaction
  mintTxHash: string;
  blockNumber: string;

  // Relationships
  courses?: GoldskyCertificateCourse[];
}

/**
 * CertificateCourse Entity (course added to certificate)
 */
export interface GoldskyCertificateCourse {
  id: string; // Format: "certificateTokenId-courseId"
  certificate: GoldskyCertificate | { id: string };
  courseId: string; // BigInt as string
  addedAt: string; // BigInt as string
  ipfsCID: string;
  transactionHash: string;
  blockNumber: string;

  // Relationships
  course?: GoldskyCourse;
}

/**
 * Progress Entity (section-level progress)
 */
export interface GoldskyProgress {
  id: string; // Format: "enrollmentId-sectionId"
  enrollment: GoldskyEnrollment | { id: string };
  section: GoldskyCourseSection | { id: string };
  student: string; // Ethereum address
  courseId: string; // BigInt as string
  sectionId: string; // BigInt as string

  // Progress tracking
  isCompleted: boolean;
  startedAt: string; // BigInt as string
  completedAt?: string; // BigInt as string, optional
  lastAccessedAt: string; // BigInt as string

  // Transaction
  txHash: string;
  blockNumber: string;
}

/**
 * StudentCourseEnrollment (quick lookup entity)
 */
export interface GoldskyStudentCourseEnrollment {
  id: string; // Format: "studentAddress-courseId"
  student: string;
  courseId: string;
  enrollment: GoldskyEnrollment | { id: string };
}

// ============================================================================
// GRAPHQL QUERY RESPONSE TYPES
// ============================================================================

/**
 * Dashboard Stats Query Response
 */
export interface DashboardStatsResponse {
  enrollments: GoldskyEnrollment[];
  courses: GoldskyCourse[];
  certificates: GoldskyCertificate[];
}

/**
 * User Enrollments Query Response
 */
export interface UserEnrollmentsResponse {
  enrollments: GoldskyEnrollment[];
}

/**
 * User Courses (Teaching) Query Response
 */
export interface UserCoursesResponse {
  courses: GoldskyCourse[];
}

/**
 * User Activities Query Response
 */
export interface UserActivitiesResponse {
  enrollments: GoldskyEnrollment[];
  progresses: GoldskyProgress[];
  certificates: GoldskyCertificate[];
}

/**
 * Course Detail Query Response
 */
export interface CourseDetailResponse {
  course: GoldskyCourse | null;
}

/**
 * Enrollment Detail Query Response
 */
export interface EnrollmentDetailResponse {
  enrollment: GoldskyEnrollment | null;
}

// ============================================================================
// HELPER TYPES FOR DATA TRANSFORMATION
// ============================================================================

/**
 * Transformed dashboard stats for UI consumption
 */
export interface TransformedDashboardStats {
  coursesEnrolled: number;
  coursesCreated: number;
  coursesCompleted: number;
  ethEarned: string;
  growth: {
    enrolled: string;
    created: string;
    completed: string;
    earned: string;
  };
}

/**
 * Transformed learning course for UI
 */
export interface TransformedLearningCourse {
  id: string;
  title: string;
  progress: number;
  status: "In Progress" | "Not Started" | "Completed";
  thumbnailCID: string;
  courseId: string;
  totalSections: number;
  completedSections: number;
  expiryTimestamp: string;
  isActive: boolean;
}

/**
 * Transformed teaching course for UI
 */
export interface TransformedTeachingCourse {
  id: string;
  courseId: string;
  title: string;
  studentCount: number;
  status: "Active" | "Inactive";
  thumbnailCID: string;
  totalRevenue: string;
  activeEnrollments: number;
  averageRating: number;
}

/**
 * Transformed activity for UI
 */
export interface TransformedActivity {
  id: string;
  type: "enrollment" | "section" | "certificate" | "course_completed" | "course_created";
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  transactionHash?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Pagination parameters for queries
 */
export interface PaginationParams {
  first?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

/**
 * Common filter for user-specific queries
 */
export interface UserFilterParams {
  student?: string;
  creator?: string;
}
