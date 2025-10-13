/**
 * @fileoverview Course Smart Contract Service (Thirdweb SDK)
 * @description Handles blockchain interactions with CourseFactory contract using Thirdweb
 * @author EduVerse Platform
 * @date 2025-01-13
 *
 * This service provides functions to interact with the CourseFactory smart contract:
 * - prepareCreateCourseTransaction(): Prepare transaction to create a new course
 * - prepareAddSectionTransaction(): Prepare transaction to add a section
 * - getCourseDetails(): Retrieve course information
 * - getSectionDetails(): Retrieve section information with duration
 *
 * Smart Contract Integration:
 * - CourseFactory.sol with duration support in SectionAdded events
 * - Events emit contentCID and duration for Goldsky indexer
 * - Duration validated in range 60-10800 seconds (1 minute - 3 hours)
 *
 * Thirdweb SDK:
 * - Uses prepareContractCall() for transaction preparation
 * - Uses readContract() for reading blockchain data
 * - Components execute transactions with useSendTransaction() hook
 */

import { courseFactory } from "@/lib/contracts";
import { prepareContractCall, readContract, type PreparedTransaction } from "thirdweb";

// ============================================================================
// TYPES
// ============================================================================

export interface CourseMetadata {
  title: string;
  description: string;
  thumbnailCID: string; // Plain CID without ipfs:// prefix
  creatorName: string;
  category: string;
  difficulty: string;
}

export interface SectionData {
  title: string;
  description: string;
  contentCID: string; // Video CID from Pinata
  duration: number; // Duration in seconds (60-10800)
}

export interface CreateCourseParams {
  metadata: CourseMetadata;
  sections: SectionData[];
  pricePerMonth: string; // Price in ETH (e.g., "0.01")
}

export interface AddSectionParams {
  courseId: bigint;
  title: string;
  contentCID: string;
  duration: number;
}

export interface Course {
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  creatorName: string;
  pricePerMonth: bigint;
  category: string;
  difficulty: string;
  isActive: boolean;
  totalRevenue: bigint;
  createdAt: bigint;
}

export interface Section {
  title: string;
  contentCID: string;
  duration: number;
  isActive: boolean;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate section duration meets smart contract requirements
 */
export function validateDuration(duration: number): { valid: boolean; error?: string } {
  if (duration < 60) {
    return { valid: false, error: 'Duration must be at least 60 seconds (1 minute)' };
  }
  if (duration > 10800) {
    return { valid: false, error: 'Duration must not exceed 10800 seconds (3 hours)' };
  }
  return { valid: true };
}

/**
 * Validate all sections have valid durations
 */
export function validateSections(sections: SectionData[]): { valid: boolean; error?: string } {
  if (sections.length === 0) {
    return { valid: false, error: 'At least one section is required' };
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (!section.title || section.title.trim().length === 0) {
      return { valid: false, error: `Section ${i + 1}: Title is required` };
    }

    if (!section.contentCID || section.contentCID.trim().length === 0) {
      return { valid: false, error: `Section ${i + 1}: Content CID is required` };
    }

    const durationCheck = validateDuration(section.duration);
    if (!durationCheck.valid) {
      return { valid: false, error: `Section ${i + 1}: ${durationCheck.error}` };
    }
  }

  return { valid: true };
}

/**
 * Convert ETH string to wei (as bigint)
 */
export function ethToWei(ethAmount: string): bigint {
  try {
    const eth = parseFloat(ethAmount);
    if (isNaN(eth) || eth < 0) {
      throw new Error('Invalid ETH amount');
    }
    // Convert to wei: multiply by 10^18
    return BigInt(Math.floor(eth * 1e18));
  } catch (error) {
    console.error('[Contract Service] Failed to convert ETH to wei:', error);
    throw error;
  }
}

/**
 * Convert wei to ETH string
 */
export function weiToEth(weiAmount: bigint): string {
  try {
    // Convert wei to ETH: divide by 10^18
    const eth = Number(weiAmount) / 1e18;
    return eth.toFixed(18).replace(/\.?0+$/, ''); // Remove trailing zeros
  } catch (error) {
    console.error('[Contract Service] Failed to convert wei to ETH:', error);
    return '0';
  }
}

// ============================================================================
// TRANSACTION PREPARATION FUNCTIONS
// ============================================================================

/**
 * Prepare transaction to create a new course on the blockchain
 * Returns a PreparedTransaction for execution with useSendTransaction() hook
 *
 * @param params - Course creation parameters
 * @returns Prepared transaction or throws error if validation fails
 *
 * @example
 * ```tsx
 * const { mutate: sendTx } = useSendTransaction();
 * const transaction = prepareCreateCourseTransaction(params);
 * sendTx(transaction, {
 *   onSuccess: (result) => console.log('Course created!', result),
 *   onError: (error) => console.error('Failed:', error),
 * });
 * ```
 */
export function prepareCreateCourseTransaction(
  params: CreateCourseParams
): PreparedTransaction {
  console.log('[Contract Service] ========================================');
  console.log('[Contract Service] Preparing course creation transaction...');
  console.log('[Contract Service] Title:', params.metadata.title);
  console.log('[Contract Service] Sections:', params.sections.length);
  console.log('[Contract Service] Price:', params.pricePerMonth, 'ETH');

  // Validate sections
  const validation = validateSections(params.sections);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // Convert price to wei
  const priceInWei = ethToWei(params.pricePerMonth);

  // Prepare transaction
  const transaction = prepareContractCall({
    contract: courseFactory,
    method: "function createCourse(string title, string description, string thumbnailCID, string creatorName, uint256 pricePerMonth, string category, string difficulty) returns (uint256)",
    params: [
      params.metadata.title,
      params.metadata.description,
      params.metadata.thumbnailCID,
      params.metadata.creatorName,
      priceInWei,
      params.metadata.category,
      params.metadata.difficulty,
    ],
  });

  console.log('[Contract Service] ✅ Transaction prepared successfully');
  return transaction;
}

/**
 * Prepare transaction to add a section to an existing course
 * Returns a PreparedTransaction for execution with useSendTransaction() hook
 *
 * @param params - Section parameters including courseId, title, contentCID, and duration
 * @returns Prepared transaction or throws error if validation fails
 *
 * @example
 * ```tsx
 * const { mutate: sendTx } = useSendTransaction();
 * const transaction = prepareAddSectionTransaction({
 *   courseId: 1n,
 *   title: "Introduction",
 *   contentCID: "QmXXX...",
 *   duration: 300, // 5 minutes
 * });
 * sendTx(transaction);
 * ```
 */
export function prepareAddSectionTransaction(
  params: AddSectionParams
): PreparedTransaction {
  console.log('[Contract Service] ========================================');
  console.log('[Contract Service] Preparing add section transaction...');
  console.log('[Contract Service] Course ID:', params.courseId);
  console.log('[Contract Service] Section Title:', params.title);
  console.log('[Contract Service] Duration:', params.duration, 'seconds');

  // Validate duration
  const durationCheck = validateDuration(params.duration);
  if (!durationCheck.valid) {
    throw new Error(`Duration validation failed: ${durationCheck.error}`);
  }

  // Validate required fields
  if (!params.title || params.title.trim().length === 0) {
    throw new Error('Section title is required');
  }

  if (!params.contentCID || params.contentCID.trim().length === 0) {
    throw new Error('Content CID is required');
  }

  // Prepare transaction
  const transaction = prepareContractCall({
    contract: courseFactory,
    method: "function addCourseSection(uint256 courseId, string title, string contentCID, uint256 duration) returns (uint256)",
    params: [
      params.courseId,
      params.title,
      params.contentCID,
      BigInt(params.duration),
    ],
  });

  console.log('[Contract Service] ✅ Transaction prepared successfully');
  return transaction;
}

// ============================================================================
// READ FUNCTIONS
// ============================================================================

/**
 * Get course details from the blockchain
 *
 * @param courseId - The course ID to retrieve
 * @returns Course details or null if not found
 *
 * @example
 * ```tsx
 * const course = await getCourseDetails(1n);
 * console.log('Course title:', course?.title);
 * console.log('Price:', weiToEth(course?.pricePerMonth));
 * ```
 */
export async function getCourseDetails(courseId: bigint): Promise<Course | null> {
  console.log('[Contract Service] ========================================');
  console.log('[Contract Service] Fetching course details...');
  console.log('[Contract Service] Course ID:', courseId);

  try {
    // @ts-expect-error - readContract types are strict, but method signature provides the ABI
    const result: readonly [string, string, string, string, string, bigint, string, string, boolean, bigint, bigint] = await readContract({
      contract: courseFactory,
      method: "function getCourse(uint256 courseId) view returns (tuple(string title, string description, string thumbnailCID, address creator, string creatorName, uint256 pricePerMonth, string category, string difficulty, bool isActive, uint256 totalRevenue, uint256 createdAt))",
      params: [courseId],
    });

    // Transform result to Course interface
    const course: Course = {
      title: result[0],
      description: result[1],
      thumbnailCID: result[2],
      creator: result[3],
      creatorName: result[4],
      pricePerMonth: result[5],
      category: result[6],
      difficulty: result[7],
      isActive: result[8],
      totalRevenue: result[9],
      createdAt: result[10],
    };

    console.log('[Contract Service] ✅ Course details retrieved');
    console.log('[Contract Service] Title:', course.title);
    console.log('[Contract Service] Creator:', course.creatorName);

    return course;
  } catch (error) {
    console.error('[Contract Service] Failed to get course details:', error);
    return null;
  }
}

/**
 * Get section details from the blockchain
 *
 * @param courseId - The course ID
 * @param sectionId - The section ID
 * @returns Section details or null if not found
 *
 * @example
 * ```tsx
 * const section = await getSectionDetails(1n, 0n);
 * console.log('Section title:', section?.title);
 * console.log('Duration:', section?.duration, 'seconds');
 * console.log('Video CID:', section?.contentCID);
 * ```
 */
export async function getSectionDetails(
  courseId: bigint,
  sectionId: bigint
): Promise<Section | null> {
  console.log('[Contract Service] ========================================');
  console.log('[Contract Service] Fetching section details...');
  console.log('[Contract Service] Course ID:', courseId);
  console.log('[Contract Service] Section ID:', sectionId);

  try {
    // @ts-expect-error - readContract types are strict, but method signature provides the ABI
    const result: readonly [string, string, bigint, boolean] = await readContract({
      contract: courseFactory,
      method: "function getCourseSection(uint256 courseId, uint256 sectionId) view returns (tuple(string title, string contentCID, uint256 duration, bool isActive))",
      params: [courseId, sectionId],
    });

    // Transform result to Section interface
    const section: Section = {
      title: result[0],
      contentCID: result[1],
      duration: Number(result[2]),
      isActive: result[3],
    };

    console.log('[Contract Service] ✅ Section details retrieved');
    console.log('[Contract Service] Title:', section.title);
    console.log('[Contract Service] Duration:', section.duration, 'seconds');
    console.log('[Contract Service] CID:', section.contentCID);

    return section;
  } catch (error) {
    console.error('[Contract Service] Failed to get section details:', error);
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format duration from seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "5m 30s" or "1h 15m")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Calculate total course duration from sections
 *
 * @param sections - Array of section data
 * @returns Total duration in seconds
 */
export function calculateTotalDuration(sections: SectionData[]): number {
  return sections.reduce((total, section) => total + section.duration, 0);
}
