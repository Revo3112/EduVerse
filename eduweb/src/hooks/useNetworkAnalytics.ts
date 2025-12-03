"use client";

import { useQuery } from "@tanstack/react-query";
import {
  NetworkAnalytics,
  getNetworkAnalytics,
} from "@/services/network-analytics.service";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Types for time series data
interface TimeSeriesData {
  date: string;
  transactions: number;
  blockCount: number;
  courseTransactions: number;
  licenseTransactions: number;
  certificateTransactions: number;
  progressTransactions: number;
}

// Types for contract interactions
interface ContractStats {
  courseFactory: number;
  courseLicense: number;
  progressTracker: number;
  certificateManager: number;
}

// Types for success rate
interface TransactionSuccess {
  successfulTransactions: number;
  failedTransactions: number;
  successRate: string;
}

// Types for the returned hook data
export interface UseNetworkAnalyticsReturn {
  // Current stats
  totalTransactions: number;
  averageBlockTime: number;
  lastBlockNumber: number;

  // Event type metrics
  totalCourseCreations: number;
  totalLicenseMints: number;
  totalCertificateMints: number;
  totalProgressUpdates: number;

  // Contract interactions
  contractStats: ContractStats;

  // Time series data
  dailyStats: TimeSeriesData[];

  // Transaction success metrics
  transactionSuccess: TransactionSuccess;

  // Status
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Constants for polling interval
const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useNetworkAnalytics(): UseNetworkAnalyticsReturn {
  // Fetch network analytics using React Query
  const { data, isLoading, error, refetch } = useQuery<NetworkAnalytics>({
    queryKey: ["networkAnalytics"],
    queryFn: getNetworkAnalytics,
    refetchInterval: REFRESH_INTERVAL,
    select: (data) => data,
  });

  // Process contract interaction stats
  const contractStats: ContractStats = {
    courseFactory: data?.currentStats.courseFactoryInteractions ?? 0,
    courseLicense: data?.currentStats.courseLicenseInteractions ?? 0,
    progressTracker: data?.currentStats.progressTrackerInteractions ?? 0,
    certificateManager: data?.currentStats.certificateManagerInteractions ?? 0,
  };

  // Process daily stats for time series
  const dailyStats: TimeSeriesData[] =
    data?.dailyStats.map((day) => ({
      date: day.date,
      transactions: day.transactionCount,
      blockCount: day.blockCount,
      courseTransactions: day.courseTransactions,
      licenseTransactions: day.licenseTransactions,
      certificateTransactions: day.certificateTransactions,
      progressTransactions: day.progressTransactions,
    })) ?? [];

  // Calculate transaction success metrics from daily stats
  const totalSuccessful =
    data?.dailyStats.reduce(
      (sum, day) => sum + day.successfulTransactions,
      0
    ) ?? 0;
  const totalFailed =
    data?.dailyStats.reduce((sum, day) => sum + day.failedTransactions, 0) ?? 0;
  const totalTx = totalSuccessful + totalFailed;

  const transactionSuccess: TransactionSuccess = {
    successfulTransactions: totalSuccessful,
    failedTransactions: totalFailed,
    successRate:
      totalTx > 0 ? ((totalSuccessful / totalTx) * 100).toFixed(2) : "100.00",
  };

  return {
    // Current stats
    totalTransactions: data?.currentStats.totalTransactions ?? 0,
    averageBlockTime: data?.currentStats.averageBlockTime ?? 0,
    lastBlockNumber: data?.currentStats.lastBlockNumber ?? 0,

    // Event type metrics
    totalCourseCreations: data?.currentStats.totalCourseCreations ?? 0,
    totalLicenseMints: data?.currentStats.totalLicenseMints ?? 0,
    totalCertificateMints: data?.currentStats.totalCertificateMints ?? 0,
    totalProgressUpdates: data?.currentStats.totalProgressUpdates ?? 0,

    // Processed metrics
    contractStats,
    dailyStats,
    transactionSuccess,

    // Status
    isLoading,
    error: error as Error | null,
    refetch: async () => {
      await refetch();
    },
  };
}

// ============================================================================
// EXAMPLES
// ============================================================================
/*
// Example usage in a component:

function NetworkStats() {
  const {
    totalTransactions,
    averageBlockTime,
    contractStats,
    dailyStats,
    transactionSuccess,
    isLoading,
    error
  } = useNetworkAnalytics();

  if (isLoading) return <div>Loading network stats...</div>;
  if (error) return <div>Error loading network stats</div>;

  return (
    <div>
      <h2>Network Overview</h2>
      <p>Total Transactions: {totalTransactions}</p>
      <p>Average Block Time: {averageBlockTime}s</p>

      <h3>Contract Activity</h3>
      <p>CourseFactory: {contractStats.courseFactory} interactions</p>
      <p>Success Rate: {transactionSuccess.successRate}%</p>

      <h3>Daily Transactions</h3>
      {dailyStats.map(day => (
        <div key={day.date}>
          <p>{day.date}: {day.transactions} txs</p>
        </div>
      ))}
    </div>
  );
}
*/

// ============================================================================
// END OF FILE
// ============================================================================
