/**
 * GraphQL Queries for EduVerse Dashboard
 *
 * Comprehensive queries for fetching blockchain-indexed data from Goldsky
 * All queries are typed and optimized for dashboard performance
 *
 * @module graphql-queries
 */

import { gql } from "graphql-request";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DashboardMetrics {
  totalEnrolledCourses: number;
  totalCreatedCourses: number;
  totalCompletedCourses: number;
  totalEthEarned: string; // in wei
  totalActiveLicenses: number;
  totalCertificates: number;
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
  priceInEth: string; // Human-readable ETH value
  isActive: boolean;
  totalEnrollments: number;
  activeEnrollments: number;
  totalRevenue: string;
  averageRating: string;
  totalRatings: number;
  sectionsCount: number;
  completionRate: string;
  createdAt: string;
  updatedAt: string;
  completedStudents?: number;
}

export interface LicenseData {
  id: string;
  courseId: string;
  durationMonths: string;
  licenseExpiry: string;
  pricePaid: string;
  isActive: boolean;
  purchasedAt: string;
  lastRenewedAt: string | null;
  totalRenewals: number;
  course: CourseData;
}

export interface ProgressData {
  id: string;
  started: boolean;
  completed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  viewCount: number;
  course: {
    id: string;
    sectionsCount: number;
  };
  section: {
    id: string;
    sectionId: string;
    title: string;
    orderId: string;
  };
}

export interface CourseCompletionData {
  id: string;
  completedAt: string;
  course: CourseData;
}

export interface ActivityEventData {
  id: string;
  type: string;
  user: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  metadata: string | null;
  course: CourseData | null;
}

export interface UserData {
  id: string;
  address: string;
  totalRevenue: string;
  coursesCreated: number;
  totalSectionsCompleted: number;
  coursesCompleted: number;
  coursesEnrolled: number;
  totalSpentOnCourses: string;
  totalSpentOnCertificates: string;
  firstEnrollmentAt: string;
  lastActivityAt: string;
}

// ============================================================================
// DASHBOARD MAIN QUERY
// ============================================================================

/**
 * Comprehensive dashboard query for user metrics
 * Fetches all data needed for dashboard stats cards
 */
export const GET_DASHBOARD_METRICS = gql`
  query GetDashboardMetrics($userAddress: Bytes!) {
    user(id: $userAddress) {
      id
      address
      totalRevenue
      coursesCreated
      totalSectionsCompleted
      coursesCompleted
      coursesEnrolled
      totalSpentOnCourses
      totalSpentOnCertificates
      firstEnrollmentAt
      lastActivityAt

      certificate {
        tokenId
        totalCourses
      }
    }

    licenses(where: { student: $userAddress, isActive: true }, first: 1000) {
      id
      isActive
    }
  }
`;

// ============================================================================
// LEARNING COURSES QUERIES
// ============================================================================

/**
 * Get user's enrolled courses with progress data
 * Used for "Continue Learning" section
 */
export const GET_USER_LEARNING_COURSES = gql`
  query GetUserLearningCourses(
    $userAddress: Bytes!
    $first: Int!
    $skip: Int!
  ) {
    licenses(
      where: { student: $userAddress, isActive: true }
      first: $first
      skip: $skip
      orderBy: mintedAt
      orderDirection: desc
    ) {
      id
      courseId
      durationMonths
      licenseExpiry
      pricePaid
      isActive
      purchasedAt
      lastRenewedAt
      totalRenewals
      totalSpent

      course {
        id
        creator
        title
        description
        thumbnailCID
        creatorName
        category
        difficulty
        priceInEth
        isActive
        sectionsCount
        averageRating
        totalRatings
        createdAt

        sections(orderBy: orderId, orderDirection: asc, first: 1000) {
          id
          sectionId
          title
          orderId
        }
      }
    }

    sectionProgresses(where: { student: $userAddress }, first: 5000) {
      id
      started
      completed
      startedAt
      completedAt
      viewCount
      course {
        id
        courseId
      }
      section {
        id
        sectionId
        orderId
      }
    }

    courseCompletions(where: { student: $userAddress }, first: 1000) {
      id
      completedAt
      course {
        id
        courseId
      }
    }
  }
`;

/**
 * Get specific course progress details
 */
export const GET_COURSE_PROGRESS = gql`
  query GetCourseProgress($userAddress: Bytes!, $courseId: String!) {
    course(id: $courseId) {
      id
      title
      sectionsCount

      sections(orderBy: orderId, orderDirection: asc) {
        id
        sectionId
        title
        orderId
        duration
      }
    }

    sectionProgresses(where: { student: $userAddress, course: $courseId }) {
      id
      started
      completed
      startedAt
      completedAt
      viewCount
      section {
        id
        sectionId
        orderId
      }
    }

    courseCompletion(id: $userAddress) {
      id
      completedAt
      addedToCertificateAt
      certificateTokenId
    }
  }
`;

// ============================================================================
// TEACHING COURSES QUERIES
// ============================================================================

/**
 * Get instructor's created courses with analytics
 * Used for "Teaching Overview" section
 */
export const GET_INSTRUCTOR_COURSES = gql`
  query GetInstructorCourses(
    $creatorAddress: Bytes!
    $first: Int!
    $skip: Int!
  ) {
    user(id: $creatorAddress) {
      id
      totalRevenue
      coursesCreated
    }

    courses(
      where: { creator: $creatorAddress }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      title
      description
      thumbnailCID
      category
      difficulty
      priceInEth
      isActive
      totalEnrollments
      activeEnrollments
      totalRevenue
      averageRating
      totalRatings
      completionRate
      sectionsCount
      completedStudents
      createdAt
      updatedAt

      sections(orderBy: orderId, orderDirection: asc, first: 100) {
        id
        sectionId
        title
        orderId
        duration
      }
    }
  }
`;

/**
 * Get course analytics for specific course
 */
export const GET_COURSE_ANALYTICS = gql`
  query GetCourseAnalytics($courseId: String!) {
    course(id: $courseId) {
      id
      title
      totalEnrollments
      activeEnrollments
      totalRevenue
      averageRating
      totalRatings
      completionRate
      completedStudents

      enrollments(first: 100, orderBy: purchasedAt, orderDirection: desc) {
        id
        student
        purchasedAt
        pricePaid
        isActive
        licenseExpiry
      }
    }
  }
`;

// ============================================================================
// ACTIVITY QUERIES
// ============================================================================

/**
 * Get recent activity events for dashboard
 * Mixed events: certificates, enrollments, course completions, etc.
 */
export const GET_RECENT_ACTIVITY = gql`
  query GetRecentActivity($first: Int!, $skip: Int!) {
    activityEvents(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      type
      description
      timestamp
      blockNumber
      transactionHash
      user {
        id
        address
      }
      course {
        id
        title
        thumbnailCID
      }
      enrollment {
        id
        pricePaid
      }
      certificate {
        id
        tokenId
        recipientName
      }
    }

    certificateEvents: courseAddedToCertificateEvents(
      first: $first
      skip: $skip
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      id
      tokenId
      courseId
      pricePaid
      pricePaidEth
      blockTimestamp
      blockNumber
      transactionHash
      student
      certificate {
        id
        recipientName
      }
      course {
        id
        title
        thumbnailCID
      }
    }
  }
`;

/**
 * Get activity events for specific course
 */
export const GET_COURSE_ACTIVITY = gql`
  query GetCourseActivity($courseId: String!, $first: Int!, $skip: Int!) {
    enrollments(
      where: { courseId: $courseId }
      first: $first
      skip: $skip
      orderBy: purchasedAt
      orderDirection: desc
    ) {
      id
      student
      courseId
      durationMonths
      pricePaid
      purchasedAt
      isActive
      isCompleted
      completionDate
      mintTxHash
    }
  }
`;

// ============================================================================
// REVENUE QUERIES
// ============================================================================

/**
 * Get enrollments (revenue records) for creator
 */
export const GET_REVENUE_RECORDS = gql`
  query GetRevenueRecords($creatorAddress: Bytes!, $first: Int!, $skip: Int!) {
    enrollments(
      where: { course_: { creator: $creatorAddress } }
      first: $first
      skip: $skip
      orderBy: purchasedAt
      orderDirection: desc
    ) {
      id
      pricePaid
      pricePaidEth
      creatorRevenue
      platformFee
      purchasedAt
      mintTxHash
      blockNumber
      course {
        id
        title
        creator
      }
    }
  }
`;

/**
 * Get revenue summary for time period
 */
export const GET_REVENUE_SUMMARY = gql`
  query GetRevenueSummary($creatorAddress: Bytes!, $timestampGte: BigInt!) {
    enrollments(
      where: {
        course_: { creator: $creatorAddress }
        purchasedAt_gte: $timestampGte
      }
      first: 1000
      orderBy: purchasedAt
      orderDirection: desc
    ) {
      id
      creatorRevenue
      pricePaid
      purchasedAt
      course {
        id
        title
      }
    }
  }
`;

// ============================================================================
// CERTIFICATE QUERIES
// ============================================================================

/**
 * Get user's certificate with all courses
 */
export const GET_USER_CERTIFICATE = gql`
  query GetUserCertificate($userAddress: Bytes!) {
    user(id: $userAddress) {
      certificate {
        id
        tokenId
        recipientName
        platformName
        ipfsCID
        baseRoute
        isValid
        createdAt
        lastUpdated
        totalCourses
        totalRevenue

        completedCourses(orderBy: addedAt, orderDirection: asc) {
          id
          addedAt
          pricePaid
          isFirstCourse

          course {
            id
            title
            description
            thumbnailCID
            creator
            creatorName
            category
            difficulty
          }
          enrollment {
            completionDate
          }
        }
      }
    }
  }
`;

// ============================================================================
// PLATFORM METRICS (FOR ANALYTICS PAGE)
// ============================================================================

/**
 * Get platform-wide metrics
 */
export const GET_NETWORK_METRICS = gql`
  query GetNetworkMetrics {
    networkStats(id: "network") {
      id
      totalTransactions
      totalGasUsed
      totalGasCost
      averageGasPrice
      averageBlockTime
      lastBlockNumber
      lastBlockTimestamp
      totalCourseCreations
      totalLicenseMints
      totalCertificateMints
      totalProgressUpdates
      courseFactoryInteractions
      courseLicenseInteractions
      progressTrackerInteractions
      certificateManagerInteractions
    }
    dailyNetworkStats(first: 30, orderBy: date, orderDirection: desc) {
      id
      date
      transactionCount
      gasUsed
      gasCost
      averageGasPrice
      blockCount
      totalBlockTime
      courseTransactions
      licenseTransactions
      certificateTransactions
      progressTransactions
      successfulTransactions
      failedTransactions
      totalValueTransferred
      uniqueUsers
      startBlock
      endBlock
    }
  }
`;

export const GET_PLATFORM_METRICS = gql`
  query GetPlatformMetrics {
    platformStats(id: "platform") {
      id
      totalUsers
      totalCourses
      totalEnrollments
      totalCertificates
      totalRevenue
      totalRevenueEth
      platformFees
      platformFeesEth
      creatorRevenue
      creatorRevenueEth
      averageCoursePrice
      averageCompletionRate
      averageRating
      dailyActiveUsers
      monthlyActiveUsers
      lastUpdateTimestamp
      lastUpdateBlock
    }
  }
`;

/**
 * Get daily metrics for charts
 */
export const GET_DAILY_METRICS = gql`
  query GetDailyMetrics($first: Int!, $orderDirection: String!) {
    dailyMetrics(
      first: $first
      orderBy: timestamp
      orderDirection: $orderDirection
    ) {
      id
      date
      timestamp
      coursesCreated
      licensesMinted
      licensesRenewed
      certificatesMinted
      courseCompletions
      totalRevenue
      licenseRevenue
      certificateRevenue
      activeUsers
    }
  }
`;

// ============================================================================
// SEARCH & BROWSE QUERIES
// ============================================================================

/**
 * Browse all active courses with filters
 */
export const BROWSE_COURSES = gql`
  query BrowseCourses(
    $first: Int!
    $skip: Int!
    $category: CourseCategory
    $difficulty: CourseDifficulty
    $minRating: BigDecimal
    $isActive: Boolean
  ) {
    courses(
      first: $first
      skip: $skip
      where: {
        isActive: $isActive
        category: $category
        difficulty: $difficulty
        averageRating_gte: $minRating
      }
      orderBy: totalEnrollments
      orderDirection: desc
    ) {
      id
      title
      description
      thumbnailCID
      creator
      creatorName
      category
      difficulty
      priceInEth
      isActive
      totalEnrollments
      activeEnrollments
      averageRating
      totalRatings
      sectionsCount
      createdAt
    }
  }
`;

/**
 * Get single course details
 */
export const GET_COURSE_DETAILS = gql`
  query GetCourseDetails($courseId: String!) {
    course(id: $courseId) {
      id
      title
      description
      thumbnailCID
      creator
      creatorName
      category
      difficulty
      priceInEth
      isActive
      totalEnrollments
      activeEnrollments
      totalRevenue
      averageRating
      totalRatings
      completionRate
      sectionsCount
      createdAt
      updatedAt

      sections(orderBy: orderId, orderDirection: asc) {
        id
        sectionId
        title
        contentCID
        duration
        orderId
        createdAt
      }
    }
  }
`;

/**
 * Get specific section details with course metadata
 * Used for section learning page
 */
export const GET_SECTION_DETAILS = gql`
  query GetSectionDetails($courseId: String!, $sectionId: String!) {
    course(id: $courseId) {
      id
      title
      description
      thumbnailCID
      creator
      creatorName
      category
      difficulty
      priceInEth
      sectionsCount
      totalEnrollments
      averageRating
      totalRatings
      createdAt

      sections(orderBy: orderId, orderDirection: asc) {
        id
        sectionId
        title
        contentCID
        duration
        orderId
        createdAt
      }
    }

    section: courseSection(id: $sectionId) {
      id
      sectionId
      title
      contentCID
      duration
      orderId
      createdAt
      course {
        id
        title
        sectionsCount
      }
    }
  }
`;

/**
 * Get enrollment details for student and course
 * Used to check license status and access permissions
 */
export const GET_ENROLLMENT_BY_STUDENT_COURSE = gql`
  query GetEnrollmentByStudentAndCourse($enrollmentId: ID!) {
    studentCourseEnrollment(id: $enrollmentId) {
      id
      student
      courseId
      enrollment {
        id
        durationMonths
        licenseExpiry
        isActive
        status
        pricePaid
        pricePaidEth
        purchasedAt
        isCompleted
        completionDate
        sectionsCompleted
      }
    }
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build variables for dashboard query
 */
export function buildDashboardVariables(userAddress: string) {
  return {
    userAddress: userAddress.toLowerCase(),
  };
}

/**
 * Build variables for pagination
 */
export function buildPaginationVariables(
  page: number = 0,
  pageSize: number = 20
) {
  return {
    first: pageSize,
    skip: page * pageSize,
  };
}

/**
 * Build variables for time-based queries
 */
export function buildTimeRangeVariables(daysAgo: number = 30) {
  const timestampGte = Math.floor(Date.now() / 1000) - daysAgo * 24 * 60 * 60;
  return {
    timestampGte: timestampGte.toString(),
  };
}
