/**
 * Network Analytics Service
 * Provides insights into blockchain network usage and performance for EduVerse
 */

import { graphqlClient as goldskyClient } from "@/lib/graphql-client";
import { gql } from "graphql-request";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NetworkStats {
  // Network metrics
  totalTransactions: number;
  totalGasUsed: string;
  totalGasCost: string; // in ETH
  averageGasPrice: string; // in gwei
  averageBlockTime: number; // seconds
  lastBlockNumber: number;
  lastBlockTimestamp: number;

  // Contract interactions
  totalCourseCreations: number;
  totalLicenseMints: number;
  totalCertificateMints: number;
  totalProgressUpdates: number;
  courseFactoryInteractions: number;
  courseLicenseInteractions: number;
  progressTrackerInteractions: number;
  certificateManagerInteractions: number;
}

export interface DailyStats {
  date: string;
  transactionCount: number;
  gasUsed: string;
  gasCost: string;
  averageGasPrice: string;
  blockCount: number;
  totalBlockTime: number;
  courseTransactions: number;
  licenseTransactions: number;
  certificateTransactions: number;
  progressTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalValueTransferred: string;
  uniqueUsers: number;
}

export interface TransactionRecord {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  functionName: string;
  eventType: string;
  eventAction: string;
  gasUsed: string;
  gasPrice: string;
  value: string;
  success: boolean;
  errorMessage?: string;
}

export interface NetworkAnalytics {
  currentStats: NetworkStats;
  dailyStats: DailyStats[];
  recentTransactions: TransactionRecord[];
}

export interface TransactionHistoryResponse {
  transactionRecords: TransactionRecord[];
  _meta: {
    block: {
      number: string;
      timestamp: string;
    } | null;
    hasIndexingErrors: boolean;
  };
}

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<
  string,
  {
    data: unknown;
    timestamp: number;
  }
>();

const GET_NETWORK_ANALYTICS = gql`
  query GetNetworkAnalytics {
    networkStats(id: "network") {
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
    }

    transactionRecords(first: 100, orderBy: timestamp, orderDirection: desc) {
      hash
      timestamp
      from
      to
      functionName
      eventType
      eventAction
      gasUsed
      gasPrice
      value
      success
      errorMessage
    }
  }
`;

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Fetch comprehensive network analytics
 */
export async function getNetworkAnalytics(): Promise<NetworkAnalytics> {
  const cacheKey = "network-analytics";
  const cached = cache.get(cacheKey);

  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as NetworkAnalytics;
  }

  try {
    const data = await goldskyClient.request(GET_NETWORK_ANALYTICS);

    const transformed = {
      currentStats: transformNetworkStats(data.networkStats),
      dailyStats: data.dailyNetworkStats.map(transformDailyStats),
      recentTransactions: data.transactionRecords.map(
        transformTransactionRecord
      ),
    };

    // Update cache
    cache.set(cacheKey, {
      data: transformed,
      timestamp: Date.now(),
    });

    return transformed;
  } catch (error) {
    console.error("[NetworkAnalytics] Failed to fetch analytics:", error);

    // Return stale cache on error if available
    if (cached) {
      console.warn("[NetworkAnalytics] Returning stale data");
      return cached.data as NetworkAnalytics;
    }

    // Handle rate limiting
    const err = error as { status?: number };
    if (err.status === 429) {
      console.warn("[NetworkAnalytics] Rate limit hit, retrying...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return getNetworkAnalytics();
    }

    throw error;
  }
}

/**
 * Get paginated transaction history
 * TODO: Implement actual GraphQL query to TransactionRecord entity
 * Currently returns empty data as TransactionRecord entity needs proper event handlers
 */
export async function getTransactionHistory(_params: {
  first: number;
  skip: number;
  orderBy: string;
  orderDirection: string;
}): Promise<TransactionHistoryResponse> {
  // Stub implementation - return empty data
  // In future, this should query the TransactionRecord entity from the subgraph
  console.warn(
    "getTransactionHistory is not yet implemented with actual subgraph data"
  );

  return {
    transactionRecords: [],
    _meta: {
      block: null,
      hasIndexingErrors: false,
    },
  };
}

// ============================================================================
// DATA TRANSFORMATION HELPERS
// ============================================================================

function transformNetworkStats(
  raw: Record<string, string | number>
): NetworkStats {
  return {
    totalTransactions: parseInt(String(raw.totalTransactions)),
    totalGasUsed: String(raw.totalGasUsed),
    totalGasCost: String(raw.totalGasCost),
    averageGasPrice: String(raw.averageGasPrice),
    averageBlockTime: parseFloat(String(raw.averageBlockTime)),
    lastBlockNumber: parseInt(String(raw.lastBlockNumber)),
    lastBlockTimestamp: parseInt(String(raw.lastBlockTimestamp)),
    totalCourseCreations: parseInt(String(raw.totalCourseCreations)),
    totalLicenseMints: parseInt(String(raw.totalLicenseMints)),
    totalCertificateMints: parseInt(String(raw.totalCertificateMints)),
    totalProgressUpdates: parseInt(String(raw.totalProgressUpdates)),
    courseFactoryInteractions: parseInt(String(raw.courseFactoryInteractions)),
    courseLicenseInteractions: parseInt(String(raw.courseLicenseInteractions)),
    progressTrackerInteractions: parseInt(
      String(raw.progressTrackerInteractions)
    ),
    certificateManagerInteractions: parseInt(
      String(raw.certificateManagerInteractions)
    ),
  };
}

function transformDailyStats(raw: Record<string, string | number>): DailyStats {
  return {
    date: String(raw.date),
    transactionCount: parseInt(String(raw.transactionCount)),
    gasUsed: String(raw.gasUsed),
    gasCost: String(raw.gasCost),
    averageGasPrice: String(raw.averageGasPrice),
    blockCount: parseInt(String(raw.blockCount)),
    totalBlockTime: parseFloat(String(raw.totalBlockTime)),
    courseTransactions: parseInt(String(raw.courseTransactions)),
    licenseTransactions: parseInt(String(raw.licenseTransactions)),
    certificateTransactions: parseInt(String(raw.certificateTransactions)),
    progressTransactions: parseInt(String(raw.progressTransactions)),
    successfulTransactions: parseInt(String(raw.successfulTransactions)),
    failedTransactions: parseInt(String(raw.failedTransactions)),
    totalValueTransferred: String(raw.totalValueTransferred),
    uniqueUsers: parseInt(String(raw.uniqueUsers)),
  };
}

function transformTransactionRecord(
  raw: Record<string, string | number | boolean>
): TransactionRecord {
  return {
    hash: String(raw.hash),
    timestamp: parseInt(String(raw.timestamp)),
    from: String(raw.from),
    to: String(raw.to),
    functionName: String(raw.functionName),
    eventType: String(raw.eventType),
    eventAction: String(raw.eventAction),
    gasUsed: String(raw.gasUsed),
    gasPrice: String(raw.gasPrice),
    value: String(raw.value),
    success: Boolean(raw.success),
    errorMessage: raw.errorMessage ? String(raw.errorMessage) : undefined,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format gas price from wei to gwei
 */
export function formatGasPrice(priceInWei: string): string {
  const gwei = parseFloat(priceInWei) / 1e9;
  return gwei.toFixed(2);
}

/**
 * Format transaction value from wei to ETH
 */
export function formatEthValue(valueInWei: string): string {
  const eth = parseFloat(valueInWei) / 1e18;
  return eth.toFixed(6);
}

/**
 * Calculate success rate from transaction counts
 */
export function calculateSuccessRate(
  successful: number,
  total: number
): string {
  if (total === 0) return "100.00";
  return ((successful / total) * 100).toFixed(2);
}

// Clear cache manually if needed
export function clearCache(): void {
  cache.clear();
}

// Get cache status
export function getCacheStatus(): { size: number; oldestEntry: number | null } {
  let oldestTimestamp: number | null = null;

  for (const entry of cache.values()) {
    if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
    }
  }

  return {
    size: cache.size,
    oldestEntry: oldestTimestamp,
  };
}

/**
 * Format block time in seconds to human readable
 */
export function formatBlockTime(timeInSeconds: number): string {
  if (timeInSeconds < 1) {
    return `${(timeInSeconds * 1000).toFixed(0)}ms`;
  }
  return `${timeInSeconds.toFixed(1)}s`;
}
