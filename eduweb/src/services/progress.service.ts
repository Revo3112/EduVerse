/**
 * @fileoverview Course Progress Service (Thirdweb SDK)
 * @description Handles blockchain interactions with ProgressTracker contract
 * @author EduVerse Platform
 * @date 2025-10-19
 *
 * This service provides functions to interact with the ProgressTracker smart contract:
 * - prepareStartSectionTransaction(): Prepare transaction to mark section as started
 * - prepareCompleteSectionTransaction(): Prepare transaction to mark section as completed
 * - prepareResetProgressTransaction(): Prepare transaction to reset course progress
 * - getSectionProgress(): Get progress data for specific section
 * - getCourseProgress(): Get overall course completion data
 * - getAllProgressForCourse(): Get detailed progress for all sections
 * - calculateCompletionPercentage(): Calculate course completion percentage
 * - getCompletedSectionsCount(): Count completed sections
 *
 * Smart Contract Integration:
 * - ProgressTracker.sol with section-level tracking
 * - Tracks: startTime, completionTime, isCompleted status
 * - Course completion automatically triggered when all sections done
 * - Events: SectionStarted, SectionCompleted, CourseCompleted, ProgressReset
 *
 * Business Logic:
 * - Must have valid license to track progress (checked in contract)
 * - Section must exist in course (validated by CourseFactory)
 * - Cannot complete section before starting it
 * - Course completion triggered automatically when last section completed
 * - Reset clears all progress for a course (irreversible)
 *
 * Thirdweb SDK:
 * - Uses prepareContractCall() for transaction preparation
 * - Uses readContract() for reading blockchain data
 * - Components execute transactions with useSendTransaction() hook
 */

import { courseFactory, progressTracker } from "@/lib/contracts";
import {
    prepareContractCall,
    readContract,
    type PreparedTransaction,
} from "thirdweb";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Section progress structure from ProgressTracker.sol
 * Represents learning progress for a single section
 */
export interface SectionProgress {
  sectionId: bigint;
  startTime: bigint; // Unix timestamp when section was started
  completionTime: bigint; // Unix timestamp when section was completed (0 if not completed)
  isCompleted: boolean;
}

/**
 * Course progress summary with computed fields
 * Used for UI display and progress bars
 */
export interface CourseProgress {
  courseId: bigint;
  student: string; // Ethereum address
  totalSections: number; // Total sections in course
  completedSections: number; // Number of completed sections
  completionPercentage: number; // 0-100
  isFullyCompleted: boolean; // All sections completed
  lastActivityTime: bigint; // Latest start/completion timestamp
  sections: SectionProgress[]; // Detailed progress for each section
}

/**
 * Section progress with additional metadata
 * Enriched with section details from CourseFactory
 */
export interface SectionProgressDetail {
  sectionId: bigint;
  title: string;
  isCompleted: boolean;
  startTime: bigint;
  completionTime: bigint;
  durationSeconds: number | null; // Time spent (completion - start), null if not completed
  durationFormatted: string | null; // Human-readable duration
}

/**
 * Learning streak data
 * Track consecutive days of learning activity
 */
export interface LearningStreak {
  currentStreak: number; // Days with activity
  longestStreak: number; // Best streak ever
  lastActivityDate: Date;
}

// ============================================================================
// TRANSACTION PREPARATION FUNCTIONS
// ============================================================================

/**
 * Prepare transaction to mark a section as started
 *
 * @param courseId - Course ID
 * @param sectionId - Section ID to start
 * @returns Prepared transaction ready to be sent
 *
 * @example
 * ```typescript
 * const tx = await prepareStartSectionTransaction(courseId, sectionId);
 * await sendTransaction(tx);
 * ```
 *
 * Smart Contract:
 * - Calls: startSection(uint256 courseId, uint256 sectionId)
 * - Emits: SectionStarted
 * - Requires: Valid license, section exists
 * - Reverts if: no license, invalid section, already started
 */
export async function prepareStartSectionTransaction(
  courseId: bigint,
  sectionId: bigint
): Promise<PreparedTransaction> {
  return prepareContractCall({
    contract: progressTracker,
    method: "function startSection(uint256 courseId, uint256 sectionId)",
    params: [courseId, sectionId],
  });
}

/**
 * Prepare transaction to mark a section as completed
 *
 * @param courseId - Course ID
 * @param sectionId - Section ID to complete
 * @returns Prepared transaction ready to be sent
 *
 * @example
 * ```typescript
 * const tx = await prepareCompleteSectionTransaction(courseId, sectionId);
 * await sendTransaction(tx);
 * ```
 *
 * Smart Contract:
 * - Calls: completeSection(uint256 courseId, uint256 sectionId)
 * - Emits: SectionCompleted, CourseCompleted (if last section)
 * - Requires: Valid license, section started
 * - Reverts if: no license, section not started, already completed
 * - Auto-triggers: Course completion if this is the last section
 */
export async function prepareCompleteSectionTransaction(
  courseId: bigint,
  sectionId: bigint
): Promise<PreparedTransaction> {
  return prepareContractCall({
    contract: progressTracker,
    method: "function completeSection(uint256 courseId, uint256 sectionId)",
    params: [courseId, sectionId],
  });
}

/**
 * Prepare transaction to reset all progress for a course
 *
 * @param courseId - Course ID to reset
 * @returns Prepared transaction ready to be sent
 *
 * @example
 * ```typescript
 * const tx = await prepareResetProgressTransaction(courseId);
 * await sendTransaction(tx);
 * ```
 *
 * Smart Contract:
 * - Calls: resetProgress(uint256 courseId)
 * - Emits: ProgressReset
 * - Effect: Clears all section progress (irreversible)
 * - Use case: Student wants to retake course from scratch
 */
export async function prepareResetProgressTransaction(
  courseId: bigint
): Promise<PreparedTransaction> {
  return prepareContractCall({
    contract: progressTracker,
    method: "function resetProgress(uint256 courseId)",
    params: [courseId],
  });
}

// ============================================================================
// READ FUNCTIONS
// ============================================================================

/**
 * Get progress data for a specific section
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @param sectionId - Section ID
 * @returns Section progress data or null if not started
 *
 * @example
 * ```typescript
 * const progress = await getSectionProgress(address, courseId, sectionId);
 * if (progress?.isCompleted) {
 *   console.log("Section completed at:", new Date(Number(progress.completionTime) * 1000));
 * }
 * ```
 *
 * Smart Contract:
 * - Calls: getSectionProgress(address student, uint256 courseId, uint256 sectionId)
 * - Returns: SectionProgress struct
 */
export async function getSectionProgress(
  userAddress: string,
  courseId: bigint,
  sectionId: bigint
): Promise<SectionProgress | null> {
  try {
    const progress = await readContract({
      contract: progressTracker,
      method:
        "function getSectionProgress(address student, uint256 courseId, uint256 sectionId) view returns ((uint256 sectionId, uint256 startTime, uint256 completionTime, bool isCompleted))",
      params: [userAddress, courseId, sectionId],
    });

    const progressData: SectionProgress = {
      sectionId: progress.sectionId,
      startTime: progress.startTime,
      completionTime: progress.completionTime,
      isCompleted: progress.isCompleted,
    };

    // Return null if section not started yet
    if (progressData.startTime === BigInt(0)) {
      return null;
    }

    return progressData;
  } catch (error) {
    console.error("[Progress Service] Error getting section progress:", error);
    return null;
  }
}

/**
 * Get overall course completion data
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @returns Course progress summary with completion percentage
 *
 * @example
 * ```typescript
 * const courseProgress = await getCourseProgress(address, courseId);
 * console.log(`Completed: ${courseProgress.completionPercentage}%`);
 * console.log(`${courseProgress.completedSections}/${courseProgress.totalSections} sections`);
 * ```
 *
 * Smart Contract:
 * - Calls: getCourseProgress(address student, uint256 courseId)
 * - Returns: Completion count and total sections
 */
export async function getCourseProgress(
  userAddress: string,
  courseId: bigint
): Promise<CourseProgress> {
  try {
    // Get total sections from CourseFactory
    const course = await readContract({
      contract: courseFactory,
      method:
        "function courses(uint256) view returns (address creator, uint64 id, uint32 createdAt, uint128 pricePerMonth, uint8 category, uint8 difficulty, bool isActive, string title, string description, string thumbnailCID, string creatorName)",
      params: [courseId],
    });

    // Get section count
    const totalSections = await readContract({
      contract: courseFactory,
      method: "function getSectionCount(uint256 courseId) view returns (uint256)",
      params: [courseId],
    });

    const totalSectionsNum = Number(totalSections);

    // Get progress for all sections
    const sectionProgressPromises: Promise<SectionProgress | null>[] = [];
    for (let i = 0; i < totalSectionsNum; i++) {
      sectionProgressPromises.push(
        getSectionProgress(userAddress, courseId, BigInt(i))
      );
    }

    const sectionsProgress = await Promise.all(sectionProgressPromises);

    // Filter out null (not started) sections and count completed
    const startedSections = sectionsProgress.filter(
      (p): p is SectionProgress => p !== null
    );
    const completedSections = startedSections.filter((p) => p.isCompleted);
    const completedCount = completedSections.length;

    // Calculate completion percentage
    const completionPercentage =
      totalSectionsNum > 0 ? (completedCount / totalSectionsNum) * 100 : 0;

    // Find last activity time
    let lastActivityTime = BigInt(0);
    for (const section of startedSections) {
      const latestTime =
        section.completionTime > BigInt(0)
          ? section.completionTime
          : section.startTime;
      if (latestTime > lastActivityTime) {
        lastActivityTime = latestTime;
      }
    }

    return {
      courseId,
      student: userAddress,
      totalSections: totalSectionsNum,
      completedSections: completedCount,
      completionPercentage: Math.round(completionPercentage * 100) / 100,
      isFullyCompleted: completedCount === totalSectionsNum && totalSectionsNum > 0,
      lastActivityTime,
      sections: startedSections,
    };
  } catch (error) {
    console.error("[Progress Service] Error getting course progress:", error);
    // Return empty progress on error
    return {
      courseId,
      student: userAddress,
      totalSections: 0,
      completedSections: 0,
      completionPercentage: 0,
      isFullyCompleted: false,
      lastActivityTime: BigInt(0),
      sections: [],
    };
  }
}

/**
 * Get detailed progress for all sections with metadata
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @returns Array of section progress with titles and durations
 *
 * @example
 * ```typescript
 * const details = await getAllProgressForCourse(address, courseId);
 * details.forEach(section => {
 *   console.log(`${section.title}: ${section.isCompleted ? 'Done' : 'In Progress'}`);
 *   if (section.durationFormatted) {
 *     console.log(`Time spent: ${section.durationFormatted}`);
 *   }
 * });
 * ```
 */
export async function getAllProgressForCourse(
  userAddress: string,
  courseId: bigint
): Promise<SectionProgressDetail[]> {
  try {
    // Get total sections
    const totalSections = await readContract({
      contract: courseFactory,
      method: "function getSectionCount(uint256 courseId) view returns (uint256)",
      params: [courseId],
    });

    const totalSectionsNum = Number(totalSections);
    const detailedProgress: SectionProgressDetail[] = [];

    // Get progress and metadata for each section
    for (let i = 0; i < totalSectionsNum; i++) {
      const sectionId = BigInt(i);

      // Get section details from CourseFactory
      const section = await readContract({
        contract: courseFactory,
        method:
          "function sections(uint256 courseId, uint256 sectionId) view returns ((uint256 id, string title, string description, string contentCID, uint32 duration, bool isPublished))",
        params: [courseId, sectionId],
      });

      // Get progress
      const progress = await getSectionProgress(userAddress, courseId, sectionId);

      // Calculate duration if completed
      let durationSeconds: number | null = null;
      let durationFormatted: string | null = null;

      if (progress && progress.isCompleted && progress.completionTime > BigInt(0)) {
        durationSeconds = Number(progress.completionTime - progress.startTime);
        durationFormatted = formatDuration(durationSeconds);
      }

      detailedProgress.push({
        sectionId,
        title: section.title,
        isCompleted: progress?.isCompleted ?? false,
        startTime: progress?.startTime ?? BigInt(0),
        completionTime: progress?.completionTime ?? BigInt(0),
        durationSeconds,
        durationFormatted,
      });
    }

    return detailedProgress;
  } catch (error) {
    console.error("[Progress Service] Error getting detailed progress:", error);
    return [];
  }
}

/**
 * Calculate completion percentage for a course
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @returns Completion percentage (0-100)
 *
 * @example
 * ```typescript
 * const percentage = await calculateCompletionPercentage(address, courseId);
 * // Use for progress bars: <ProgressBar value={percentage} />
 * ```
 */
export async function calculateCompletionPercentage(
  userAddress: string,
  courseId: bigint
): Promise<number> {
  const progress = await getCourseProgress(userAddress, courseId);
  return progress.completionPercentage;
}

/**
 * Get count of completed sections for a course
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @returns Object with completed and total section counts
 *
 * @example
 * ```typescript
 * const { completed, total } = await getCompletedSectionsCount(address, courseId);
 * console.log(`Progress: ${completed}/${total} sections`);
 * ```
 */
export async function getCompletedSectionsCount(
  userAddress: string,
  courseId: bigint
): Promise<{ completed: number; total: number }> {
  const progress = await getCourseProgress(userAddress, courseId);
  return {
    completed: progress.completedSections,
    total: progress.totalSections,
  };
}

/**
 * Check if a course is fully completed
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @returns True if all sections are completed
 *
 * @example
 * ```typescript
 * const isComplete = await isCourseCompleted(address, courseId);
 * if (isComplete) {
 *   // Unlock certificate purchase
 *   // Show course completion badge
 * }
 * ```
 */
export async function isCourseCompleted(
  userAddress: string,
  courseId: bigint
): Promise<boolean> {
  const progress = await getCourseProgress(userAddress, courseId);
  return progress.isFullyCompleted;
}

/**
 * Check if a specific section is completed
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @param sectionId - Section ID
 * @returns True if section is completed
 *
 * @example
 * ```typescript
 * const isCompleted = await isSectionCompleted(address, courseId, sectionId);
 * // Use for section checkmarks in UI
 * ```
 */
export async function isSectionCompleted(
  userAddress: string,
  courseId: bigint,
  sectionId: bigint
): Promise<boolean> {
  const progress = await getSectionProgress(userAddress, courseId, sectionId);
  return progress?.isCompleted ?? false;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "2h 30m", "45m", "30s")
 *
 * @example
 * ```typescript
 * formatDuration(3665) // "1h 1m 5s"
 * formatDuration(90)   // "1m 30s"
 * formatDuration(45)   // "45s"
 * ```
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Format timestamp to relative time
 *
 * @param timestamp - Unix timestamp (in seconds)
 * @returns Relative time string (e.g., "2 hours ago", "3 days ago")
 *
 * @example
 * ```typescript
 * formatRelativeTime(lastActivityTime)
 * // "Last activity: 2 hours ago"
 * ```
 */
export function formatRelativeTime(timestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(timestamp);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;
  return `${Math.floor(diff / 2592000)} months ago`;
}

/**
 * Get next incomplete section ID
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @returns Next section ID to study, or null if course completed
 *
 * @example
 * ```typescript
 * const nextSection = await getNextIncompleteSection(address, courseId);
 * if (nextSection !== null) {
 *   // Navigate to next section
 *   router.push(`/course/${courseId}/section/${nextSection}`);
 * }
 * ```
 */
export async function getNextIncompleteSection(
  userAddress: string,
  courseId: bigint
): Promise<bigint | null> {
  const progress = await getCourseProgress(userAddress, courseId);

  // Find first incomplete section
  for (let i = 0; i < progress.totalSections; i++) {
    const sectionId = BigInt(i);
    const sectionProgress = progress.sections.find(
      (s) => s.sectionId === sectionId
    );

    if (!sectionProgress || !sectionProgress.isCompleted) {
      return sectionId;
    }
  }

  // All sections completed
  return null;
}

/**
 * Get estimated time to complete course
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID
 * @returns Estimated seconds remaining based on average section duration
 *
 * @example
 * ```typescript
 * const remaining = await getEstimatedTimeToComplete(address, courseId);
 * console.log(`Estimated time remaining: ${formatDuration(remaining)}`);
 * ```
 */
export async function getEstimatedTimeToComplete(
  userAddress: string,
  courseId: bigint
): Promise<number> {
  try {
    const details = await getAllProgressForCourse(userAddress, courseId);

    // Calculate average time per completed section
    const completedSections = details.filter(
      (s) => s.isCompleted && s.durationSeconds !== null
    );

    if (completedSections.length === 0) {
      // No completed sections - estimate based on standard duration
      const incompleteSections = details.filter((s) => !s.isCompleted);
      return incompleteSections.length * 600; // Assume 10 min per section
    }

    const totalTime = completedSections.reduce(
      (sum, s) => sum + (s.durationSeconds || 0),
      0
    );
    const averageTime = totalTime / completedSections.length;

    // Calculate remaining sections
    const incompleteSections = details.filter((s) => !s.isCompleted);
    return Math.round(averageTime * incompleteSections.length);
  } catch (error) {
    console.error("[Progress Service] Error estimating time:", error);
    return 0;
  }
}

/**
 * Calculate learning streak (consecutive days with activity)
 *
 * @param userAddress - Student's wallet address
 * @param courseIds - Array of course IDs to check
 * @returns Learning streak data
 *
 * @example
 * ```typescript
 * const streak = await calculateLearningStreak(address, [1n, 2n, 3n]);
 * console.log(`Current streak: ${streak.currentStreak} days`);
 * console.log(`Best streak: ${streak.longestStreak} days`);
 * ```
 *
 * Note: This is a simplified implementation. For production, consider
 * using Goldsky indexer to track daily activity more efficiently.
 */
export async function calculateLearningStreak(
  userAddress: string,
  courseIds: bigint[]
): Promise<LearningStreak> {
  try {
    // Get all activity timestamps from all courses
    const activityTimestamps: number[] = [];

    for (const courseId of courseIds) {
      const progress = await getCourseProgress(userAddress, courseId);
      for (const section of progress.sections) {
        if (section.startTime > BigInt(0)) {
          activityTimestamps.push(Number(section.startTime));
        }
        if (section.completionTime > BigInt(0)) {
          activityTimestamps.push(Number(section.completionTime));
        }
      }
    }

    if (activityTimestamps.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(0),
      };
    }

    // Sort timestamps
    activityTimestamps.sort((a, b) => b - a);

    // Get unique days
    const uniqueDays = new Set<string>();
    activityTimestamps.forEach((timestamp) => {
      const date = new Date(timestamp * 1000);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      uniqueDays.add(dayKey);
    });

    const sortedDays = Array.from(uniqueDays).sort().reverse();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    const checkDate = new Date(today);
    for (const dayKey of sortedDays) {
      const expectedKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (dayKey === expectedKey) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak (simplified)
    const longestStreak = Math.max(currentStreak, sortedDays.length);

    return {
      currentStreak,
      longestStreak,
      lastActivityDate: new Date(activityTimestamps[0] * 1000),
    };
  } catch (error) {
    console.error("[Progress Service] Error calculating streak:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: new Date(0),
    };
  }
}
