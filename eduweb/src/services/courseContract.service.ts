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

import { courseFactory, courseLicense } from "@/lib/contracts";
import {
  prepareContractCall,
  readContract,
  type PreparedTransaction,
} from "thirdweb";

// ============================================================================
// TYPES
// ============================================================================

// Enum mappings matching CourseFactory.sol
export enum CourseCategory {
  Programming = 0,
  Design = 1,
  Business = 2,
  Marketing = 3,
  DataScience = 4,
  Finance = 5,
  Healthcare = 6,
  Language = 7,
  Arts = 8,
  Mathematics = 9,
  Science = 10,
  Engineering = 11,
  Technology = 12,
  Education = 13,
  Psychology = 14,
  Culinary = 15,
  PersonalDevelopment = 16,
  Legal = 17,
  Sports = 18,
  Other = 19,
}

export enum CourseDifficulty {
  Beginner = 0,
  Intermediate = 1,
  Advanced = 2,
}

export interface CourseMetadata {
  title: string;
  description: string;
  thumbnailCID: string; // Plain CID without ipfs:// prefix
  creatorName: string;
  category: string; // String from frontend, will be converted to enum
  difficulty: string; // String from frontend, will be converted to enum
}

export interface SectionData {
  title: string;
  contentCID: string; // Livepeer playback ID (16-char hex) stored as section.contentCID in smart contract
  duration: number; // Duration in seconds (60-10800) - validated range by smart contract
}

export interface CreateCourseParams {
  metadata: CourseMetadata;
  sections: SectionData[];
  pricePerMonth: string; // Price in ETH (e.g., "0.01")
}

export interface BatchAddSectionsParams {
  courseId: bigint;
  sections: SectionData[];
}

export interface AddSectionParams {
  courseId: bigint;
  title: string;
  contentCID: string;
  duration: number;
}

export interface UpdateCourseParams {
  courseId: bigint;
  metadata: CourseMetadata;
  pricePerMonth: string; // Price in ETH (e.g., "0.01")
  isActive: boolean;
}

export interface DeleteCourseParams {
  courseId: bigint;
}

export interface MintLicenseParams {
  courseId: bigint;
  durationMonths: bigint;
  priceInEth: string; // Total price in ETH (e.g., "0.01")
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
 * Convert category string to enum number
 */
export function categoryToEnum(category: string): number {
  const mapping: Record<string, number> = {
    Programming: CourseCategory.Programming,
    Design: CourseCategory.Design,
    Business: CourseCategory.Business,
    Marketing: CourseCategory.Marketing,
    DataScience: CourseCategory.DataScience,
    Finance: CourseCategory.Finance,
    Healthcare: CourseCategory.Healthcare,
    Language: CourseCategory.Language,
    Arts: CourseCategory.Arts,
    Mathematics: CourseCategory.Mathematics,
    Science: CourseCategory.Science,
    Engineering: CourseCategory.Engineering,
    Technology: CourseCategory.Technology,
    Education: CourseCategory.Education,
    Psychology: CourseCategory.Psychology,
    Culinary: CourseCategory.Culinary,
    PersonalDevelopment: CourseCategory.PersonalDevelopment,
    Legal: CourseCategory.Legal,
    Sports: CourseCategory.Sports,
    Other: CourseCategory.Other,
  };

  if (!(category in mapping)) {
    throw new Error(`Invalid category: ${category}`);
  }

  return mapping[category];
}

/**
 * Convert difficulty string to enum number
 */
export function difficultyToEnum(difficulty: string): number {
  const mapping: Record<string, number> = {
    Beginner: CourseDifficulty.Beginner,
    Intermediate: CourseDifficulty.Intermediate,
    Advanced: CourseDifficulty.Advanced,
  };

  if (!(difficulty in mapping)) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }

  return mapping[difficulty];
}

/**
 * Validate section duration meets smart contract requirements
 */
export function validateDuration(duration: number): {
  valid: boolean;
  error?: string;
} {
  if (duration < 60) {
    return {
      valid: false,
      error: "Duration must be at least 60 seconds (1 minute)",
    };
  }
  if (duration > 10800) {
    return {
      valid: false,
      error: "Duration must not exceed 10800 seconds (3 hours)",
    };
  }
  return { valid: true };
}

/**
 * Validate IPFS CID format
 */
export function validateCID(cid: string): {
  valid: boolean;
  error?: string;
} {
  if (!cid || cid.trim().length === 0) {
    return { valid: false, error: "CID cannot be empty" };
  }

  const trimmed = cid.trim();

  if (trimmed.length > 100) {
    return { valid: false, error: "CID is too long (maximum 100 characters)" };
  }

  const livepeerPlaybackIdRegex = /^[a-f0-9]{16}$/;
  if (livepeerPlaybackIdRegex.test(trimmed)) {
    return { valid: true };
  }

  if (trimmed.length < 46) {
    return {
      valid: false,
      error:
        "CID is too short (minimum 46 characters for IPFS CID or 16 for Livepeer playback ID)",
    };
  }

  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const cidV1Regex = /^[a-z0-9]{59}$/;
  const cidV1Base32Regex = /^b[a-z2-7]{58}$/;

  if (
    !cidV0Regex.test(trimmed) &&
    !cidV1Regex.test(trimmed) &&
    !cidV1Base32Regex.test(trimmed)
  ) {
    return {
      valid: false,
      error: "Invalid IPFS CID or Livepeer playback ID format",
    };
  }

  return { valid: true };
}

/**
 * Validate all sections have valid durations and CIDs
 */
export function validateSections(sections: SectionData[]): {
  valid: boolean;
  error?: string;
} {
  if (sections.length === 0) {
    return { valid: false, error: "At least one section is required" };
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (!section.title || section.title.trim().length === 0) {
      return { valid: false, error: `Section ${i + 1}: Title is required` };
    }

    if (!section.contentCID || section.contentCID.trim().length === 0) {
      return {
        valid: false,
        error: `Section ${i + 1}: Content CID is required`,
      };
    }

    const cidCheck = validateCID(section.contentCID);
    if (!cidCheck.valid) {
      return {
        valid: false,
        error: `Section ${i + 1}: ${cidCheck.error}`,
      };
    }

    const durationCheck = validateDuration(section.duration);
    if (!durationCheck.valid) {
      return {
        valid: false,
        error: `Section ${i + 1}: ${durationCheck.error}`,
      };
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
      throw new Error("Invalid ETH amount");
    }

    const MAX_ETH = 1000000;
    if (eth > MAX_ETH) {
      throw new Error(`ETH amount exceeds maximum (${MAX_ETH} ETH)`);
    }

    const weiString = (eth * 1e18).toFixed(0);
    const weiValue = BigInt(weiString);

    const MAX_UINT256 = BigInt(
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    );
    if (weiValue > MAX_UINT256) {
      throw new Error("Amount exceeds uint256 max value");
    }

    return weiValue;
  } catch (error) {
    console.error("[Contract Service] Failed to convert ETH to wei:", error);
    throw error;
  }
}

/**
 * Convert wei to ETH string
 */
export function weiToEth(weiAmount: bigint): string {
  try {
    const weiStr = weiAmount.toString();
    const len = weiStr.length;

    if (len <= 18) {
      const padded = weiStr.padStart(18, "0");
      const eth = `0.${padded}`;
      return eth.replace(/\.?0+$/, "") || "0";
    }

    const intPart = weiStr.slice(0, len - 18);
    const decPart = weiStr.slice(len - 18);
    const eth = `${intPart}.${decPart}`;
    return eth.replace(/\.?0+$/, "");
  } catch (error) {
    console.error("[Contract Service] Failed to convert wei to ETH:", error);
    return "0";
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
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Preparing course creation transaction...");
  console.log("[Contract Service] Title:", params.metadata.title);
  console.log("[Contract Service] Sections:", params.sections.length);
  console.log("[Contract Service] Price:", params.pricePerMonth, "ETH");

  if (!params.metadata.title?.trim()) {
    throw new Error("Course title is required");
  }

  if (!params.metadata.description?.trim()) {
    throw new Error("Course description is required");
  }

  const thumbnailCidCheck = validateCID(params.metadata.thumbnailCID);
  if (!thumbnailCidCheck.valid) {
    throw new Error(`Invalid thumbnail CID: ${thumbnailCidCheck.error}`);
  }

  if (!params.metadata.creatorName?.trim()) {
    throw new Error("Creator name is required");
  }

  const priceInWei = ethToWei(params.pricePerMonth);

  const categoryEnum = categoryToEnum(params.metadata.category);
  const difficultyEnum = difficultyToEnum(params.metadata.difficulty);

  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function createCourse(string title, string description, string thumbnailCID, string creatorName, uint256 pricePerMonth, uint8 category, uint8 difficulty) returns (uint256)",
    params: [
      params.metadata.title.trim(),
      params.metadata.description.trim(),
      params.metadata.thumbnailCID.trim(),
      params.metadata.creatorName.trim(),
      priceInWei,
      categoryEnum,
      difficultyEnum,
    ],
  });

  console.log("[Contract Service] ✅ Transaction prepared successfully");
  console.log(
    "[Contract Service] Category:",
    params.metadata.category,
    "→",
    categoryEnum
  );
  console.log(
    "[Contract Service] Difficulty:",
    params.metadata.difficulty,
    "→",
    difficultyEnum
  );
  return transaction;
}

/**
 * Prepare transaction to batch add sections to a course
 * Handles up to 50 sections per transaction (smart contract limit)
 *
 * For 100 sections, call this function twice:
 * - First batch: sections 0-49
 * - Second batch: sections 50-99
 *
 * @param params - Batch section parameters
 * @returns Prepared transaction or throws error if validation fails
 *
 * @example
 * ```tsx
 * const { mutate: sendTx } = useSendTransaction();
 *
 * // For 100 sections, split into 2 batches
 * const batch1 = sections.slice(0, 50);
 * const batch2 = sections.slice(50, 100);
 *
 * // Send first batch
 * const tx1 = prepareBatchAddSectionsTransaction({ courseId: 1n, sections: batch1 });
 * sendTx(tx1, {
 *   onSuccess: () => {
 *     // Send second batch
 *     const tx2 = prepareBatchAddSectionsTransaction({ courseId: 1n, sections: batch2 });
 *     sendTx(tx2);
 *   }
 * });
 * ```
 */
export function prepareBatchAddSectionsTransaction(
  params: BatchAddSectionsParams
): PreparedTransaction {
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Preparing batch add sections transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);
  console.log("[Contract Service] Sections:", params.sections.length);

  if (params.sections.length === 0) {
    throw new Error("At least one section is required");
  }

  if (params.sections.length > 50) {
    throw new Error(
      `Batch limit exceeded: ${params.sections.length} sections (max 50 per transaction). Split into multiple batches.`
    );
  }

  const validation = validateSections(params.sections);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  const sectionsForBlockchain = params.sections.map((section) => {
    if (!section.title?.trim()) {
      throw new Error("Section title cannot be empty");
    }
    if (!section.contentCID?.trim()) {
      throw new Error("Section content CID cannot be empty");
    }
    return {
      title: section.title.trim(),
      contentCID: section.contentCID.trim(),
      duration: BigInt(section.duration),
    };
  });

  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function batchAddSections(uint256 courseId, (string title, string contentCID, uint256 duration)[] sectionsData) returns (bool success)",
    params: [params.courseId, sectionsForBlockchain],
  });

  console.log("[Contract Service] ✅ Batch transaction prepared successfully");
  console.log("[Contract Service] Sections to add:", params.sections.length);
  return transaction;
}

/**
 * Prepare transaction to add a section to an existing course
 * Returns a PreparedTransaction for execution with useSendTransaction() hook
 *
```

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
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Preparing add section transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);
  console.log("[Contract Service] Section Title:", params.title);
  console.log("[Contract Service] Duration:", params.duration, "seconds");

  // Validate duration
  const durationCheck = validateDuration(params.duration);
  if (!durationCheck.valid) {
    throw new Error(`Duration validation failed: ${durationCheck.error}`);
  }

  // Validate required fields
  if (!params.title || params.title.trim().length === 0) {
    throw new Error("Section title is required");
  }

  if (!params.contentCID || params.contentCID.trim().length === 0) {
    throw new Error("Content CID is required");
  }

  // Prepare transaction
  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function addCourseSection(uint256,string,string,uint256) returns (bool)",
    params: [
      params.courseId,
      params.title,
      params.contentCID,
      BigInt(params.duration),
    ],
  });

  console.log("[Contract Service] ✅ Transaction prepared successfully");
  return transaction;
}

/**
 * Prepare a transaction to update an existing course
 *
 * @param params - Update course parameters including courseId, metadata, price, and isActive status
 * @returns Prepared transaction for use with useSendTransaction
 *
 * @example
 * ```tsx
 * const transaction = prepareUpdateCourseTransaction({
 *   courseId: 1n,
 *   metadata: {
 *     title: "Updated Course Title",
 *     description: "Updated description",
 *     thumbnailCID: "QmXXX...",
 *     creatorName: "Instructor Name",
 *     category: "Programming",
 *     difficulty: "Intermediate"
 *   },
 *   pricePerMonth: "0.02",
 *   isActive: true
 * });
 * sendTx(transaction);
 * ```
 */
export function prepareUpdateCourseTransaction(
  params: UpdateCourseParams
): PreparedTransaction {
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Preparing update course transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);
  console.log("[Contract Service] Title:", params.metadata.title);
  console.log("[Contract Service] Price:", params.pricePerMonth, "ETH");
  console.log("[Contract Service] Is Active:", params.isActive);

  // Convert category and difficulty to enums
  const categoryEnum = categoryToEnum(params.metadata.category);
  const difficultyEnum = difficultyToEnum(params.metadata.difficulty);

  console.log(
    "[Contract Service] Category:",
    params.metadata.category,
    "→",
    categoryEnum
  );
  console.log(
    "[Contract Service] Difficulty:",
    params.metadata.difficulty,
    "→",
    difficultyEnum
  );

  // Convert ETH to wei
  const priceInWei = ethToWei(params.pricePerMonth);
  console.log("[Contract Service] Price in wei:", priceInWei.toString());

  // Validate price
  const MAX_PRICE_WEI = BigInt("1000000000000000000"); // 1 ETH
  if (priceInWei === BigInt(0)) {
    throw new Error("Price cannot be zero");
  }
  if (priceInWei > MAX_PRICE_WEI) {
    throw new Error(
      `Price exceeds maximum of 1 ETH (provided: ${params.pricePerMonth} ETH)`
    );
  }

  // Prepare transaction
  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function updateCourse(uint256 courseId, string title, string description, string thumbnailCID, string creatorName, uint256 pricePerMonth, bool isActive, uint8 category, uint8 difficulty)",
    params: [
      params.courseId,
      params.metadata.title,
      params.metadata.description,
      params.metadata.thumbnailCID,
      params.metadata.creatorName,
      priceInWei,
      params.isActive,
      categoryEnum,
      difficultyEnum,
    ],
  });

  console.log("[Contract Service] ✅ Update transaction prepared successfully");
  return transaction;
}

/**
 * Prepare a transaction to delete a course (soft delete - marks as inactive)
 *
 * @param params - Delete course parameters (courseId)
 * @returns Prepared transaction for use with useSendTransaction
 *
 * @example
 * ```tsx
 * const transaction = prepareDeleteCourseTransaction({
 *   courseId: 1n
 * });
 * sendTx(transaction);
 * ```
 */
export function prepareDeleteCourseTransaction(
  params: DeleteCourseParams
): PreparedTransaction {
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Preparing delete course transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);
  console.log(
    "[Contract Service] NOTE: This is a soft delete (marks as inactive)"
  );

  // Prepare transaction
  const transaction = prepareContractCall({
    contract: courseFactory,
    method: "function deleteCourse(uint256 courseId)",
    params: [params.courseId],
  });

  console.log("[Contract Service] ✅ Delete transaction prepared successfully");
  return transaction;
}

/**
 * Prepare transaction to mint a course license (student purchases course)
 * This is the MAIN function for students to buy course access
 *
 * @param params - License parameters (courseId, duration, price)
 * @returns Prepared transaction with payable value
 *
 * @example
 * ```tsx
 * const { mutate: sendTransaction } = useSendTransaction();
 *
 * const transaction = prepareMintLicenseTransaction({
 *   courseId: 1n,
 *   durationMonths: 1n,
 *   priceInEth: "0.01"
 * });
 *
 * sendTransaction(transaction, {
 *   onSuccess: (result) => {
 *     console.log("License minted! Token ID:", result);
 *   }
 * });
 * ```
 */
export function prepareMintLicenseTransaction(
  params: MintLicenseParams
): PreparedTransaction {
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Preparing mint license transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);
  console.log("[Contract Service] Duration:", params.durationMonths, "months");
  console.log("[Contract Service] Price:", params.priceInEth, "ETH");

  if (params.durationMonths < BigInt(1)) {
    throw new Error("Duration must be at least 1 month");
  }

  const MAX_DURATION = BigInt(36);
  if (params.durationMonths > MAX_DURATION) {
    throw new Error(`Duration cannot exceed ${MAX_DURATION} months`);
  }

  const priceInWei = ethToWei(params.priceInEth);

  if (priceInWei === BigInt(0)) {
    throw new Error("Price must be greater than 0");
  }

  const transaction = prepareContractCall({
    contract: courseLicense,
    method:
      "function mintLicense(uint256 courseId, uint256 durationMonths) payable returns (uint256)",
    params: [params.courseId, params.durationMonths],
    value: priceInWei,
  });

  console.log("[Contract Service] ✅ Mint license transaction prepared");
  console.log("[Contract Service] Value (wei):", priceInWei.toString());
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
export async function getCourseDetails(
  courseId: bigint
): Promise<Course | null> {
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Fetching course details...");
  console.log("[Contract Service] Course ID:", courseId);

  try {
    const result = (await readContract({
      contract: courseFactory,
      method:
        "function getCourse(uint256) view returns (string,string,string,address,string,uint256,string,string,bool,uint256,uint256)",
      params: [courseId],
    })) as readonly [
      string,
      string,
      string,
      string,
      string,
      bigint,
      string,
      string,
      boolean,
      bigint,
      bigint
    ];

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

    console.log("[Contract Service] ✅ Course details retrieved");
    console.log("[Contract Service] Title:", course.title);
    console.log("[Contract Service] Creator:", course.creatorName);

    return course;
  } catch (error) {
    console.error("[Contract Service] Failed to get course details:", error);
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
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Fetching section details...");
  console.log("[Contract Service] Course ID:", courseId);
  console.log("[Contract Service] Section ID:", sectionId);

  try {
    const result = (await readContract({
      contract: courseFactory,
      method:
        "function getCourseSection(uint256,uint256) view returns (string,string,uint256,bool)",
      params: [courseId, sectionId],
    })) as readonly [string, string, bigint, boolean];

    // Transform result to Section interface
    const section: Section = {
      title: result[0],
      contentCID: result[1],
      duration: Number(result[2]),
      isActive: result[3],
    };

    console.log("[Contract Service] ✅ Section details retrieved");
    console.log("[Contract Service] Title:", section.title);
    console.log("[Contract Service] Duration:", section.duration, "seconds");
    console.log("[Contract Service] CID:", section.contentCID);

    return section;
  } catch (error) {
    console.error("[Contract Service] Failed to get section details:", error);
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
