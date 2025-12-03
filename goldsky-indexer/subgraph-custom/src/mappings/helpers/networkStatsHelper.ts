import { BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import {
  NetworkStats,
  PlatformStats,
  DailyNetworkStats,
} from "../../../generated/schema";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
const WEI_TO_ETH = BigDecimal.fromString("1000000000000000000");

const NETWORK_STATS_ID = "network";
const PLATFORM_STATS_ID = "platform";
const ONE_BI = BigInt.fromI32(1);
const SECONDS_PER_DAY = BigInt.fromI32(86400);

// Helper function to get date string from timestamp (YYYY-MM-DD format)
function getDateStringFromTimestamp(timestamp: BigInt): string {
  // Calculate days since Unix epoch
  let daysSinceEpoch = timestamp.div(SECONDS_PER_DAY);

  // Simple date calculation (approximation that works for recent dates)
  let totalDays = daysSinceEpoch.toI32();

  // Calculate year, month, day from total days since epoch
  let year = 1970;
  let daysRemaining = totalDays;

  // Count years
  while (true) {
    let daysInYear = isLeapYear(year) ? 366 : 365;
    if (daysRemaining < daysInYear) break;
    daysRemaining -= daysInYear;
    year++;
  }

  // Count months
  let month = 1;
  while (true) {
    let daysInMonth = getDaysInMonth(year, month);
    if (daysRemaining < daysInMonth) break;
    daysRemaining -= daysInMonth;
    month++;
  }

  let day = daysRemaining + 1;

  // Format as YYYY-MM-DD
  let yearStr = year.toString();
  let monthStr = month < 10 ? "0" + month.toString() : month.toString();
  let dayStr = day < 10 ? "0" + day.toString() : day.toString();

  return yearStr + "-" + monthStr + "-" + dayStr;
}

function isLeapYear(year: i32): boolean {
  return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}

function getDaysInMonth(year: i32, month: i32): i32 {
  if (month == 2) {
    return isLeapYear(year) ? 29 : 28;
  } else if (month == 4 || month == 6 || month == 9 || month == 11) {
    return 30;
  } else {
    return 31;
  }
}

// Update daily network stats
function updateDailyNetworkStats(
  event: ethereum.Event,
  eventType: string,
): void {
  let dateString = getDateStringFromTimestamp(event.block.timestamp);
  let dailyStats = DailyNetworkStats.load(dateString);

  if (!dailyStats) {
    dailyStats = new DailyNetworkStats(dateString);
    dailyStats.date = dateString;
    dailyStats.transactionCount = ZERO_BI;
    dailyStats.blockCount = ZERO_BI;
    dailyStats.courseTransactions = ZERO_BI;
    dailyStats.licenseTransactions = ZERO_BI;
    dailyStats.certificateTransactions = ZERO_BI;
    dailyStats.progressTransactions = ZERO_BI;
    dailyStats.adminTransactions = ZERO_BI;
    dailyStats.successfulTransactions = ZERO_BI;
    dailyStats.failedTransactions = ZERO_BI;
    dailyStats.startBlock = event.block.number;
    dailyStats.endBlock = event.block.number;
  }

  // Update transaction count
  dailyStats.transactionCount = dailyStats.transactionCount.plus(ONE_BI);
  dailyStats.successfulTransactions =
    dailyStats.successfulTransactions.plus(ONE_BI);

  // Update end block
  if (event.block.number.gt(dailyStats.endBlock)) {
    dailyStats.endBlock = event.block.number;
    dailyStats.blockCount = dailyStats.endBlock
      .minus(dailyStats.startBlock)
      .plus(ONE_BI);
  }

  // Categorize by contract type based on event prefix
  // IMPORTANT: Check ProgressTracker events FIRST before generic SECTION prefix
  // because SECTION_STARTED, SECTION_COMPLETED, COURSE_COMPLETED, PROGRESS_RESET
  // are from ProgressTracker, not CourseFactory
  if (
    eventType == "SECTION_STARTED" ||
    eventType == "SECTION_COMPLETED" ||
    eventType == "COURSE_COMPLETED" ||
    eventType == "PROGRESS_RESET" ||
    eventType.startsWith("PROGRESS_")
  ) {
    dailyStats.progressTransactions =
      dailyStats.progressTransactions.plus(ONE_BI);
  } else if (
    eventType.startsWith("COURSE_") ||
    eventType.startsWith("SECTION_") ||
    eventType.startsWith("SECTIONS_") ||
    eventType.startsWith("RATING") ||
    eventType.startsWith("USER_") ||
    eventType.startsWith("BATCH_")
  ) {
    dailyStats.courseTransactions = dailyStats.courseTransactions.plus(ONE_BI);
  } else if (
    eventType.startsWith("LICENSE_") ||
    eventType.startsWith("REVENUE_")
  ) {
    dailyStats.licenseTransactions =
      dailyStats.licenseTransactions.plus(ONE_BI);
  } else if (
    eventType.startsWith("CERTIFICATE_") ||
    eventType.startsWith("CONTRACT_") ||
    eventType == "COURSE_ADDED_TO_CERTIFICATE"
  ) {
    dailyStats.certificateTransactions =
      dailyStats.certificateTransactions.plus(ONE_BI);
  } else if (eventType == "CONFIG_UPDATE") {
    dailyStats.adminTransactions = dailyStats.adminTransactions.plus(ONE_BI);
  }

  dailyStats.save();
}

export function updateNetworkStats(
  event: ethereum.Event,
  eventType: string,
): void {
  let stats = NetworkStats.load(NETWORK_STATS_ID);

  if (!stats) {
    stats = new NetworkStats(NETWORK_STATS_ID);
    stats.totalTransactions = ZERO_BI;
    stats.lastBlockNumber = ZERO_BI;
    stats.lastBlockTimestamp = ZERO_BI;
    stats.averageBlockTime = ZERO_BD;
    stats.totalCourseCreations = ZERO_BI;
    stats.totalLicenseMints = ZERO_BI;
    stats.totalCertificateMints = ZERO_BI;
    stats.totalProgressUpdates = ZERO_BI;
    stats.courseFactoryInteractions = ZERO_BI;
    stats.courseLicenseInteractions = ZERO_BI;
    stats.progressTrackerInteractions = ZERO_BI;
    stats.certificateManagerInteractions = ZERO_BI;
  }

  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1));

  // ============================================================================
  // COURSE FACTORY EVENTS
  // ============================================================================
  // Course lifecycle events
  if (eventType == "COURSE_CREATED") {
    stats.totalCourseCreations = stats.totalCourseCreations.plus(
      BigInt.fromI32(1),
    );
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (
    eventType == "COURSE_UPDATED" ||
    eventType == "COURSE_DELETED" ||
    eventType == "COURSE_UNPUBLISHED" ||
    eventType == "COURSE_REPUBLISHED" ||
    eventType == "COURSE_EMERGENCY_DEACTIVATED" ||
    eventType == "COURSE_RATED"
  ) {
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // Section management events (singular prefix SECTION_)
  else if (
    eventType == "SECTION_ADDED" ||
    eventType == "SECTION_UPDATED" ||
    eventType == "SECTION_DELETED" ||
    eventType == "SECTION_MOVED"
  ) {
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // Section management events (plural prefix SECTIONS_)
  else if (
    eventType == "SECTIONS_SWAPPED" ||
    eventType == "SECTIONS_BATCH_REORDERED"
  ) {
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // Batch section events
  else if (eventType == "BATCH_SECTIONS_ADDED") {
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // Rating events (belong to CourseFactory contract)
  else if (
    eventType == "RATING_UPDATED" ||
    eventType == "RATING_DELETED" ||
    eventType == "RATING_REMOVED" ||
    eventType == "RATINGS_PAUSED" ||
    eventType == "RATINGS_UNPAUSED"
  ) {
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // User moderation events (belong to CourseFactory contract)
  else if (
    eventType == "USER_BLACKLISTED" ||
    eventType == "USER_UNBLACKLISTED"
  ) {
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // ============================================================================
  // COURSE LICENSE EVENTS
  // ============================================================================
  else if (eventType == "LICENSE_MINTED") {
    stats.totalLicenseMints = stats.totalLicenseMints.plus(BigInt.fromI32(1));
    stats.courseLicenseInteractions = stats.courseLicenseInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (eventType == "LICENSE_RENEWED" || eventType == "LICENSE_EXPIRED") {
    stats.courseLicenseInteractions = stats.courseLicenseInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // Revenue tracking event (belongs to CourseLicense contract)
  else if (eventType == "REVENUE_RECORDED") {
    stats.courseLicenseInteractions = stats.courseLicenseInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // ============================================================================
  // CERTIFICATE MANAGER EVENTS
  // ============================================================================
  else if (eventType == "CERTIFICATE_MINTED") {
    stats.totalCertificateMints = stats.totalCertificateMints.plus(
      BigInt.fromI32(1),
    );
    stats.certificateManagerInteractions =
      stats.certificateManagerInteractions.plus(BigInt.fromI32(1));
  } else if (
    eventType == "CERTIFICATE_UPDATE" ||
    eventType == "CERTIFICATE_UPDATED" ||
    eventType == "CERTIFICATE_REVOKED" ||
    eventType == "CERTIFICATE_PAYMENT_RECORDED" ||
    eventType == "CERTIFICATE_URI_UPDATED" ||
    eventType == "COURSE_ADDED_TO_CERTIFICATE"
  ) {
    stats.certificateManagerInteractions =
      stats.certificateManagerInteractions.plus(BigInt.fromI32(1));
  }
  // Contract state events (belong to CertificateManager contract)
  else if (eventType == "CONTRACT_PAUSED" || eventType == "CONTRACT_UNPAUSED") {
    stats.certificateManagerInteractions =
      stats.certificateManagerInteractions.plus(BigInt.fromI32(1));
  }
  // ============================================================================
  // PROGRESS TRACKER EVENTS
  // ============================================================================
  else if (eventType == "PROGRESS_UPDATE") {
    stats.totalProgressUpdates = stats.totalProgressUpdates.plus(
      BigInt.fromI32(1),
    );
    stats.progressTrackerInteractions = stats.progressTrackerInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (
    eventType == "SECTION_STARTED" ||
    eventType == "SECTION_COMPLETED" ||
    eventType == "COURSE_COMPLETED" ||
    eventType == "PROGRESS_RESET"
  ) {
    // Also count these as progress updates for accurate metrics
    stats.totalProgressUpdates = stats.totalProgressUpdates.plus(
      BigInt.fromI32(1),
    );
    stats.progressTrackerInteractions = stats.progressTrackerInteractions.plus(
      BigInt.fromI32(1),
    );
  }
  // ============================================================================
  // CONFIG UPDATE EVENTS - Categorize by source contract
  // ============================================================================
  // Note: CONFIG_UPDATE is used by both CourseLicense and CertificateManager
  // We need to track these separately. Since we can't determine the source
  // contract from the event type alone, we'll use a heuristic approach:
  // - For now, split evenly between License and Certificate contracts
  // - In a future update, pass the source contract as a parameter
  else if (eventType == "CONFIG_UPDATE") {
    // Default to Certificate Manager for config updates
    // (Most config updates come from CertificateManager in our codebase)
    stats.certificateManagerInteractions =
      stats.certificateManagerInteractions.plus(BigInt.fromI32(1));
  }
  // ============================================================================
  // FALLBACK - For any unhandled event types
  // ============================================================================
  else {
    // Fallback pattern matching for any new event types
    if (eventType.startsWith("COURSE_")) {
      stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
        BigInt.fromI32(1),
      );
    } else if (
      eventType.startsWith("SECTION_") ||
      eventType.startsWith("SECTIONS_")
    ) {
      stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
        BigInt.fromI32(1),
      );
    } else if (
      eventType.startsWith("RATING") ||
      eventType.startsWith("USER_")
    ) {
      stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
        BigInt.fromI32(1),
      );
    } else if (
      eventType.startsWith("LICENSE_") ||
      eventType.startsWith("REVENUE_")
    ) {
      stats.courseLicenseInteractions = stats.courseLicenseInteractions.plus(
        BigInt.fromI32(1),
      );
    } else if (
      eventType.startsWith("CERTIFICATE_") ||
      eventType.startsWith("CONTRACT_")
    ) {
      stats.certificateManagerInteractions =
        stats.certificateManagerInteractions.plus(BigInt.fromI32(1));
    } else if (eventType.startsWith("PROGRESS_")) {
      stats.progressTrackerInteractions =
        stats.progressTrackerInteractions.plus(BigInt.fromI32(1));
    } else {
      // Unknown event type - log for debugging but still count somewhere
      // Default to the most active contract (ProgressTracker based on distribution)
      stats.progressTrackerInteractions =
        stats.progressTrackerInteractions.plus(BigInt.fromI32(1));
    }
  }

  // ============================================================================
  // AVERAGE BLOCK TIME CALCULATION
  // ============================================================================
  if (!stats.lastBlockTimestamp.equals(ZERO_BI)) {
    let timeDiff = event.block.timestamp.minus(stats.lastBlockTimestamp);
    let blockDiff = event.block.number.minus(stats.lastBlockNumber);

    if (blockDiff.gt(ZERO_BI)) {
      let newBlockTime = timeDiff.toBigDecimal().div(blockDiff.toBigDecimal());

      if (stats.averageBlockTime.equals(ZERO_BD)) {
        stats.averageBlockTime = newBlockTime;
      } else {
        // Exponential moving average with alpha = 0.1
        let alpha = BigDecimal.fromString("0.1");
        let oneMinusAlpha = BigDecimal.fromString("0.9");
        stats.averageBlockTime = stats.averageBlockTime
          .times(oneMinusAlpha)
          .plus(newBlockTime.times(alpha));
      }
    }
  }

  stats.lastBlockNumber = event.block.number;
  stats.lastBlockTimestamp = event.block.timestamp;

  stats.save();

  // Also update daily stats
  updateDailyNetworkStats(event, eventType);
}

export function updatePlatformStats(
  totalUsers: BigInt,
  totalCourses: BigInt,
  totalEnrollments: BigInt,
  totalCertificates: BigInt,
  totalRevenue: BigInt,
  totalRevenueEth: BigDecimal,
  platformFees: BigInt,
  platformFeesEth: BigDecimal,
  creatorRevenue: BigInt,
  creatorRevenueEth: BigDecimal,
  event: ethereum.Event,
): void {
  let stats = PlatformStats.load(PLATFORM_STATS_ID);

  if (!stats) {
    stats = new PlatformStats(PLATFORM_STATS_ID);
    stats.totalUsers = ZERO_BI;
    stats.totalCourses = ZERO_BI;
    stats.totalEnrollments = ZERO_BI;
    stats.totalCertificates = ZERO_BI;
    stats.totalRevenue = ZERO_BI;
    stats.totalRevenueEth = ZERO_BD;
    stats.platformFees = ZERO_BI;
    stats.platformFeesEth = ZERO_BD;
    stats.creatorRevenue = ZERO_BI;
    stats.creatorRevenueEth = ZERO_BD;
    stats.averageCoursePrice = ZERO_BD;
    stats.averageCompletionRate = ZERO_BD;
    stats.averageRating = ZERO_BD;
    stats.dailyActiveUsers = ZERO_BI;
    stats.monthlyActiveUsers = ZERO_BI;
    stats.lastUpdateTimestamp = ZERO_BI;
    stats.lastUpdateBlock = ZERO_BI;
  }

  stats.totalUsers = totalUsers;
  stats.totalCourses = totalCourses;
  stats.totalEnrollments = totalEnrollments;
  stats.totalCertificates = totalCertificates;
  stats.totalRevenue = totalRevenue;
  stats.totalRevenueEth = totalRevenueEth;
  stats.platformFees = platformFees;
  stats.platformFeesEth = platformFeesEth;
  stats.creatorRevenue = creatorRevenue;
  stats.creatorRevenueEth = creatorRevenueEth;
  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;

  stats.save();
}

export function incrementPlatformCounter(
  counterType: string,
  event: ethereum.Event,
): void {
  let stats = PlatformStats.load(PLATFORM_STATS_ID);

  if (!stats) {
    stats = new PlatformStats(PLATFORM_STATS_ID);
    stats.totalUsers = ZERO_BI;
    stats.totalCourses = ZERO_BI;
    stats.totalEnrollments = ZERO_BI;
    stats.totalCertificates = ZERO_BI;
    stats.totalRevenue = ZERO_BI;
    stats.totalRevenueEth = ZERO_BD;
    stats.platformFees = ZERO_BI;
    stats.platformFeesEth = ZERO_BD;
    stats.creatorRevenue = ZERO_BI;
    stats.creatorRevenueEth = ZERO_BD;
    stats.averageCoursePrice = ZERO_BD;
    stats.averageCompletionRate = ZERO_BD;
    stats.averageRating = ZERO_BD;
    stats.dailyActiveUsers = ZERO_BI;
    stats.monthlyActiveUsers = ZERO_BI;
    stats.lastUpdateTimestamp = ZERO_BI;
    stats.lastUpdateBlock = ZERO_BI;
  }

  if (counterType == "USER") {
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1));
  } else if (counterType == "COURSE") {
    stats.totalCourses = stats.totalCourses.plus(BigInt.fromI32(1));
  } else if (counterType == "ENROLLMENT") {
    stats.totalEnrollments = stats.totalEnrollments.plus(BigInt.fromI32(1));
  } else if (counterType == "CERTIFICATE") {
    stats.totalCertificates = stats.totalCertificates.plus(BigInt.fromI32(1));
  }

  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;

  stats.save();
}

export function addPlatformRevenue(
  amount: BigInt,
  amountEth: BigDecimal,
  platformFee: BigInt,
  platformFeeEth: BigDecimal,
  creatorAmount: BigInt,
  creatorAmountEth: BigDecimal,
  event: ethereum.Event,
): void {
  let stats = PlatformStats.load(PLATFORM_STATS_ID);

  if (!stats) {
    stats = new PlatformStats(PLATFORM_STATS_ID);
    stats.totalUsers = ZERO_BI;
    stats.totalCourses = ZERO_BI;
    stats.totalEnrollments = ZERO_BI;
    stats.totalCertificates = ZERO_BI;
    stats.totalRevenue = ZERO_BI;
    stats.totalRevenueEth = ZERO_BD;
    stats.platformFees = ZERO_BI;
    stats.platformFeesEth = ZERO_BD;
    stats.creatorRevenue = ZERO_BI;
    stats.creatorRevenueEth = ZERO_BD;
    stats.averageCoursePrice = ZERO_BD;
    stats.averageCompletionRate = ZERO_BD;
    stats.averageRating = ZERO_BD;
    stats.dailyActiveUsers = ZERO_BI;
    stats.monthlyActiveUsers = ZERO_BI;
    stats.lastUpdateTimestamp = ZERO_BI;
    stats.lastUpdateBlock = ZERO_BI;
  }

  stats.totalRevenue = stats.totalRevenue.plus(amount);
  stats.totalRevenueEth = stats.totalRevenueEth.plus(amountEth);
  stats.platformFees = stats.platformFees.plus(platformFee);
  stats.platformFeesEth = stats.platformFeesEth.plus(platformFeeEth);
  stats.creatorRevenue = stats.creatorRevenue.plus(creatorAmount);
  stats.creatorRevenueEth = stats.creatorRevenueEth.plus(creatorAmountEth);
  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;

  stats.save();
}

export function updateAverageCoursePrice(event: ethereum.Event): void {
  let stats = PlatformStats.load(PLATFORM_STATS_ID);

  if (!stats) {
    stats = new PlatformStats(PLATFORM_STATS_ID);
    stats.totalUsers = ZERO_BI;
    stats.totalCourses = ZERO_BI;
    stats.totalEnrollments = ZERO_BI;
    stats.totalCertificates = ZERO_BI;
    stats.totalRevenue = ZERO_BI;
    stats.totalRevenueEth = ZERO_BD;
    stats.platformFees = ZERO_BI;
    stats.platformFeesEth = ZERO_BD;
    stats.creatorRevenue = ZERO_BI;
    stats.creatorRevenueEth = ZERO_BD;
    stats.averageCoursePrice = ZERO_BD;
    stats.averageCompletionRate = ZERO_BD;
    stats.averageRating = ZERO_BD;
    stats.dailyActiveUsers = ZERO_BI;
    stats.monthlyActiveUsers = ZERO_BI;
    stats.lastUpdateTimestamp = ZERO_BI;
    stats.lastUpdateBlock = ZERO_BI;
  }

  if (stats.totalEnrollments.gt(ZERO_BI)) {
    stats.averageCoursePrice = stats.totalRevenue
      .toBigDecimal()
      .div(stats.totalEnrollments.toBigDecimal())
      .div(WEI_TO_ETH);
  } else {
    stats.averageCoursePrice = ZERO_BD;
  }

  stats.lastUpdateTimestamp = event.block.timestamp;
  stats.lastUpdateBlock = event.block.number;

  stats.save();
}
