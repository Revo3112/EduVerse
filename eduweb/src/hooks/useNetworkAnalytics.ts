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
  gasUsed: string;
  gasCost: string;
}

// Types for contract interactions
interface ContractStats {
  courseFactory: number;
  courseLicense: number;
  progressTracker: number;
  certificateManager: number;
}

// Types for user activity
interface UserActivity {
  totalUsers: number;
  activeUsers: number;
  successRate: string;
}

// Types for the returned hook data
export interface UseNetworkAnalyticsReturn {
  // Current stats
  totalTransactions: number;
  totalGasUsed: string;
  totalGasCost: string;
  averageGasPrice: string;
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

  // User activity
  userActivity: UserActivity;

  // Recent transactions
  recentTransactions: {
    hash: string;
    type: string;
    action: string;
    timestamp: number;
    success: boolean;
  }[];

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
  const dailyStats: TimeSeriesData[] = data?.dailyStats.map((day) => ({
    date: day.date,
    transactions: day.transactionCount,
    gasUsed: day.gasUsed,
    gasCost: day.gasCost,
  })) ?? [];

  // Calculate user activity metrics
  const userActivity: UserActivity = {
    totalUsers:
      data?.dailyStats.reduce((max, day) => Math.max(max, day.uniqueUsers), 0) ??
      0,
    activeUsers:
      data?.dailyStats[0]?.uniqueUsers ?? 0, // Most recent day's active users
    successRate:
      data?.dailyStats[0]
        ? (
            (data.dailyStats[0].successfulTransactions /
              data.dailyStats[0].transactionCount) *
            100
          ).toFixed(2)
        : "0.00",
  };

  // Process recent transactions
  const recentTransactions = data?.recentTransactions.map((tx) => ({
    hash: tx.hash,
    type: tx.eventType,
    action: tx.eventAction,
    timestamp: tx.timestamp,
    success: tx.success,
  })) ?? [];

  return {
    // Current stats
    totalTransactions: data?.currentStats.totalTransactions ?? 0,
    totalGasUsed: data?.currentStats.totalGasUsed ?? "0",
    totalGasCost: data?.currentStats.totalGasCost ?? "0",
    averageGasPrice: data?.currentStats.averageGasPrice ?? "0",
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
    userActivity,
    recentTransactions,

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
    totalGasUsed,
    contractStats,
    dailyStats,
    userActivity,
    isLoading,
    error
  } = useNetworkAnalytics();

  if (isLoading) return <div>Loading network stats...</div>;
  if (error) return <div>Error loading network stats</div>;

  return (
    <div>
      <h2>Network Overview</h2>
      <p>Total Transactions: {totalTransactions}</p>
      <p>Total Gas Used: {totalGasUsed}</p>

      <h3>Contract Activity</h3>
      <p>CourseFactory: {contractStats.courseFactory} interactions</p>
      <p>Success Rate: {userActivity.successRate}%</p>

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
