import { BigInt, BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { NetworkStats, PlatformStats } from "../../../generated/schema";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
const WEI_TO_ETH = BigDecimal.fromString("1000000000000000000");

const NETWORK_STATS_ID = "network";
const PLATFORM_STATS_ID = "platform";

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

  if (eventType == "COURSE_CREATED") {
    stats.totalCourseCreations = stats.totalCourseCreations.plus(
      BigInt.fromI32(1),
    );
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (eventType == "LICENSE_MINTED") {
    stats.totalLicenseMints = stats.totalLicenseMints.plus(BigInt.fromI32(1));
    stats.courseLicenseInteractions = stats.courseLicenseInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (eventType == "CERTIFICATE_MINTED") {
    stats.totalCertificateMints = stats.totalCertificateMints.plus(
      BigInt.fromI32(1),
    );
    stats.certificateManagerInteractions =
      stats.certificateManagerInteractions.plus(BigInt.fromI32(1));
  } else if (eventType == "PROGRESS_UPDATE") {
    stats.totalProgressUpdates = stats.totalProgressUpdates.plus(
      BigInt.fromI32(1),
    );
    stats.progressTrackerInteractions = stats.progressTrackerInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (
    eventType.startsWith("SECTION_") ||
    eventType.startsWith("PROGRESS_") ||
    eventType == "COURSE_COMPLETED"
  ) {
    stats.progressTrackerInteractions = stats.progressTrackerInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (eventType.startsWith("COURSE_")) {
    stats.courseFactoryInteractions = stats.courseFactoryInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (eventType.startsWith("LICENSE_")) {
    stats.courseLicenseInteractions = stats.courseLicenseInteractions.plus(
      BigInt.fromI32(1),
    );
  } else if (eventType.startsWith("CERTIFICATE_")) {
    stats.certificateManagerInteractions =
      stats.certificateManagerInteractions.plus(BigInt.fromI32(1));
  }

  if (!stats.lastBlockTimestamp.equals(ZERO_BI)) {
    let timeDiff = event.block.timestamp.minus(stats.lastBlockTimestamp);
    stats.averageBlockTime = timeDiff.toBigDecimal();
  }

  stats.lastBlockNumber = event.block.number;
  stats.lastBlockTimestamp = event.block.timestamp;

  stats.save();
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
