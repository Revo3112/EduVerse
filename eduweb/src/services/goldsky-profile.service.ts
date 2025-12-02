/**
 * Goldsky GraphQL Client for User Profile Queries
 *
 * This service provides comprehensive profile data integration with Goldsky indexer.
 * All queries follow best practices from BUGFIX_SUMMARY.md:
 * - Always pass required variables (especially 'limit')
 * - Use correct entity names from schema.graphql
 * - Proper error handling and logging
 * - Type-safe interfaces matching GraphQL schema
 *
 * @author EduVerse Team
 * @see /goldsky-indexer/subgraph-custom/schema.graphql for entity definitions
 */

import { fetchGraphQL } from "./goldsky.service";

// ============================================================================
// TYPE DEFINITIONS - Match Goldsky Schema Exactly
// ============================================================================

/**
 * Complete UserProfile from Goldsky indexer
 * Maps to UserProfile entity in schema.graphql (L276-346)
 */
export interface UserProfileData {
  id: string; // address in lowercase
  address: string;

  // Student Statistics
  coursesEnrolled: string; // BigInt as string
  coursesCompleted: string;
  activeEnrollments: string;
  totalSpentOnCourses: string;
  totalSpentOnCoursesEth: string; // BigDecimal as string
  totalSpentOnCertificates: string;
  totalSpentOnCertificatesEth: string;
  totalSpent: string;
  totalSpentEth: string;

  // Moderation
  isBlacklisted: boolean;
  blacklistedAt: string | null;
  blacklistedBy: string | null;

  // Instructor Statistics
  coursesCreated: string;
  activeCoursesCreated: string;
  deletedCoursesCreated: string;
  totalStudents: string;
  totalRevenue: string;
  totalRevenueEth: string;
  averageRating: string;
  totalRatingsReceived: string;

  // Certificate Data
  hasCertificate: boolean;
  certificateTokenId: string;
  certificateName: string;
  totalCoursesInCertificate: string;
  certificateMintedAt: string;
  certificateLastUpdated: string;

  // Activity Tracking
  totalSectionsCompleted: string;
  lastActivityAt: string;
  firstEnrollmentAt: string;
  firstCourseCreatedAt: string;

  // Growth Metrics
  enrollmentsThisMonth: string;
  completionsThisMonth: string;
  revenueThisMonth: string;
  revenueThisMonthEth: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Transaction References
  firstTxHash: string;
  lastTxHash: string;
  blockNumber: string;
}

/**
 * Enrollment entity from Goldsky (L143-197)
 */
export interface EnrollmentData {
  id: string; // tokenId
  student: string;
  courseId: string;
  durationMonths: string;
  licenseExpiry: string;
  isActive: boolean;
  status: string; // "ACTIVE" | "EXPIRED" | "COMPLETED"

  pricePaid: string;
  pricePaidEth: string;
  platformFee: string;
  creatorRevenue: string;

  totalRenewals: string;
  lastRenewedAt: string;
  totalSpent: string;
  totalSpentEth: string;

  isCompleted: boolean;
  completionDate: string;
  completionPercentage: string;
  sectionsCompleted: string;

  hasCertificate: boolean;
  certificateTokenId: string;
  certificateAddedAt: string;
  certificatePrice: string;

  purchasedAt: string;
  lastActivityAt: string;

  // Related entities
  course: {
    id: string;
    title: string;
    description: string;
    thumbnailCID: string;
    category: string;
    difficulty: string;
    price: string;
    priceEth: string;
    totalSections: string;
    totalDuration: string;
    creator: string;
    creatorName: string;
    averageRating: string;
    totalRatings: string;
    isPublished: boolean;
  };
}

/**
 * Course entity from Goldsky (L55-138)
 */
export interface CourseData {
  id: string;
  creator: string;
  creatorName: string;
  title: string;
  description: string;
  thumbnailCID: string;
  category: string;
  difficulty: string;
  price: string;
  priceInEth: string;
  isActive: boolean;
  isDeleted: boolean;
  certificatePrice: string;
  certificatePriceEth: string;
  isEmergencyDeactivated: boolean;
  emergencyDeactivationReason?: string;
  ratingsDisabled: boolean;
  sectionsCount: string;
  totalDuration: string;
  averageRating: string;
  totalRatings: string;
  ratingSum: string;
  totalEnrollments: string;
  activeEnrollments: string;
  totalRevenue: string;
  totalRevenueEth: string;
  completedStudents: string;
  completionRate: string;
  createdAt: string;
  updatedAt: string;
  lastRatingAt: string;
  creationTxHash: string;
  blockNumber: string;
}

/**
 * ActivityEvent entity from Goldsky (L348-366)
 */
export interface ActivityEventData {
  id: string;
  type: string; // "COURSE_CREATED" | "ENROLLED" | "COMPLETED" | "CERTIFICATE_MINTED" etc
  timestamp: string;
  blockNumber: string;
  transactionHash: string;

  // Polymorphic references
  course: CourseData | null;
  enrollment: EnrollmentData | null;
  certificate: {
    id: string;
    tokenId: string;
    recipientName: string;
    platformName: string;
    totalCourses: string;
    isValid: boolean;
    createdAt: string;
  } | null;
}

/**
 * Certificate entity from Goldsky (L200-272)
 */
export interface CertificateData {
  id: string;
  tokenId: string;
  recipientAddress: string;
  recipientName: string;
  isValid: boolean;
  totalCourses: string;
  platformName: string;
  lifetimeFlag: boolean;
  ipfsCID: string;
  baseRoute: string;
  createdAt: string;
  lastUpdated: string;

  // Uses completedCourses from schema (derivedFrom CertificateCourse.certificate)
  completedCourses: Array<{
    id: string;
    addedAt: string;
    pricePaid: string;
    pricePaidEth: string;
    isFirstCourse: boolean;
    txHash: string;
    blockNumber: string;
    course: {
      id: string;
      title: string;
      thumbnailCID: string;
      category: string;
      difficulty: string;
    };
  }>;
}

/**
 * TeacherStudent relationship (L366-391)
 */
export interface TeacherStudentData {
  id: string;
  teacher: string;
  student: string;
  firstEnrollmentDate: string;
  lastActivityDate: string;
  totalCoursesBought: string;
  totalSpent: string;
  totalSpentEth: string;

  studentProfile: {
    id: string;
    address: string;
    coursesEnrolled: string;
    coursesCompleted: string;
    lastActivityAt: string;
  };
}

// ============================================================================
// GRAPHQL QUERY FRAGMENTS
// ============================================================================

/**
 * Core UserProfile fields - use in all profile queries
 */
const USER_PROFILE_FRAGMENT = `
  id
  address

  # Student Statistics
  coursesEnrolled
  coursesCompleted
  activeEnrollments
  totalSpentOnCourses
  totalSpentOnCoursesEth
  totalSpentOnCertificates
  totalSpentOnCertificatesEth
  totalSpent
  totalSpentEth

  # Moderation
  isBlacklisted
  blacklistedAt
  blacklistedBy

  # Instructor Statistics
  coursesCreated
  activeCoursesCreated
  deletedCoursesCreated
  totalStudents
  totalRevenue
  totalRevenueEth
  averageRating
  totalRatingsReceived

  # Certificate Data
  hasCertificate
  certificateTokenId
  certificateName
  totalCoursesInCertificate
  certificateMintedAt
  certificateLastUpdated

  # Activity Tracking
  totalSectionsCompleted
  lastActivityAt
  firstEnrollmentAt
  firstCourseCreatedAt

  # Growth Metrics
  enrollmentsThisMonth
  completionsThisMonth
  revenueThisMonth
  revenueThisMonthEth

  # Timestamps
  createdAt
  updatedAt

  # Transaction References
  firstTxHash
  lastTxHash
  blockNumber
`;

/**
 * Course fragment for nested queries
 */
const COURSE_FRAGMENT = `
  id
  title
  description
  thumbnailCID
  category
  difficulty
  price
  priceInEth
  isActive
  isDeleted
  certificatePrice
  certificatePriceEth
  isEmergencyDeactivated
  emergencyDeactivationReason
  ratingsDisabled
  sectionsCount
  totalDuration
  averageRating
  totalRatings
  ratingSum
  totalEnrollments
  activeEnrollments
  totalRevenue
  totalRevenueEth
  completedStudents
  completionRate
  creator
  creatorName
  createdAt
  updatedAt
  lastRatingAt
  creationTxHash
  blockNumber
`;

/**
 * Enrollment fragment with nested course data
 */
const ENROLLMENT_FRAGMENT = `
  id
  student
  courseId
  durationMonths
  licenseExpiry
  isActive
  status
  pricePaid
  pricePaidEth
  platformFee
  creatorRevenue
  totalRenewals
  lastRenewedAt
  totalSpent
  totalSpentEth
  isCompleted
  completionDate
  completionPercentage
  sectionsCompleted
  hasCertificate
  certificateTokenId
  certificateAddedAt
  certificatePrice
  purchasedAt
  lastActivityAt

  course {
    ${COURSE_FRAGMENT}
  }
`;

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get complete user profile by address
 *
 * @param address - User wallet address (will be normalized to lowercase)
 * @returns UserProfile data or null if not found
 *
 * @example
 * const profile = await getUserProfile("0x1234...");
 * console.log(`User has ${profile.coursesEnrolled} enrollments`);
 */
export async function getUserProfile(
  address: string
): Promise<UserProfileData | null> {
  const normalizedAddress = address.toLowerCase();

  const query = `
    query GetUserProfile($id: ID!) {
      userProfile(id: $id) {
        ${USER_PROFILE_FRAGMENT}
      }
    }
  `;

  try {
    const data = await fetchGraphQL(
      query,
      { id: normalizedAddress },
      "GetUserProfile"
    );

    return data?.userProfile || null;
  } catch (error) {
    console.error("[Profile Service] getUserProfile failed:", error);
    throw error;
  }
}

/**
 * Get user's enrolled courses with pagination
 * Uses StudentCourseEnrollment entity for efficient O(1) lookup
 *
 * @param address - User wallet address
 * @param limit - Maximum number of enrollments to return (default: 20)
 * @returns Array of enrollment data with nested course info
 *
 * @example
 * const enrollments = await getUserEnrollments("0x1234...", 10);
 * enrollments.forEach(e => console.log(e.course.title));
 */
export async function getUserEnrollments(
  address: string,
  limit: number = 20
): Promise<EnrollmentData[]> {
  const normalizedAddress = address.toLowerCase();

  const query = `
    query GetUserEnrollments($student: Bytes!, $limit: Int!) {
      studentCourseEnrollments(
        where: { student: $student }
        first: $limit
        orderBy: createdAt
        orderDirection: desc
      ) {
        enrollment {
          ${ENROLLMENT_FRAGMENT}
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(
      query,
      {
        student: normalizedAddress,
        limit: limit,
      },
      "GetUserEnrollments"
    );

    // Extract enrollments from StudentCourseEnrollment wrapper
    const enrollments =
      data?.studentCourseEnrollments?.map(
        (sce: { enrollment: EnrollmentData }) => sce.enrollment
      ) || [];

    return enrollments;
  } catch (error) {
    console.error("[Profile Service] getUserEnrollments failed:", error);
    throw error;
  }
}

/**
 * Get courses created by user (for Teaching tab)
 *
 * @param address - Creator wallet address
 * @param limit - Maximum number of courses to return (default: 20)
 * @returns Array of course data
 *
 * @example
 * const courses = await getUserCreatedCourses("0x1234...", 10);
 * console.log(`Creator has ${courses.length} courses`);
 */
export async function getUserCreatedCourses(
  address: string,
  limit: number = 20
): Promise<CourseData[]> {
  const normalizedAddress = address.toLowerCase();

  const query = `
    query GetUserCreatedCourses($creator: Bytes!, $limit: Int!) {
      courses(
        where: { creator: $creator }
        first: $limit
        orderBy: createdAt
        orderDirection: desc
      ) {
        ${COURSE_FRAGMENT}
      }
    }
  `;

  try {
    const data = await fetchGraphQL(
      query,
      {
        creator: normalizedAddress,
        limit: limit,
      },
      "GetUserCreatedCourses"
    );

    return data?.courses || [];
  } catch (error) {
    console.error("[Profile Service] getUserCreatedCourses failed:", error);
    throw error;
  }
}

/**
 * Get user's activity timeline (for Activity tab)
 * Returns recent ActivityEvent entries
 *
 * ⚠️ IMPORTANT: Query uses 'activityEvents' NOT 'courseEvents'
 * See BUGFIX_SUMMARY.md for details on this fix
 *
 * @param address - User wallet address
 * @param limit - Maximum number of events to return (default: 50)
 * @returns Array of activity events with nested data
 *
 * @example
 * const activities = await getUserActivities("0x1234...", 20);
 * activities.forEach(a => console.log(`${a.type} at ${a.timestamp}`));
 */
export async function getUserActivities(
  address: string,
  limit: number = 50
): Promise<ActivityEventData[]> {
  const normalizedAddress = address.toLowerCase();

  const query = `
    query GetUserActivities($userId: String!, $limit: Int!) {
      activityEvents(
        where: { user: $userId }
        first: $limit
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        type
        timestamp
        blockNumber
        transactionHash

        course {
          id
          title
          thumbnailCID
          category
          difficulty
          creator
          creatorName
        }

        enrollment {
          id
          courseId
          purchasedAt
          pricePaidEth
          status
        }

        certificate {
          id
          tokenId
          recipientName
          platformName
          totalCourses
          isValid
          createdAt
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(
      query,
      {
        userId: normalizedAddress,
        limit: limit,
      },
      "GetUserActivities"
    );

    return data?.activityEvents || [];
  } catch (error) {
    console.error("[Profile Service] getUserActivities failed:", error);
    throw error;
  }
}

/**
 * Get user's certificate with all courses
 *
 * @param address - User wallet address
 * @returns Certificate data with courses or null if no certificate
 *
 * @example
 * const cert = await getUserCertificate("0x1234...");
 * if (cert) {
 *   console.log(`Certificate has ${cert.totalCourses} courses`);
 * }
 */
export async function getUserCertificate(
  address: string
): Promise<CertificateData | null> {
  const normalizedAddress = address.toLowerCase();

  const query = `
    query GetUserCertificate($owner: String!) {
      certificates(
        where: { recipientAddress: $owner }
        first: 1
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        tokenId
        recipientAddress
        recipientName
        isValid
        totalCourses
        platformName
        lifetimeFlag
        ipfsCID
        baseRoute
        createdAt
        lastUpdated

        completedCourses {
          id
          addedAt
          pricePaid
          pricePaidEth
          isFirstCourse
          txHash
          blockNumber

          course {
            id
            title
            thumbnailCID
            category
            difficulty
          }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(
      query,
      { owner: normalizedAddress },
      "GetUserCertificate"
    );

    const certificates = data?.certificates || [];
    return certificates.length > 0 ? certificates[0] : null;
  } catch (error) {
    console.error("[Profile Service] getUserCertificate failed:", error);
    throw error;
  }
}

/**
 * Get students who bought courses from this teacher
 * For instructor analytics
 *
 * @param teacherAddress - Instructor wallet address
 * @param limit - Maximum number of students to return (default: 50)
 * @returns Array of teacher-student relationships
 *
 * @example
 * const students = await getTeacherStudents("0x1234...", 20);
 * console.log(`Instructor has ${students.length} unique students`);
 */
export async function getTeacherStudents(
  teacherAddress: string,
  limit: number = 50
): Promise<TeacherStudentData[]> {
  const normalizedAddress = teacherAddress.toLowerCase();

  const query = `
    query GetTeacherStudents($teacher: Bytes!, $limit: Int!) {
      teacherStudents(
        where: { teacher: $teacher }
        first: $limit
        orderBy: lastActivityDate
        orderDirection: desc
      ) {
        id
        teacher
        student
        firstEnrollmentDate
        lastActivityDate
        totalCoursesBought
        totalSpent
        totalSpentEth

        studentProfile {
          id
          address
          coursesEnrolled
          coursesCompleted
          lastActivityAt
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(
      query,
      {
        teacher: normalizedAddress,
        limit: limit,
      },
      "GetTeacherStudents"
    );

    return data?.teacherStudents || [];
  } catch (error) {
    console.error("[Profile Service] getTeacherStudents failed:", error);
    throw error;
  }
}

/**
 * Get combined profile data for dashboard
 * Efficiently fetches all necessary data in one call
 *
 * @param address - User wallet address
 * @param enrollmentLimit - Max enrollments to fetch (default: 10)
 * @param activityLimit - Max activities to fetch (default: 20)
 * @returns Complete profile with enrollments and activities
 *
 * @example
 * const dashboard = await getProfileDashboard("0x1234...");
 * console.log(dashboard.profile.coursesEnrolled);
 * console.log(dashboard.enrollments.length);
 * console.log(dashboard.activities.length);
 */
export async function getProfileDashboard(
  address: string,
  enrollmentLimit: number = 10,
  activityLimit: number = 20
): Promise<{
  profile: UserProfileData | null;
  enrollments: EnrollmentData[];
  activities: ActivityEventData[];
}> {
  const normalizedAddress = address.toLowerCase();

  const query = `
    query GetProfileDashboard(
      $id: ID!
      $student: Bytes!
      $userId: String!
      $enrollmentLimit: Int!
      $activityLimit: Int!
    ) {
      userProfile(id: $id) {
        ${USER_PROFILE_FRAGMENT}
      }

      studentCourseEnrollments(
        where: { student: $student }
        first: $enrollmentLimit
        orderBy: createdAt
        orderDirection: desc
      ) {
        enrollment {
          ${ENROLLMENT_FRAGMENT}
        }
      }

      activityEvents(
        where: { user: $userId }
        first: $activityLimit
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        type
        timestamp
        blockNumber
        transactionHash

        course {
          id
          title
          thumbnailCID
          category
        }

        enrollment {
          id
          pricePaidEth
          status
        }

        certificate {
          id
          tokenId
          recipientName
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(
      query,
      {
        id: normalizedAddress,
        student: normalizedAddress,
        userId: normalizedAddress,
        enrollmentLimit: enrollmentLimit,
        activityLimit: activityLimit,
      },
      "GetProfileDashboard"
    );

    return {
      profile: data?.userProfile || null,
      enrollments:
        data?.studentCourseEnrollments?.map(
          (sce: { enrollment: EnrollmentData }) => sce.enrollment
        ) || [],
      activities: data?.activityEvents || [],
    };
  } catch (error) {
    console.error("[Profile Service] getProfileDashboard failed:", error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert BigInt string to number (for display)
 * Handles large numbers safely
 */
export function bigIntToNumber(value: string): number {
  try {
    return parseInt(value, 10);
  } catch {
    return 0;
  }
}

/**
 * Convert BigDecimal ETH string to number
 * For display purposes (handles up to 18 decimals)
 */
export function ethToNumber(value: string): number {
  try {
    return parseFloat(value);
  } catch {
    return 0;
  }
}

/**
 * Format timestamp to human-readable date
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Check if user profile exists in Goldsky
 */
export async function checkProfileExists(address: string): Promise<boolean> {
  try {
    const profile = await getUserProfile(address);
    return profile !== null;
  } catch {
    return false;
  }
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const ProfileService = {
  getUserProfile,
  getUserEnrollments,
  getUserCreatedCourses,
  getUserActivities,
  getUserCertificate,
  getTeacherStudents,
  getProfileDashboard,

  // Utilities
  bigIntToNumber,
  ethToNumber,
  formatTimestamp,
  checkProfileExists,
};

export default ProfileService;
