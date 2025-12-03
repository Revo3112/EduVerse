/**
 * Network Analytics Service
 * Provides insights into blockchain network usage and performance for EduVerse
 *
 * NOTE: This service queries ONLY fields that exist in the subgraph schema.
 * Gas-related fields (totalGasUsed, totalGasCost, averageGasPrice) are NOT
 * tracked in the subgraph as The Graph doesn't have access to gas data.
 */

import { graphqlClient as goldskyClient } from "@/lib/graphql-client";
import { gql } from "graphql-request";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NetworkStats {
  // Network metrics
  totalTransactions: number;
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
  blockCount: number;
  courseTransactions: number;
  licenseTransactions: number;
  certificateTransactions: number;
  progressTransactions: number;
  adminTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  startBlock: number;
  endBlock: number;
}

export interface NetworkAnalytics {
  currentStats: NetworkStats;
  dailyStats: DailyStats[];
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

    dailyNetworkStats_collection(
      first: 30
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
      adminTransactions
      successfulTransactions
      failedTransactions
      startBlock
      endBlock
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
    const data = await goldskyClient.request<{
      networkStats: Record<string, string | number> | null;
      dailyNetworkStats_collection: Record<string, string | number>[];
    }>(GET_NETWORK_ANALYTICS);

    const transformed: NetworkAnalytics = {
      currentStats: transformNetworkStats(data.networkStats || {}),
      dailyStats: (data.dailyNetworkStats_collection || []).map(
        transformDailyStats
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

// ============================================================================
// DATA TRANSFORMATION HELPERS
// ============================================================================

function transformNetworkStats(
  raw: Record<string, string | number>
): NetworkStats {
  return {
    totalTransactions: parseInt(String(raw.totalTransactions || 0)),
    averageBlockTime: parseFloat(String(raw.averageBlockTime || 0)),
    lastBlockNumber: parseInt(String(raw.lastBlockNumber || 0)),
    lastBlockTimestamp: parseInt(String(raw.lastBlockTimestamp || 0)),
    totalCourseCreations: parseInt(String(raw.totalCourseCreations || 0)),
    totalLicenseMints: parseInt(String(raw.totalLicenseMints || 0)),
    totalCertificateMints: parseInt(String(raw.totalCertificateMints || 0)),
    totalProgressUpdates: parseInt(String(raw.totalProgressUpdates || 0)),
    courseFactoryInteractions: parseInt(
      String(raw.courseFactoryInteractions || 0)
    ),
    courseLicenseInteractions: parseInt(
      String(raw.courseLicenseInteractions || 0)
    ),
    progressTrackerInteractions: parseInt(
      String(raw.progressTrackerInteractions || 0)
    ),
    certificateManagerInteractions: parseInt(
      String(raw.certificateManagerInteractions || 0)
    ),
  };
}

function transformDailyStats(raw: Record<string, string | number>): DailyStats {
  return {
    date: String(raw.date || ""),
    transactionCount: parseInt(String(raw.transactionCount || 0)),
    blockCount: parseInt(String(raw.blockCount || 0)),
    courseTransactions: parseInt(String(raw.courseTransactions || 0)),
    licenseTransactions: parseInt(String(raw.licenseTransactions || 0)),
    certificateTransactions: parseInt(String(raw.certificateTransactions || 0)),
    progressTransactions: parseInt(String(raw.progressTransactions || 0)),
    adminTransactions: parseInt(String(raw.adminTransactions || 0)),
    successfulTransactions: parseInt(String(raw.successfulTransactions || 0)),
    failedTransactions: parseInt(String(raw.failedTransactions || 0)),
    startBlock: parseInt(String(raw.startBlock || 0)),
    endBlock: parseInt(String(raw.endBlock || 0)),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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
