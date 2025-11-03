/**
 * useAnalytics Hook
 *
 * Custom React hook for fetching and managing analytics data from Goldsky
 * Provides loading states, error handling, and auto-refresh capabilities
 *
 * @author EduVerse Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from "react";
import {
  getComprehensiveAnalytics,
  ComprehensiveAnalytics,
} from "@/services/goldsky-analytics.service";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Analytics hook state interface
 */
export interface AnalyticsState {
  data: ComprehensiveAnalytics | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastFetch: number | null;
}

/**
 * Analytics hook return interface
 */
export interface UseAnalyticsReturn {
  // Data
  analytics: ComprehensiveAnalytics | null;

  // State flags
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Utilities
  refresh: () => Promise<void>;
  lastFetch: number | null;
}

/**
 * Hook configuration options
 */
export interface UseAnalyticsOptions {
  /**
   * Enable automatic polling/refresh
   * @default false
   */
  autoRefresh?: boolean;

  /**
   * Refresh interval in milliseconds
   * @default 30000 (30 seconds)
   */
  refreshInterval?: number;

  /**
   * Fetch data immediately on mount
   * @default true
   */
  fetchOnMount?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Custom hook for analytics data management
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { analytics, isLoading, refresh } = useAnalytics({
 *     autoRefresh: true,
 *     refreshInterval: 30000,
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!analytics) return <div>No data</div>;
 *
 *   return <div>Total Users: {analytics.platform.totalUsers}</div>;
 * }
 * ```
 */
export function useAnalytics(
  options: UseAnalyticsOptions = {}
): UseAnalyticsReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    fetchOnMount = true,
    debug = false,
  } = options;

  // State management
  const [state, setState] = useState<AnalyticsState>({
    data: null,
    isLoading: fetchOnMount,
    isError: false,
    error: null,
    lastFetch: null,
  });

  /**
   * Fetch analytics data
   */
  const fetchAnalytics = useCallback(async () => {
    if (debug) {
      console.log("[useAnalytics] Fetching analytics data...");
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      isError: false,
      error: null,
    }));

    try {
      const data = await getComprehensiveAnalytics();

      if (debug) {
        console.log(
          "[useAnalytics] Analytics data fetched successfully:",
          data
        );
      }

      setState({
        data,
        isLoading: false,
        isError: false,
        error: null,
        lastFetch: Date.now(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      console.error("[useAnalytics] Failed to fetch analytics:", err);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: err,
      }));
    }
  }, [debug]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    if (debug) {
      console.log("[useAnalytics] Manual refresh triggered");
    }
    await fetchAnalytics();
  }, [fetchAnalytics, debug]);

  // Initial fetch on mount
  useEffect(() => {
    if (fetchOnMount) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOnMount]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    if (debug) {
      console.log(
        `[useAnalytics] Auto-refresh enabled (interval: ${refreshInterval}ms)`
      );
    }

    const intervalId = setInterval(() => {
      if (debug) {
        console.log("[useAnalytics] Auto-refresh triggered");
      }
      fetchAnalytics();
    }, refreshInterval);

    // Cleanup on unmount
    return () => {
      if (debug) {
        console.log("[useAnalytics] Cleaning up auto-refresh interval");
      }
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval, debug]);

  return {
    analytics: state.data,
    isLoading: state.isLoading,
    isError: state.isError,
    error: state.error,
    refresh,
    lastFetch: state.lastFetch,
  };
}

// ============================================================================
// UTILITY HOOK - useAnalyticsMetrics
// ============================================================================

export interface EduVerseAnalyticsMetrics {
  // Network
  totalTransactions: number;
  totalCourseCreations: number;
  totalLicenseMints: number;
  totalCertificateMints: number;
  totalProgressUpdates: number;
  courseFactoryInteractions: number;
  courseLicenseInteractions: number;
  progressTrackerInteractions: number;
  certificateManagerInteractions: number;
  averageBlockTime: number;

  // Users
  uniqueAddresses: number;
  activeStudents: number;
  activeCreators: number;

  // Courses
  totalCourses: number;
  activeCourses: number;
  totalSections: number;
  coursesWithRatings: number;
  averagePlatformRating: number;

  // Progress
  totalSectionsCompleted: number;
  totalCoursesCompleted: number;
  uniqueStudentsWithProgress: number;

  // Licensing
  totalLicensesMinted: number;
  totalLicensesRenewed: number;
  activeLicenses: number;
  totalLicenseRevenue: string;

  // Certificates
  totalCertificateHolders: number;
  totalCourseAdditions: number;
  certificateUpdates: number;
  totalCertificateRevenue: string;

  // Economics
  totalPlatformRevenue: string;
  totalCreatorPayouts: string;
  averageCoursePrice: string;
}

/**
 * Transform ComprehensiveAnalytics to EduVerseAnalyticsMetrics format
 * Maintains backward compatibility with existing analytics page
 */
export function useAnalyticsMetrics(options: UseAnalyticsOptions = {}): {
  metrics: EduVerseAnalyticsMetrics | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { analytics, isLoading, isError, error, refresh } =
    useAnalytics(options);

  const metrics: EduVerseAnalyticsMetrics | null = analytics
    ? {
        totalTransactions: analytics.network.totalTransactions,
        totalCourseCreations: analytics.network.totalCourseCreations,
        totalLicenseMints: analytics.network.totalLicenseMints,
        totalCertificateMints: analytics.network.totalCertificateMints,
        totalProgressUpdates: analytics.network.totalProgressUpdates,
        courseFactoryInteractions: analytics.network.courseFactoryInteractions,
        courseLicenseInteractions: analytics.network.courseLicenseInteractions,
        progressTrackerInteractions:
          analytics.network.progressTrackerInteractions,
        certificateManagerInteractions:
          analytics.network.certificateManagerInteractions,
        averageBlockTime: analytics.network.averageBlockTime,
        uniqueAddresses: analytics.users.uniqueAddresses,
        activeStudents: analytics.users.activeStudents,
        activeCreators: analytics.users.activeCreators,
        totalCourses: analytics.courses.totalCourses,
        activeCourses: analytics.courses.activeCourses,
        totalSections: analytics.courses.totalSections,
        coursesWithRatings: analytics.courses.coursesWithRatings,
        averagePlatformRating: parseFloat(analytics.courses.averageRating),
        totalSectionsCompleted: analytics.progress.totalSectionsCompleted,
        totalCoursesCompleted: analytics.progress.totalCoursesCompleted,
        uniqueStudentsWithProgress:
          analytics.progress.uniqueStudentsWithProgress,
        totalLicensesMinted: analytics.licenses.totalLicensesMinted,
        totalLicensesRenewed: analytics.licenses.totalLicensesRenewed,
        activeLicenses: analytics.licenses.activeLicenses,
        totalLicenseRevenue: analytics.licenses.totalLicenseRevenueEth,
        totalCertificateHolders: analytics.certificates.totalCertificateHolders,
        totalCourseAdditions: analytics.certificates.totalCoursesInCertificates,
        certificateUpdates: analytics.certificates.certificateUpdates,
        totalCertificateRevenue:
          analytics.certificates.totalCertificateRevenueEth,
        totalPlatformRevenue: analytics.platform.totalRevenueEth,
        totalCreatorPayouts: analytics.platform.creatorRevenueEth,
        averageCoursePrice: analytics.courses.averagePrice,
      }
    : null;

  return {
    metrics,
    isLoading,
    isError,
    error,
    refresh,
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default useAnalytics;
