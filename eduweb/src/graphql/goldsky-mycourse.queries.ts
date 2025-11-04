/**
 * ============================================================================
 * GOLDSKY MYCOURSE QUERIES
 * ============================================================================
 * GraphQL queries untuk mengambil data enrollment, progress, dan certificates
 * dari Goldsky indexer untuk halaman myCourse.
 *
 * Endpoint: https://api.goldsky.com/api/public/project_<your-project-id>/subgraphs/eduverse-manta-pacific-sepolia/1.0.0/gn
 * ============================================================================
 */

import { gql } from "graphql-request";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GoldskyEnrollment {
  id: string;
  student: string;
  courseId: string;
  course: GoldskyCourse;

  // License Details
  durationMonths: string;
  licenseExpiry: string;
  isActive: boolean;
  status: "ACTIVE" | "EXPIRED" | "COMPLETED";

  // Payment & Revenue
  pricePaid: string;
  pricePaidEth: string;
  platformFee: string;
  creatorRevenue: string;

  // Renewal Tracking
  totalRenewals: string;
  lastRenewedAt: string;
  totalSpent: string;
  totalSpentEth: string;

  // Progress & Completion
  isCompleted: boolean;
  completionDate: string;
  completionPercentage: string;
  sectionsCompleted: string;

  // Certificate Integration
  hasCertificate: boolean;
  certificateTokenId: string;
  certificateAddedAt: string;
  certificatePrice: string;

  // Timestamps
  purchasedAt: string;
  lastActivityAt: string;

  // Relations
  userProfile: GoldskyUserProfile;
}

export interface GoldskyCourse {
  id: string;
  creator: string;
  creatorName: string;

  // Metadata
  title: string;
  description?: string;
  thumbnailCID?: string;
  category: string;
  difficulty: string;

  // Pricing & Status
  price: string;
  priceInEth: string;
  isActive: boolean;
  isDeleted: boolean;

  // Stats
  totalEnrollments: string;
  activeEnrollments: string;
  completedStudents: string;
  totalRevenue: string;
  totalRevenueEth: string;

  // Ratings
  averageRating: string;
  totalRatings: string;
  ratingSum: string;

  // Sections
  sectionsCount: string;
  totalDuration: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations
  sections: GoldskyCourseSection[];
}

export interface GoldskyCourseSection {
  id: string;
  sectionId: string;
  orderId: string;
  title: string;
  contentCID: string;
  duration: string;
  isDeleted: boolean;
  createdAt: string;

  // Analytics
  startedCount: string;
  completedCount: string;
  dropoffRate: string;
}

export interface GoldskyUserProfile {
  id: string;
  address: string;

  // Student Statistics
  coursesEnrolled: string;
  coursesCompleted: string;
  activeEnrollments: string;
  totalSpentOnCourses: string;
  totalSpentOnCoursesEth: string;
  totalSpentOnCertificates: string;
  totalSpentOnCertificatesEth: string;
  totalSpent: string;
  totalSpentEth: string;

  // Certificate Data
  hasCertificate: boolean;
  certificateTokenId: string;
  certificateName: string;
  totalCoursesInCertificate: string;

  // Activity
  totalSectionsCompleted: string;
  lastActivityAt: string;
  firstEnrollmentAt: string;

  // Growth Metrics
  enrollmentsThisMonth: string;
  completionsThisMonth: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface GoldskyCertificate {
  id: string;
  tokenId: string;
  owner: GoldskyUserProfile;
  recipientAddress: string;
  recipientName: string;
  isValid: boolean;
  totalCourses: string;

  // Display
  platformName: string;
  baseRoute: string;

  // Revenue Tracking
  totalRevenue: string;
  totalRevenueEth: string;

  // Timestamps
  createdAt: string;
  lastUpdated: string;

  // Relations
  completedCourses: GoldskyCertificateCourse[];
}

export interface GoldskyCertificateCourse {
  id: string;
  certificate: {
    id: string;
    tokenId: string;
  };
  course: GoldskyCourse;
  enrollment: GoldskyEnrollment;
  addedAt: string;
  pricePaid: string;
  pricePaidEth: string;
  isFirstCourse: boolean;
}

export interface MyCoursesResponse {
  enrollments: GoldskyEnrollment[];
  userProfile: GoldskyUserProfile | null;
  certificates: GoldskyCertificate[];
}

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

/**
 * Query utama untuk mengambil semua course yang di-enroll oleh user
 * Includes: enrollment details, course data, sections, progress
 */
export const GET_MY_COURSES_QUERY = gql`
  query GetMyCourses($studentAddress: Bytes!) {
    # Get all enrollments untuk student ini
    enrollments(
      where: { student: $studentAddress }
      orderBy: purchasedAt
      orderDirection: desc
      first: 1000
    ) {
      id
      student
      courseId

      # License Details
      durationMonths
      licenseExpiry
      isActive
      status

      # Payment & Revenue
      pricePaid
      pricePaidEth
      platformFee
      creatorRevenue

      # Renewal Tracking
      totalRenewals
      lastRenewedAt
      totalSpent
      totalSpentEth

      # Progress & Completion
      isCompleted
      completionDate
      completionPercentage
      sectionsCompleted

      # Certificate Integration
      hasCertificate
      certificateTokenId
      certificateAddedAt
      certificatePrice

      # Timestamps
      purchasedAt
      lastActivityAt

      # Course Details (nested)
      course {
        id
        creator
        creatorName

        # Metadata
        title
        description
        thumbnailCID
        category
        difficulty

        # Pricing & Status
        price
        priceInEth
        isActive
        isDeleted

        # Stats
        totalEnrollments
        activeEnrollments
        completedStudents
        totalRevenue
        totalRevenueEth

        # Ratings
        averageRating
        totalRatings
        ratingSum

        # Sections
        sectionsCount
        totalDuration

        # Timestamps
        createdAt
        updatedAt

        # Sections (nested)
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
          isDeleted
          createdAt

          # Analytics
          startedCount
          completedCount
          dropoffRate
        }
      }

      # User Profile
      userProfile {
        id
        address
        coursesEnrolled
        coursesCompleted
        activeEnrollments
        totalSpentOnCourses
        totalSpentOnCoursesEth
        totalSectionsCompleted
        lastActivityAt
      }
    }

    # Get user profile untuk statistics
    userProfile(id: $studentAddress) {
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

      # Certificate Data
      hasCertificate
      certificateTokenId
      certificateName
      totalCoursesInCertificate

      # Activity
      totalSectionsCompleted
      lastActivityAt
      firstEnrollmentAt

      # Growth Metrics
      enrollmentsThisMonth
      completionsThisMonth

      # Timestamps
      createdAt
      updatedAt
    }

    # Get certificates milik user ini
    certificates(
      where: { recipientAddress: $studentAddress, isValid: true }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      recipientAddress
      recipientName
      isValid
      totalCourses

      # Display
      platformName
      baseRoute

      # Revenue Tracking
      totalRevenue
      totalRevenueEth

      # Timestamps
      createdAt
      lastUpdated

      # Courses in certificate
      completedCourses {
        id
        addedAt
        pricePaid
        pricePaidEth
        isFirstCourse

        course {
          id
          title
          thumbnailCID
          category
          difficulty
        }

        enrollment {
          id
          isCompleted
          completionPercentage
        }
      }
    }
  }
`;

/**
 * Query untuk single enrollment detail
 */
export const GET_ENROLLMENT_DETAIL_QUERY = gql`
  query GetEnrollmentDetail($enrollmentId: ID!) {
    enrollment(id: $enrollmentId) {
      id
      student
      courseId

      # License Details
      durationMonths
      licenseExpiry
      isActive
      status

      # Payment & Revenue
      pricePaid
      pricePaidEth
      platformFee
      creatorRevenue

      # Renewal Tracking
      totalRenewals
      lastRenewedAt
      totalSpent
      totalSpentEth

      # Progress & Completion
      isCompleted
      completionDate
      completionPercentage
      sectionsCompleted

      # Certificate Integration
      hasCertificate
      certificateTokenId
      certificateAddedAt
      certificatePrice

      # Timestamps
      purchasedAt
      lastActivityAt

      # Course Details
      course {
        id
        creator
        creatorName
        title
        description
        thumbnailCID
        category
        difficulty
        price
        priceInEth
        isActive
        sectionsCount
        totalDuration
        averageRating
        totalRatings
        createdAt

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
        }
      }
    }
  }
`;

/**
 * Query untuk check enrollment status by student + courseId
 */
export const CHECK_ENROLLMENT_STATUS_QUERY = gql`
  query CheckEnrollmentStatus($studentAddress: Bytes!, $courseId: BigInt!) {
    studentCourseEnrollments(
      where: { student: $studentAddress, courseId: $courseId }
    ) {
      id
      student
      courseId
      enrollmentId

      enrollment {
        id
        courseId
        student
        isActive
        status
        licenseExpiry
        durationMonths
        isCompleted
        completionPercentage
        sectionsCompleted
        hasCertificate
        certificateTokenId
        pricePaidEth
        totalSpentEth
        totalRenewals
        purchasedAt
        lastActivityAt
        completionDate

        course {
          id
          creator
          creatorName
          title
          category
          difficulty
          priceInEth
          isActive
          isDeleted
          totalEnrollments
          activeEnrollments
          completedStudents
          totalRevenueEth
          averageRating
          totalRatings
          sectionsCount
          totalDuration
          createdAt
          updatedAt
        }
      }
    }
  }
`;

/**
 * Query untuk progress tracking specific course
 */
export const GET_COURSE_PROGRESS_QUERY = gql`
  query GetCourseProgress($studentAddress: Bytes!, $courseId: String!) {
    enrollments(where: { student: $studentAddress, courseId: $courseId }) {
      id
      isCompleted
      completionDate
      completionPercentage
      sectionsCompleted
      lastActivityAt

      course {
        id
        title
        sectionsCount

        sections(
          where: { isDeleted: false }
          orderBy: orderId
          orderDirection: asc
        ) {
          id
          sectionId
          orderId
          title
          duration
          startedCount
          completedCount
        }
      }
    }
  }
`;

/**
 * Query untuk certificates user
 */
export const GET_USER_CERTIFICATES_QUERY = gql`
  query GetUserCertificates($studentAddress: Bytes!) {
    certificates(
      where: { recipientAddress: $studentAddress, isValid: true }
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
      baseRoute
      totalRevenue
      totalRevenueEth
      createdAt
      lastUpdated

      completedCourses {
        id
        addedAt
        pricePaid
        pricePaidEth

        course {
          id
          title
          thumbnailCID
          creatorName
          category
          difficulty
        }

        enrollment {
          id
          isCompleted
          completionPercentage
          completionDate
        }
      }
    }
  }
`;

/**
 * Query untuk get certificate by tokenId (QR verification)
 */
export const GET_CERTIFICATE_BY_TOKEN_ID = gql`
  query GetCertificateByTokenId($tokenId: String!) {
    certificate(id: $tokenId) {
      id
      tokenId
      recipientAddress
      recipientName
      isValid
      totalCourses
      platformName
      baseRoute
      ipfsCID
      totalRevenue
      totalRevenueEth
      createdAt
      lastUpdated

      completedCourses {
        id
        addedAt
        pricePaid
        pricePaidEth

        course {
          id
          title
          thumbnailCID
          creatorName
          category
          difficulty
        }

        enrollment {
          id
          isCompleted
          completionPercentage
          completionDate
        }
      }
    }
  }
`;

/**
 * Query untuk user profile statistics
 */
export const GET_USER_STATS_QUERY = gql`
  query GetUserStats($studentAddress: Bytes!) {
    userProfile(id: $studentAddress) {
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

      # Certificate Data
      hasCertificate
      certificateTokenId
      certificateName
      totalCoursesInCertificate

      # Activity
      totalSectionsCompleted
      lastActivityAt
      firstEnrollmentAt

      # Growth Metrics
      enrollmentsThisMonth
      completionsThisMonth

      # Timestamps
      createdAt
      updatedAt
    }
  }
`;

/**
 * Query untuk activity events user
 */
export const GET_USER_ACTIVITY_QUERY = gql`
  query GetUserActivity($userProfileId: ID!, $first: Int = 50) {
    activityEvents(
      where: { user: $userProfileId }
      orderBy: timestamp
      orderDirection: desc
      first: $first
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
      }

      enrollment {
        id
        pricePaid
        pricePaidEth
      }

      certificate {
        id
        tokenId
        recipientName
      }
    }
  }
`;

// ============================================================================
// QUERY VARIABLES TYPES
// ============================================================================

export interface GetMyCoursesVariables {
  studentAddress: string; // Bytes format: "0x..."
}

export interface GetEnrollmentDetailVariables {
  enrollmentId: string; // Enrollment ID
}

export interface CheckEnrollmentStatusVariables {
  studentAddress: string; // Bytes format
  courseId: string; // BigInt as string
}

export interface GetCourseProgressVariables {
  studentAddress: string; // Bytes format
  courseId: string; // Course ID
}

export interface GetUserCertificatesVariables {
  studentAddress: string; // Bytes format
}

export interface GetCertificateByTokenIdVariables {
  tokenId: string; // tokenId as string
}

export interface GetUserStatsVariables {
  studentAddress: string; // Bytes format (lowercase)
}

export interface GetUserActivityVariables {
  userProfileId: string; // Same as studentAddress (lowercase)
  first?: number;
}
