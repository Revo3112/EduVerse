/**
 * @fileoverview useProgress Hook
 * @description React hook for course progress tracking and management
 * @author EduVerse Platform
 * @date 2025-10-19
 *
 * This hook provides real-time progress tracking and transaction functions:
 * - Reads section and course progress from blockchain
 * - Prepares and sends start/complete section transactions
 * - Auto-refreshes progress after transactions
 * - Calculates completion percentages and estimates
 * - Handles loading and error states
 *
 * Usage:
 * ```typescript
 * const {
 *   courseProgress,
 *   completionPercentage,
 *   startSection,
 *   completeSection,
 *   loading
 * } = useProgress(courseId);
 * ```
 */

"use client";

import {
    formatDuration,
    formatRelativeTime,
    getAllProgressForCourse,
    getCourseProgress,
    getEstimatedTimeToComplete,
    getNextIncompleteSection,
    prepareCompleteSectionTransaction,
    prepareResetProgressTransaction,
    prepareStartSectionTransaction,
    type CourseProgress,
    type SectionProgressDetail
} from "@/services/progress.service";
import { useCallback, useEffect, useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface UseProgressReturn {
  // Course Progress
  courseProgress: CourseProgress | null;
  completionPercentage: number;
  completedSections: number;
  totalSections: number;
  isFullyCompleted: boolean;
  lastActivityTime: bigint;
  lastActivityFormatted: string | null;

  // Section Details
  sectionsDetail: SectionProgressDetail[];
  nextIncompleteSection: bigint | null;

  // Estimates
  estimatedTimeRemaining: number;
  estimatedTimeFormatted: string;

  // Transaction Functions
  startSection: (sectionId: bigint) => Promise<void>;
  completeSection: (sectionId: bigint) => Promise<void>;
  resetProgress: () => Promise<void>;
  refreshProgress: () => Promise<void>;

  // Section Helpers
  isSectionCompleted: (sectionId: bigint) => boolean;
  isSectionStarted: (sectionId: bigint) => boolean;
  getSectionDuration: (sectionId: bigint) => string | null;

  // Loading States
  loading: boolean;
  isStarting: boolean;
  isCompleting: boolean;
  isResetting: boolean;

  // Errors
  error: string | null;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing course progress tracking
 *
 * @param courseId - Course ID to track progress for
 * @param options - Optional configuration
 * @returns Progress data and transaction functions
 *
 * @example
 * ```typescript
 * function CourseViewer({ courseId, sectionId }) {
 *   const {
 *     completionPercentage,
 *     startSection,
 *     completeSection,
 *     isSectionCompleted,
 *     loading
 *   } = useProgress(courseId);
 *
 *   useEffect(() => {
 *     if (!isSectionCompleted(sectionId)) {
 *       startSection(sectionId);
 *     }
 *   }, [sectionId]);
 *
 *   return (
 *     <div>
 *       <ProgressBar value={completionPercentage} />
 *       <VideoPlayer onEnd={() => completeSection(sectionId)} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useProgress(
  courseId: bigint,
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  } = {}
): UseProgressReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options;

  const account = useActiveAccount();

  // State
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [sectionsDetail, setSectionsDetail] = useState<SectionProgressDetail[]>([]);
  const [nextIncompleteSection, setNextIncompleteSection] = useState<bigint | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Thirdweb transaction hook
  const {
    mutate: sendTransaction,
    isPending: isTransactionPending,
  } = useSendTransaction();

  // Transaction-specific loading states
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // ============================================================================
  // FETCH PROGRESS DATA
  // ============================================================================

  const fetchProgress = useCallback(async () => {
    if (!account?.address) {
      setCourseProgress({
        courseId,
        student: "",
        totalSections: 0,
        completedSections: 0,
        completionPercentage: 0,
        isFullyCompleted: false,
        lastActivityTime: BigInt(0),
        sections: [],
      });
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch all progress data in parallel
      const [progress, details, nextSection, estimatedTime] = await Promise.all([
        getCourseProgress(account.address, courseId),
        getAllProgressForCourse(account.address, courseId),
        getNextIncompleteSection(account.address, courseId),
        getEstimatedTimeToComplete(account.address, courseId),
      ]);

      setCourseProgress(progress);
      setSectionsDetail(details);
      setNextIncompleteSection(nextSection);
      setEstimatedTimeRemaining(estimatedTime);
    } catch (err) {
      console.error("[useProgress] Error fetching progress:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch progress");
    } finally {
      setLoading(false);
    }
  }, [account?.address, courseId]);

  // Initial fetch
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchProgress();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchProgress]);

  // ============================================================================
  // START SECTION
  // ============================================================================

  const startSection = useCallback(
    async (sectionId: bigint) => {
      if (!account?.address) {
        const errorMsg = "Please connect your wallet first";
        setError(errorMsg);
        console.error("[useProgress]", errorMsg);
        return;
      }

      // Check if already started
      const started = courseProgress?.sections.find((s) => s.sectionId === sectionId);
      if (started && started.startTime > BigInt(0)) {
        console.log("[useProgress] Section already started");
        return;
      }

      setIsStarting(true);
      setError(null);

      try {
        console.log(`[useProgress] Starting section ${sectionId}`);

        // Prepare transaction
        const transaction = await prepareStartSectionTransaction(courseId, sectionId);

        // Send transaction
        sendTransaction(transaction, {
          onSuccess: async (result) => {
            console.log(`[useProgress] Section ${sectionId} started!`);
            // Refresh progress after successful start
            await fetchProgress();
          },
          onError: (error) => {
            console.error("[useProgress] Start section error:", error);
            const errorMsg =
              error instanceof Error ? error.message : "Transaction failed";
            setError(errorMsg);
          },
        });
      } catch (err) {
        console.error("[useProgress] Start section preparation error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Failed to prepare transaction";
        setError(errorMsg);
      } finally {
        setIsStarting(false);
      }
    },
    [account, courseId, courseProgress, sendTransaction, fetchProgress]
  );

  // ============================================================================
  // COMPLETE SECTION
  // ============================================================================

  const completeSection = useCallback(
    async (sectionId: bigint) => {
      if (!account?.address) {
        const errorMsg = "Please connect your wallet first";
        setError(errorMsg);
        console.error("[useProgress]", errorMsg);
        return;
      }

      // Check if already completed
      const section = courseProgress?.sections.find((s) => s.sectionId === sectionId);
      if (section?.isCompleted) {
        console.log("[useProgress] Section already completed");
        return;
      }

      // Check if started
      if (!section || section.startTime === BigInt(0)) {
        const errorMsg = "Section must be started before completing";
        setError(errorMsg);
        console.error("[useProgress]", errorMsg);
        return;
      }

      setIsCompleting(true);
      setError(null);

      try {
        console.log(`[useProgress] Completing section ${sectionId}`);

        // Prepare transaction
        const transaction = await prepareCompleteSectionTransaction(
          courseId,
          sectionId
        );

        // Send transaction
        sendTransaction(transaction, {
          onSuccess: async (result) => {
            console.log(`[useProgress] Section ${sectionId} completed!`);
            // Refresh progress after successful completion
            await fetchProgress();
          },
          onError: (error) => {
            console.error("[useProgress] Complete section error:", error);
            const errorMsg =
              error instanceof Error ? error.message : "Transaction failed";
            setError(errorMsg);
          },
        });
      } catch (err) {
        console.error("[useProgress] Complete section preparation error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Failed to prepare transaction";
        setError(errorMsg);
      } finally {
        setIsCompleting(false);
      }
    },
    [account, courseId, courseProgress, sendTransaction, fetchProgress]
  );

  // ============================================================================
  // RESET PROGRESS
  // ============================================================================

  const resetProgress = useCallback(async () => {
    if (!account?.address) {
      const errorMsg = "Please connect your wallet first";
      setError(errorMsg);
      console.error("[useProgress]", errorMsg);
      return;
    }

    // Confirm action (component should handle this)
    setIsResetting(true);
    setError(null);

    try {
      console.log(`[useProgress] Resetting progress for course ${courseId}`);

      // Prepare transaction
      const transaction = await prepareResetProgressTransaction(courseId);

      // Send transaction
      sendTransaction(transaction, {
        onSuccess: async (result) => {
          console.log(`[useProgress] Progress reset!`);
          // Refresh progress after successful reset
          await fetchProgress();
        },
        onError: (error) => {
          console.error("[useProgress] Reset progress error:", error);
          const errorMsg =
            error instanceof Error ? error.message : "Transaction failed";
          setError(errorMsg);
        },
      });
    } catch (err) {
      console.error("[useProgress] Reset progress preparation error:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to prepare transaction";
      setError(errorMsg);
    } finally {
      setIsResetting(false);
    }
  }, [account, courseId, sendTransaction, fetchProgress]);

  // ============================================================================
  // SECTION HELPERS
  // ============================================================================

  const isSectionCompletedHelper = useCallback(
    (sectionId: bigint): boolean => {
      const section = courseProgress?.sections.find((s) => s.sectionId === sectionId);
      return section?.isCompleted ?? false;
    },
    [courseProgress]
  );

  const isSectionStartedHelper = useCallback(
    (sectionId: bigint): boolean => {
      const section = courseProgress?.sections.find((s) => s.sectionId === sectionId);
      return section ? section.startTime > BigInt(0) : false;
    },
    [courseProgress]
  );

  const getSectionDurationHelper = useCallback(
    (sectionId: bigint): string | null => {
      const section = sectionsDetail.find((s) => s.sectionId === sectionId);
      return section?.durationFormatted ?? null;
    },
    [sectionsDetail]
  );

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const completionPercentage = courseProgress?.completionPercentage ?? 0;
  const completedSections = courseProgress?.completedSections ?? 0;
  const totalSections = courseProgress?.totalSections ?? 0;
  const isFullyCompleted = courseProgress?.isFullyCompleted ?? false;
  const lastActivityTime = courseProgress?.lastActivityTime ?? BigInt(0);

  const lastActivityFormatted =
    lastActivityTime > BigInt(0) ? formatRelativeTime(lastActivityTime) : null;

  const estimatedTimeFormatted = formatDuration(estimatedTimeRemaining);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Course Progress
    courseProgress,
    completionPercentage,
    completedSections,
    totalSections,
    isFullyCompleted,
    lastActivityTime,
    lastActivityFormatted,

    // Section Details
    sectionsDetail,
    nextIncompleteSection,

    // Estimates
    estimatedTimeRemaining,
    estimatedTimeFormatted,

    // Transactions
    startSection,
    completeSection,
    resetProgress,
    refreshProgress: fetchProgress,

    // Helpers
    isSectionCompleted: isSectionCompletedHelper,
    isSectionStarted: isSectionStartedHelper,
    getSectionDuration: getSectionDurationHelper,

    // Loading
    loading,
    isStarting,
    isCompleting,
    isResetting,

    // Errors
    error,
  };
}

// ============================================================================
// COMPANION HOOKS
// ============================================================================

/**
 * Simplified hook for read-only progress checking
 *
 * @example
 * ```typescript
 * function CourseCard({ courseId }) {
 *   const { completionPercentage, isCompleted } = useProgressStatus(courseId);
 *   return (
 *     <Card>
 *       <ProgressBar value={completionPercentage} />
 *       {isCompleted && <Badge>Completed</Badge>}
 *     </Card>
 *   );
 * }
 * ```
 */
export function useProgressStatus(courseId: bigint) {
  const {
    completionPercentage,
    completedSections,
    totalSections,
    isFullyCompleted,
    loading,
    error,
  } = useProgress(courseId);

  return {
    completionPercentage,
    completedSections,
    totalSections,
    isCompleted: isFullyCompleted,
    loading,
    error,
  };
}

/**
 * Hook for section-specific progress
 *
 * @example
 * ```typescript
 * function SectionPlayer({ courseId, sectionId }) {
 *   const {
 *     isCompleted,
 *     isStarted,
 *     duration,
 *     startSection,
 *     completeSection
 *   } = useSectionProgress(courseId, sectionId);
 *
 *   useEffect(() => {
 *     if (!isStarted) startSection();
 *   }, []);
 *
 *   return (
 *     <div>
 *       <VideoPlayer onEnd={completeSection} />
 *       {isCompleted && <CheckIcon />}
 *       {duration && <p>Completed in: {duration}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSectionProgress(courseId: bigint, sectionId: bigint) {
  const {
    startSection: startSectionFn,
    completeSection: completeSectionFn,
    isSectionCompleted,
    isSectionStarted,
    getSectionDuration,
    loading,
    error,
  } = useProgress(courseId);

  const isCompleted = isSectionCompleted(sectionId);
  const isStarted = isSectionStarted(sectionId);
  const duration = getSectionDuration(sectionId);

  const startSection = useCallback(() => {
    startSectionFn(sectionId);
  }, [startSectionFn, sectionId]);

  const completeSection = useCallback(() => {
    completeSectionFn(sectionId);
  }, [completeSectionFn, sectionId]);

  return {
    isCompleted,
    isStarted,
    duration,
    startSection,
    completeSection,
    loading,
    error,
  };
}

/**
 * Hook for checking progress across multiple courses
 *
 * @example
 * ```typescript
 * function Dashboard() {
 *   const enrolledCourses = [1n, 2n, 3n];
 *   const { coursesProgress, overallCompletion } = useMultipleProgress(enrolledCourses);
 *
 *   return (
 *     <div>
 *       <h2>Overall Progress: {overallCompletion}%</h2>
 *       {coursesProgress.map(progress => (
 *         <CourseProgressCard key={progress.courseId} progress={progress} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMultipleProgress(courseIds: bigint[]) {
  const account = useActiveAccount();
  const [coursesProgress, setCoursesProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.address || courseIds.length === 0) {
      setCoursesProgress([]);
      setLoading(false);
      return;
    }

    const fetchAllProgress = async () => {
      setLoading(true);
      setError(null);

      try {
        const progressPromises = courseIds.map((courseId) =>
          getCourseProgress(account.address, courseId)
        );

        const results = await Promise.all(progressPromises);
        setCoursesProgress(results);
      } catch (err) {
        console.error("[useMultipleProgress] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch progress");
      } finally {
        setLoading(false);
      }
    };

    fetchAllProgress();
  }, [account?.address, courseIds]);

  // Calculate overall completion
  const overallCompletion =
    coursesProgress.length > 0
      ? coursesProgress.reduce((sum, p) => sum + p.completionPercentage, 0) /
        coursesProgress.length
      : 0;

  return {
    coursesProgress,
    overallCompletion: Math.round(overallCompletion * 100) / 100,
    loading,
    error,
  };
}
