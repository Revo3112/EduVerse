/**
 * useRecentActivities Hook
 *
 * Custom React hook for fetching and managing recent platform activities
 * Provides pagination, polling, and activity timeline management
 *
 * @author EduVerse Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from "react";
import {
  getRecentActivities,
  ActivityEventData,
} from "@/services/goldsky-analytics.service";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Activity hook state interface
 */
export interface ActivitiesState {
  activities: ActivityEventData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastFetch: number | null;
}

/**
 * Activity hook return interface
 */
export interface UseRecentActivitiesReturn {
  // Data
  activities: ActivityEventData[];

  // State flags
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Utilities
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  lastFetch: number | null;

  // Pagination
  hasMore: boolean;
  currentLimit: number;
}

/**
 * Hook configuration options
 */
export interface UseRecentActivitiesOptions {
  /**
   * Initial number of activities to fetch
   * @default 50
   */
  initialLimit?: number;

  /**
   * Number of activities to load per "load more" action
   * @default 25
   */
  loadMoreIncrement?: number;

  /**
   * Maximum number of activities to load total
   * @default 200
   */
  maxLimit?: number;

  /**
   * Enable automatic polling/refresh
   * @default false
   */
  autoRefresh?: boolean;

  /**
   * Refresh interval in milliseconds
   * @default 15000 (15 seconds)
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
 * Custom hook for recent activities management
 *
 * @example
 * ```tsx
 * function ActivityFeed() {
 *   const {
 *     activities,
 *     isLoading,
 *     loadMore,
 *     hasMore,
 *   } = useRecentActivities({
 *     initialLimit: 20,
 *     autoRefresh: true,
 *   });
 *
 *   return (
 *     <div>
 *       {activities.map(activity => (
 *         <ActivityCard key={activity.id} activity={activity} />
 *       ))}
 *       {hasMore && (
 *         <button onClick={loadMore} disabled={isLoading}>
 *           Load More
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRecentActivities(
  options: UseRecentActivitiesOptions = {}
): UseRecentActivitiesReturn {
  const {
    initialLimit = 50,
    loadMoreIncrement = 25,
    maxLimit = 200,
    autoRefresh = false,
    refreshInterval = 15000,
    fetchOnMount = true,
    debug = false,
  } = options;

  // State management
  const [state, setState] = useState<ActivitiesState>({
    activities: [],
    isLoading: fetchOnMount,
    isError: false,
    error: null,
    lastFetch: null,
  });

  const [currentLimit, setCurrentLimit] = useState(initialLimit);

  /**
   * Fetch activities with current limit
   */
  const fetchActivities = useCallback(
    async (limit: number = currentLimit) => {
      if (debug) {
        console.log(`[useRecentActivities] Fetching ${limit} activities...`);
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        isError: false,
        error: null,
      }));

      try {
        const data = await getRecentActivities(limit);

        if (debug) {
          console.log(
            `[useRecentActivities] Fetched ${data.length} activities successfully`
          );
        }

        setState({
          activities: data,
          isLoading: false,
          isError: false,
          error: null,
          lastFetch: Date.now(),
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        console.error("[useRecentActivities] Failed to fetch activities:", err);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: err,
        }));
      }
    },
    [currentLimit, debug]
  );

  /**
   * Manual refresh function (resets to initial limit)
   */
  const refresh = useCallback(async () => {
    if (debug) {
      console.log("[useRecentActivities] Manual refresh triggered");
    }
    setCurrentLimit(initialLimit);
    await fetchActivities(initialLimit);
  }, [initialLimit, fetchActivities, debug]);

  /**
   * Load more activities
   */
  const loadMore = useCallback(async () => {
    const newLimit = Math.min(currentLimit + loadMoreIncrement, maxLimit);

    if (newLimit === currentLimit) {
      if (debug) {
        console.log(
          "[useRecentActivities] Max limit reached, cannot load more"
        );
      }
      return;
    }

    if (debug) {
      console.log(
        `[useRecentActivities] Loading more activities (${currentLimit} -> ${newLimit})`
      );
    }

    setCurrentLimit(newLimit);
    await fetchActivities(newLimit);
  }, [currentLimit, loadMoreIncrement, maxLimit, fetchActivities, debug]);

  // Determine if there are more activities to load
  const hasMore =
    currentLimit < maxLimit && state.activities.length >= currentLimit;

  // Initial fetch on mount
  useEffect(() => {
    if (fetchOnMount) {
      fetchActivities();
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
        `[useRecentActivities] Auto-refresh enabled (interval: ${refreshInterval}ms)`
      );
    }

    const intervalId = setInterval(() => {
      if (debug) {
        console.log("[useRecentActivities] Auto-refresh triggered");
      }
      fetchActivities();
    }, refreshInterval);

    // Cleanup on unmount
    return () => {
      if (debug) {
        console.log("[useRecentActivities] Cleaning up auto-refresh interval");
      }
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval, debug]);

  return {
    activities: state.activities,
    isLoading: state.isLoading,
    isError: state.isError,
    error: state.error,
    refresh,
    loadMore,
    lastFetch: state.lastFetch,
    hasMore,
    currentLimit,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Transform ActivityEventData to BlockchainTransactionEvent format
 * For compatibility with existing analytics page UI
 */
export interface BlockchainTransactionEvent {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  eventType: string;
  eventData: {
    description: string;
    metadata?: string;
    course?: { id: string; title: string };
    enrollment?: { id: string };
    certificate?: { id: string; tokenId: string };
  };
  status: "success" | "failed";
}

/**
 * Convert ActivityEventData to BlockchainTransactionEvent format
 */
export function transformActivityToTransaction(
  activity: ActivityEventData
): BlockchainTransactionEvent {
  return {
    hash: `${activity.id}-${activity.transactionHash}-${activity.timestamp}`,
    blockNumber: activity.blockNumber,
    timestamp: activity.timestamp,
    from: activity.user.address,
    to: "",
    value: "0",
    gasUsed: "0",
    gasPrice: "0",
    eventType: activity.type,
    eventData: {
      description: activity.description,
      metadata: activity.metadata ?? undefined,
      course: activity.course ?? undefined,
      enrollment: activity.enrollment ?? undefined,
      certificate: activity.certificate ?? undefined,
    },
    status: "success",
  };
}

/**
 * Hook that returns activities in transaction format
 * For backward compatibility with existing UI components
 */
export function useRecentActivitiesAsTransactions(
  options: UseRecentActivitiesOptions = {}
): {
  transactions: BlockchainTransactionEvent[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
} {
  const { activities, isLoading, isError, error, refresh, loadMore, hasMore } =
    useRecentActivities(options);

  const transactions = activities.map(transformActivityToTransaction);

  return {
    transactions,
    isLoading,
    isError,
    error,
    refresh,
    loadMore,
    hasMore,
  };
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default useRecentActivities;
