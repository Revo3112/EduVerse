import { BigInt, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  NetworkStats,
  DailyNetworkStats,
  TransactionRecord,
} from "../../generated/schema";

// ============================================================================
// CONSTANTS
// ============================================================================

const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const ZERO_BD = BigDecimal.fromString("0");
const WEI_TO_ETH = BigDecimal.fromString("1000000000000000000"); // 10^18
const WEI_TO_GWEI = BigDecimal.fromString("1000000000"); // 10^9

const NETWORK_STATS_ID = "network";

const CONTRACT_ADDRESSES = new Map<string, string>();
CONTRACT_ADDRESSES.set(
  "CourseFactory",
  "0x44661459e3c092358559d8459e585EA201D04231",
);
CONTRACT_ADDRESSES.set(
  "CourseLicense",
  "0x3aad55E0E88C4594643fEFA837caFAe1723403C8",
);
CONTRACT_ADDRESSES.set(
  "ProgressTracker",
  "0xaB2adB0F4D800971Ee095e2bC26f9d4AdBeDe930",
);
CONTRACT_ADDRESSES.set(
  "CertificateManager",
  "0x0a7750524B826E09a27B98564E98AF77fe78f600",
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get or create NetworkStats entity
 */
function getOrCreateNetworkStats(): NetworkStats {
  let stats = NetworkStats.load(NETWORK_STATS_ID);

  if (!stats) {
    stats = new NetworkStats(NETWORK_STATS_ID);
    stats.totalTransactions = ZERO_BI;
    stats.totalGasUsed = ZERO_BI;
    stats.totalGasCost = ZERO_BD;
    stats.averageGasPrice = ZERO_BD;
    stats.averageBlockTime = ZERO_BD;
    stats.lastBlockNumber = ZERO_BI;
    stats.lastBlockTimestamp = ZERO_BI;

    // Transaction type counts
    stats.totalCourseCreations = ZERO_BI;
    stats.totalLicenseMints = ZERO_BI;
    stats.totalCertificateMints = ZERO_BI;
    stats.totalProgressUpdates = ZERO_BI;

    // Contract interactions
    stats.courseFactoryInteractions = ZERO_BI;
    stats.courseLicenseInteractions = ZERO_BI;
    stats.progressTrackerInteractions = ZERO_BI;
    stats.certificateManagerInteractions = ZERO_BI;
  }

  return stats;
}

/**
 * Get or create DailyNetworkStats entity
 */
function getOrCreateDailyStats(timestamp: BigInt): DailyNetworkStats {
  // Convert timestamp to YYYY-MM-DD
  let date = new Date(timestamp.toI32() * 1000);
  let dateString = date.toISOString().split("T")[0];

  let stats = DailyNetworkStats.load(dateString);

  if (!stats) {
    stats = new DailyNetworkStats(dateString);
    stats.date = dateString;
    stats.transactionCount = ZERO_BI;
    stats.gasUsed = ZERO_BI;
    stats.gasCost = ZERO_BD;
    stats.averageGasPrice = ZERO_BD;
    stats.blockCount = ZERO_BI;
    stats.totalBlockTime = ZERO_BD;

    // Daily breakdown
    stats.courseTransactions = ZERO_BI;
    stats.licenseTransactions = ZERO_BI;
    stats.certificateTransactions = ZERO_BI;
    stats.progressTransactions = ZERO_BI;

    // Success rates
    stats.successfulTransactions = ZERO_BI;
    stats.failedTransactions = ZERO_BI;

    // Value metrics
    stats.totalValueTransferred = ZERO_BD;
    stats.uniqueUsers = ZERO_BI;

    // Block references
    stats.startBlock = ZERO_BI;
    stats.endBlock = ZERO_BI;
  }

  return stats;
}

/**
 * Determine contract and event type from transaction
 */
function categorizeTransaction(tx: ethereum.Transaction): {
  contract: string;
  eventType: string;
  eventAction: string;
} {
  let to = tx.to.toHexString().toLowerCase();

  // Check each contract
  if (to == CONTRACT_ADDRESSES.get("CourseFactory").toLowerCase()) {
    return {
      contract: "CourseFactory",
      eventType: "COURSE",
      eventAction: "CREATE", // Default, will be refined by event handlers
    };
  }

  if (to == CONTRACT_ADDRESSES.get("CourseLicense").toLowerCase()) {
    return {
      contract: "CourseLicense",
      eventType: "LICENSE",
      eventAction: "MINT", // Default
    };
  }

  if (to == CONTRACT_ADDRESSES.get("ProgressTracker").toLowerCase()) {
    return {
      contract: "ProgressTracker",
      eventType: "PROGRESS",
      eventAction: "UPDATE", // Default
    };
  }

  if (to == CONTRACT_ADDRESSES.get("CertificateManager").toLowerCase()) {
    return {
      contract: "CertificateManager",
      eventType: "CERTIFICATE",
      eventAction: "MINT", // Default
    };
  }

  return {
    contract: "Unknown",
    eventType: "OTHER",
    eventAction: "UNKNOWN",
  };
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handler for new blocks
 * Updates block time metrics and daily stats
 */
export function handleBlock(block: ethereum.Block): void {
  let stats = getOrCreateNetworkStats();

  // Calculate block time if not first block
  if (!stats.lastBlockTimestamp.equals(ZERO_BI)) {
    let timeDiff = block.timestamp.minus(stats.lastBlockTimestamp);
    stats.averageBlockTime = timeDiff.toBigDecimal();
  }

  // Update last block info
  stats.lastBlockNumber = block.number;
  stats.lastBlockTimestamp = block.timestamp;
  stats.save();

  // Update daily stats
  let daily = getOrCreateDailyStats(block.timestamp);
  daily.blockCount = daily.blockCount.plus(ONE_BI);
  daily.endBlock = block.number;

  // Set start block if first block of the day
  if (daily.startBlock.equals(ZERO_BI)) {
    daily.startBlock = block.number;
  }

  daily.save();
}

/**
 * Handler for transactions
 * Tracks gas usage, categorizes transactions, updates statistics
 */
export function handleTransaction(tx: ethereum.Transaction): void {
  let stats = getOrCreateNetworkStats();
  let daily = getOrCreateDailyStats(tx.block.timestamp);

  // Create transaction record
  let record = new TransactionRecord(tx.hash.toHexString());
  record.hash = tx.hash;
  record.blockNumber = tx.block.number;
  record.timestamp = tx.block.timestamp;
  record.gasUsed = tx.gasUsed;
  record.gasPrice = tx.gasPrice.toBigDecimal().div(WEI_TO_GWEI);
  record.value = tx.value.toBigDecimal().div(WEI_TO_ETH);
  record.from = tx.from;
  record.to = tx.to;
  record.contractAddress = tx.to;
  record.success = true; // Will be updated by receipt handler if failed

  // Categorize transaction
  let category = categorizeTransaction(tx);
  record.eventType = category.eventType;
  record.eventAction = category.eventAction;

  // Update network stats
  stats.totalTransactions = stats.totalTransactions.plus(ONE_BI);
  stats.totalGasUsed = stats.totalGasUsed.plus(tx.gasUsed);
  let gasCost = tx.gasUsed.times(tx.gasPrice).toBigDecimal().div(WEI_TO_ETH);
  stats.totalGasCost = stats.totalGasCost.plus(gasCost);

  // Update contract-specific counters
  if (category.contract == "CourseFactory") {
    stats.courseFactoryInteractions =
      stats.courseFactoryInteractions.plus(ONE_BI);
  } else if (category.contract == "CourseLicense") {
    stats.courseLicenseInteractions =
      stats.courseLicenseInteractions.plus(ONE_BI);
  } else if (category.contract == "ProgressTracker") {
    stats.progressTrackerInteractions =
      stats.progressTrackerInteractions.plus(ONE_BI);
  } else if (category.contract == "CertificateManager") {
    stats.certificateManagerInteractions =
      stats.certificateManagerInteractions.plus(ONE_BI);
  }

  stats.save();

  // Update daily stats
  daily.transactionCount = daily.transactionCount.plus(ONE_BI);
  daily.gasUsed = daily.gasUsed.plus(tx.gasUsed);
  daily.gasCost = daily.gasCost.plus(gasCost);
  daily.totalValueTransferred = daily.totalValueTransferred.plus(record.value);

  // Update transaction type counts
  if (category.eventType == "COURSE") {
    daily.courseTransactions = daily.courseTransactions.plus(ONE_BI);
  } else if (category.eventType == "LICENSE") {
    daily.licenseTransactions = daily.licenseTransactions.plus(ONE_BI);
  } else if (category.eventType == "CERTIFICATE") {
    daily.certificateTransactions = daily.certificateTransactions.plus(ONE_BI);
  } else if (category.eventType == "PROGRESS") {
    daily.progressTransactions = daily.progressTransactions.plus(ONE_BI);
  }

  daily.save();
  record.save();
}

/**
 * Handler for transaction receipts
 * Updates success/failure stats and error messages
 */
export function handleTransactionReceipt(
  receipt: ethereum.TransactionReceipt,
): void {
  let record = TransactionRecord.load(receipt.transactionHash.toHexString());
  if (!record) return;

  let daily = getOrCreateDailyStats(record.timestamp);

  record.success = receipt.status == 1;
  if (!record.success) {
    record.errorMessage = "Transaction failed"; // Basic error tracking
  }
  record.save();

  // Update success/failure counts
  if (record.success) {
    daily.successfulTransactions = daily.successfulTransactions.plus(ONE_BI);
  } else {
    daily.failedTransactions = daily.failedTransactions.plus(ONE_BI);
  }
  daily.save();
}

// ============================================================================
// END OF FILE
// ============================================================================
