export const ANALYTICS_NETWORK_STATS = `
  query GetNetworkStats {
    networkStats(id: "network") {
      id
      totalTransactions
      lastBlockNumber
      lastBlockTimestamp
      averageBlockTime
      totalCourseCreations
      totalLicenseMints
      totalCertificateMints
      totalProgressUpdates
      courseFactoryInteractions
      courseLicenseInteractions
      progressTrackerInteractions
      certificateManagerInteractions
    }
  }
`;

export const ANALYTICS_PLATFORM_STATS = `
  query GetPlatformStats {
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

export const ANALYTICS_RECENT_COURSES = `
  query GetRecentCourses($limit: Int = 10) {
    courses(
      first: $limit
      orderBy: createdAt
      orderDirection: desc
      where: { isDeleted: false }
    ) {
      id
      title
      creator
      creatorName
      category
      difficulty
      price
      priceInEth
      totalEnrollments
      averageRating
      totalRatings
      createdAt
      thumbnailCID
    }
  }
`;

export const ANALYTICS_TOP_CREATORS = `
  query GetTopCreators($limit: Int = 10) {
    userProfiles(
      first: $limit
      orderBy: totalRevenue
      orderDirection: desc
      where: { coursesCreated_gt: 0 }
    ) {
      id
      address
      coursesCreated
      activeCoursesCreated
      totalStudents
      totalRevenue
      totalRevenueEth
      averageRating
      totalRatingsReceived
    }
  }
`;

export const ANALYTICS_RECENT_ENROLLMENTS = `
  query GetRecentEnrollments($limit: Int = 20) {
    enrollments(
      first: $limit
      orderBy: purchasedAt
      orderDirection: desc
    ) {
      id
      student
      course {
        id
        title
        creator
        creatorName
        category
      }
      pricePaid
      pricePaidEth
      status
      completionPercentage
      purchasedAt
      mintTxHash
    }
  }
`;

export const ANALYTICS_CONTRACT_INTERACTIONS = `
  query GetContractInteractions {
    networkStats(id: "network") {
      courseFactoryInteractions
      courseLicenseInteractions
      progressTrackerInteractions
      certificateManagerInteractions
      totalTransactions
    }
  }
`;

export const ANALYTICS_REVENUE_BREAKDOWN = `
  query GetRevenueBreakdown {
    platformStats(id: "platform") {
      totalRevenue
      totalRevenueEth
      platformFees
      platformFeesEth
      creatorRevenue
      creatorRevenueEth
      totalEnrollments
      averageCoursePrice
    }
  }
`;

export const ANALYTICS_COMPLETION_METRICS = `
  query GetCompletionMetrics {
    courses(
      first: 1000
      where: { isDeleted: false, totalEnrollments_gt: 0 }
    ) {
      id
      title
      totalEnrollments
      completedStudents
      completionRate
    }
  }
`;

export const ANALYTICS_CATEGORY_BREAKDOWN = `
  query GetCategoryBreakdown {
    courses(
      first: 1000
      where: { isDeleted: false }
    ) {
      id
      category
      totalEnrollments
      totalRevenue
      totalRevenueEth
    }
  }
`;

export const ANALYTICS_DAILY_STATS = `
  query GetDailyStats($dates: [String!]) {
    dailyNetworkStats_collection(
      where: { date_in: $dates }
      orderBy: date
      orderDirection: desc
    ) {
      id
      date
      transactionCount
      blockCount
      courseTransactions
      licenseTransactions
      certificateTransactions
      progressTransactions
      successfulTransactions
      failedTransactions
    }
  }
`;

export const ANALYTICS_USER_GROWTH = `
  query GetUserGrowth {
    platformStats(id: "platform") {
      totalUsers
      dailyActiveUsers
      monthlyActiveUsers
    }
  }
`;

export const ANALYTICS_COURSE_RATINGS = `
  query GetCourseRatings($limit: Int = 10) {
    courses(
      first: $limit
      orderBy: averageRating
      orderDirection: desc
      where: { totalRatings_gt: 2, isDeleted: false }
    ) {
      id
      title
      creator
      creatorName
      averageRating
      totalRatings
      totalEnrollments
      category
      difficulty
    }
  }
`;

export const ANALYTICS_RECENT_CERTIFICATES = `
  query GetRecentCertificates($limit: Int = 10) {
    certificates(
      first: $limit
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      recipientAddress
      recipientName
      totalCourses
      totalRevenue
      totalRevenueEth
      createdAt
      mintTxHash
    }
  }
`;

export const ANALYTICS_TRANSACTION_TIMELINE = `
  query GetTransactionTimeline($limit: Int = 50, $skip: Int = 0) {
    enrollments(
      first: $limit
      skip: $skip
      orderBy: purchasedAt
      orderDirection: desc
    ) {
      id
      student
      course {
        id
        title
        category
      }
      pricePaid
      pricePaidEth
      purchasedAt
      mintTxHash
      __typename
    }
  }
`;

export const ANALYTICS_COMPLETE_OVERVIEW = `
  query GetCompleteAnalytics {
    networkStats(id: "network") {
      totalTransactions
      totalCourseCreations
      totalLicenseMints
      totalCertificateMints
      totalProgressUpdates
      courseFactoryInteractions
      courseLicenseInteractions
      progressTrackerInteractions
      certificateManagerInteractions
      lastBlockNumber
      lastBlockTimestamp
    }
    platformStats(id: "platform") {
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
    }
  }
`;
