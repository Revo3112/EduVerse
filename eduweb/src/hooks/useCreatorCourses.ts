/**
 * ============================================================================
 * USE CREATOR COURSES HOOK
 * ============================================================================
 * Custom React hook untuk fetch dan manage data course yang dibuat creator
 * dari Goldsky indexer dengan automatic refetch, loading states, dan error handling.
 * ============================================================================
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getCreatorCourses,
  getCreatorStats,
  getCourseDetail,
  refreshCreatorData,
  type CreatorCourseData,
  type CreatorStatsData,
} from "@/services/goldsky-creator.service";

// ============================================================================
// TYPES
// ============================================================================

export interface CreatorCoursesData {
  courses: CreatorCourseData[];
  stats: CreatorStatsData;
}

export interface UseCreatorCoursesReturn {
  // Data
  data: CreatorCoursesData | null;
  courses: CreatorCourseData[];
  stats: CreatorStatsData | null;

  // Computed analytics
  analytics: {
    totalCourses: number;
    totalEnrollments: number;
    totalRevenue: string;
    totalRevenueEth: string;
    totalActiveStudents: number;
    averageCompletionRate: number;
    revenueGrowth: number;
    revenueInIDR: number;
    lastMonthRevenueInIDR: number;
  };

  // States
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isRefetching: boolean;

  // Actions
  refetch: () => Promise<void>;
  refresh: () => void;
}

export interface UseCourseDetailReturn {
  course: CreatorCourseData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// MAIN HOOK: useCreatorCourses
// ============================================================================

/**
 * Hook utama untuk fetch semua course yang dibuat creator dari Goldsky
 *
 * @param creatorAddress - Wallet address creator (0x...)
 * @param ethToIDR - Current ETH to IDR exchange rate
 * @param options - Configuration options
 * @returns CreatorCoursesData dengan loading/error states dan analytics
 *
 * @example
 * ```tsx
 * function MyCoursePage() {
 *   const address = useActiveAccount()?.address;
 *   const { ethToIDR } = useEthPrice();
 *   const { courses, analytics, isLoading, error, refetch } = useCreatorCourses(
 *     address,
 *     ethToIDR
 *   );
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} onRetry={refetch} />;
 *
 *   return (
 *     <div>
 *       <h1>My Courses ({courses.length})</h1>
 *       <p>Total Revenue: {analytics.totalRevenueEth} ETH</p>
 *       {courses.map(course => (
 *         <CourseCard key={course.id} course={course} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCreatorCourses(
  creatorAddress: string | undefined,
  ethToIDR: number = 0,
  options: {
    enabled?: boolean;
    refetchInterval?: number; // Auto refetch interval in ms
    onSuccess?: (data: CreatorCoursesData) => void;
    onError?: (error: unknown) => void;
  } = {}
): UseCreatorCoursesReturn {
  const { enabled = true, refetchInterval, onSuccess, onError } = options;

  // States
  const [data, setData] = useState<CreatorCoursesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch function
  const fetchData = useCallback(
    async (isRefetch = false) => {
      if (!creatorAddress || !enabled) {
        setIsLoading(false);
        return;
      }

      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      try {
        if (isRefetch) {
          setIsRefetching(true);
        } else {
          setIsLoading(true);
        }
        setIsError(false);
        setError(null);

        const result = await getCreatorCourses(creatorAddress);

        setData(result);
        setIsError(false);
        setError(null);

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (err: unknown) {
        console.error("Error fetching creator courses from Goldsky:", err);
        setIsError(true);
        setError(
          err instanceof Error ? err : new Error("Unknown error occurred")
        );

        if (onError) {
          onError(err);
        }
      } finally {
        setIsLoading(false);
        setIsRefetching(false);
      }
    },
    [creatorAddress, enabled, onSuccess, onError]
  );

  // Initial fetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled || !creatorAddress) return;

    const intervalId = setInterval(() => {
      fetchData(true);
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, creatorAddress, fetchData]);

  // Refetch function
  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Refresh function (clear cache + refetch)
  const refresh = useCallback(() => {
    if (creatorAddress) {
      refreshCreatorData(creatorAddress);
      fetchData(true);
    }
  }, [creatorAddress, fetchData]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!data) {
      return {
        totalCourses: 0,
        totalEnrollments: 0,
        totalRevenue: "0",
        totalRevenueEth: "0",
        totalActiveStudents: 0,
        averageCompletionRate: 0,
        revenueGrowth: 0,
        revenueInIDR: 0,
        lastMonthRevenueInIDR: 0,
      };
    }

    const { courses, stats } = data;

    const totalEnrollments = courses.reduce(
      (sum, course) => sum + course.totalEnrollments,
      0
    );

    const totalActiveStudents = courses.reduce(
      (sum, course) => sum + course.activeEnrollments,
      0
    );

    const totalCompletedStudents = courses.reduce(
      (sum, course) => sum + course.completedStudents,
      0
    );

    const averageCompletionRate =
      totalEnrollments > 0
        ? (totalCompletedStudents / totalEnrollments) * 100
        : 0;

    // Parse revenue values
    const totalRevenueEth = parseFloat(stats.totalRevenueEth || "0");
    const revenueInIDR = totalRevenueEth * ethToIDR;

    // Mock last month revenue (in production, get from stats)
    const lastMonthRevenueEth = totalRevenueEth * 0.3; // Assume 30% was last month
    const lastMonthRevenueInIDR = lastMonthRevenueEth * ethToIDR;

    // Calculate revenue growth percentage: ((current - previous) / previous) * 100
    const currentMonthRevenueEth = totalRevenueEth - lastMonthRevenueEth;
    const revenueGrowth =
      lastMonthRevenueEth > 0
        ? (currentMonthRevenueEth / lastMonthRevenueEth) * 100
        : currentMonthRevenueEth > 0
        ? 100
        : 0;

    return {
      totalCourses: stats.totalCourses,
      totalEnrollments,
      totalRevenue: stats.totalRevenue,
      totalRevenueEth: stats.totalRevenueEth,
      totalActiveStudents,
      averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
      revenueGrowth: Math.min(Math.round(revenueGrowth * 10) / 10, 999),
      revenueInIDR,
      lastMonthRevenueInIDR,
    };
  }, [data, ethToIDR]);

  return {
    data,
    courses: data?.courses || [],
    stats: data?.stats || null,
    analytics,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    refresh,
  };
}

// ============================================================================
// HOOK: useCourseDetail
// ============================================================================

/**
 * Get detailed course data by course ID
 *
 * @param courseId - Course ID
 * @returns Course detail with loading/error states
 */
export function useCourseDetail(
  courseId: string | undefined
): UseCourseDetailReturn {
  const [course, setCourse] = useState<CreatorCourseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!courseId) {
      setIsLoading(false);
      return;
    }

    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const result = await getCourseDetail(courseId);

      setCourse(result);
      setIsError(false);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching course detail:", err);
      setIsError(true);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
      setCourse(null);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const refetch = useCallback(async () => {
    await fetchDetail();
  }, [fetchDetail]);

  return {
    course,
    isLoading,
    isError,
    error,
    refetch,
  };
}

// ============================================================================
// HOOK: useCreatorStats
// ============================================================================

/**
 * Get creator statistics only (lightweight query)
 *
 * @param creatorAddress - Wallet address creator
 * @returns Creator stats with loading/error states
 */
export function useCreatorStats(creatorAddress: string | undefined): {
  stats: CreatorStatsData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [stats, setStats] = useState<CreatorStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!creatorAddress) {
      setIsLoading(false);
      return;
    }

    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      const result = await getCreatorStats(creatorAddress);

      setStats(result);
      setIsError(false);
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching creator stats:", err);
      setIsError(true);
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [creatorAddress]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    isError,
    error,
    refetch,
  };
}
