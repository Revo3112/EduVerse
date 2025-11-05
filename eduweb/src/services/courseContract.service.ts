// courseContract.service.ts - Course Smart Contract Interaction Service
// Uses thirdweb SDK exclusively for all blockchain interactions
// Updated: No CID length restrictions as per smart contract changes

import {
  prepareContractCall,
  readContract,
  type PreparedTransaction,
} from "thirdweb";
import { courseFactory } from "@/lib/contracts";

/**
 * ========================================
 * ENUMS - Match smart contract exactly
 * ========================================
 */

/**
 * Course categories matching CourseFactory.sol enum
 * IMPORTANT: Order and values must match smart contract exactly
 */
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

interface CourseMetadata {
  title: string;
  description: string;
  thumbnailCID: string;
  creatorName: string;
  category: string;
  difficulty: string;
}

interface SectionData {
  title: string;
  contentCID: string;
  duration: number;
}

interface CreateCourseParams {
  metadata: CourseMetadata;
  pricePerMonth: string;
}

interface BatchAddSectionsParams {
  courseId: bigint;
  sections: SectionData[];
}

interface AddSectionParams {
  courseId: bigint;
  title: string;
  contentCID: string;
  duration: number;
}

interface UpdateCourseParams {
  courseId: bigint;
  metadata: CourseMetadata;
  pricePerMonth: string;
  isActive: boolean;
}

interface DeleteCourseParams {
  courseId: bigint;
}

interface MintLicenseParams {
  courseId: bigint;
  durationMonths: number;
  priceInWei: bigint;
}

interface Course {
  title: string;
  description: string;
  thumbnailCID: string;
  creator: string;
  creatorName: string;
  pricePerMonth: bigint;
  category: number;
  difficulty: number;
  isActive: boolean;
  totalRevenue: bigint;
  createdAt: bigint;
}

interface Section {
  title: string;
  contentCID: string;
  duration: bigint;
  isActive: boolean;
}

/**
 * Convert category string to enum value
 */
function categoryToEnum(category: string): CourseCategory {
  const mapping: Record<string, CourseCategory> = {
    Programming: CourseCategory.Programming,
    Design: CourseCategory.Design,
    Business: CourseCategory.Business,
    Marketing: CourseCategory.Marketing,
    "Data Science": CourseCategory.DataScience,
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
    "Personal Development": CourseCategory.PersonalDevelopment,
    Legal: CourseCategory.Legal,
    Sports: CourseCategory.Sports,
    Other: CourseCategory.Other,
  };

  return mapping[category] ?? CourseCategory.Other;
}

/**
 * Convert difficulty string to enum value
 */
function difficultyToEnum(difficulty: string): CourseDifficulty {
  const mapping: Record<string, CourseDifficulty> = {
    Beginner: CourseDifficulty.Beginner,
    Intermediate: CourseDifficulty.Intermediate,
    Advanced: CourseDifficulty.Advanced,
  };
  return mapping[difficulty] ?? CourseDifficulty.Beginner;
}

/**
 * Convert enum value to category string
 */
export function enumToCategory(category: number): string {
  const mapping: Record<number, string> = {
    [CourseCategory.Programming]: "Programming",
    [CourseCategory.Design]: "Design",
    [CourseCategory.Business]: "Business",
    [CourseCategory.Marketing]: "Marketing",
    [CourseCategory.DataScience]: "Data Science",
    [CourseCategory.Finance]: "Finance",
    [CourseCategory.Healthcare]: "Healthcare",
    [CourseCategory.Language]: "Language",
    [CourseCategory.Arts]: "Arts",
    [CourseCategory.Mathematics]: "Mathematics",
    [CourseCategory.Science]: "Science",
    [CourseCategory.Engineering]: "Engineering",
    [CourseCategory.Technology]: "Technology",
    [CourseCategory.Education]: "Education",
    [CourseCategory.Psychology]: "Psychology",
    [CourseCategory.Culinary]: "Culinary",
    [CourseCategory.PersonalDevelopment]: "Personal Development",
    [CourseCategory.Legal]: "Legal",
    [CourseCategory.Sports]: "Sports",
    [CourseCategory.Other]: "Other",
  };
  return mapping[category] ?? "Other";
}

/**
 * Convert enum value to difficulty string
 */
export function enumToDifficulty(difficulty: number): string {
  const mapping: Record<number, string> = {
    [CourseDifficulty.Beginner]: "Beginner",
    [CourseDifficulty.Intermediate]: "Intermediate",
    [CourseDifficulty.Advanced]: "Advanced",
  };
  return mapping[difficulty] ?? "Beginner";
}

/**
 * Validate duration is within allowed range
 */
export function validateDuration(durationSeconds: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    return { valid: false, error: "Duration must be a positive integer" };
  }

  if (durationSeconds < 60) {
    return {
      valid: false,
      error: "Duration must be at least 60 seconds (1 minute)",
    };
  }

  if (durationSeconds > 10800) {
    return {
      valid: false,
      error: "Duration cannot exceed 10800 seconds (3 hours)",
    };
  }

  return { valid: true };
}

/**
 * Validate CID format
 * NO MINIMUM LENGTH - Smart contract accepts any non-empty string
 * Only validates: non-empty and max length
 */
export function validateCID(cid: string): {
  valid: boolean;
  error?: string;
} {
  if (!cid || cid.trim().length === 0) {
    return { valid: false, error: "CID cannot be empty" };
  }

  const trimmed = cid.trim();

  // Only check maximum length for gas optimization
  if (trimmed.length > 2000) {
    return { valid: false, error: "CID is too long (maximum 2000 characters)" };
  }

  // NO MINIMUM LENGTH CHECK - Smart contract updated to accept any length
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

  if (sections.length > 50) {
    return {
      valid: false,
      error:
        "Batch exceeds maximum limit of 50 sections. Split into multiple batches.",
    };
  }

  const titles = new Set<string>();

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (!section.title || section.title.trim().length === 0) {
      return { valid: false, error: `Section ${i + 1}: Title is required` };
    }

    const normalizedTitle = section.title.trim().toLowerCase();
    if (titles.has(normalizedTitle)) {
      return {
        valid: false,
        error: `Section ${i + 1}: Duplicate title "${section.title}"`,
      };
    }
    titles.add(normalizedTitle);

    if (!section.contentCID || section.contentCID.trim().length === 0) {
      return {
        valid: false,
        error: `Section ${i + 1}: Content CID is required`,
      };
    }

    // Validate CID (NO MINIMUM LENGTH)
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
 * Convert ETH to Wei with precision handling
 */
export function ethToWei(ethValue: string): bigint {
  const eth = parseFloat(ethValue);

  if (isNaN(eth) || eth < 0) {
    throw new Error(`Invalid ETH value: ${ethValue}`);
  }

  const MAX_ETH = 1000000;
  if (eth > MAX_ETH) {
    throw new Error(`ETH value too large: ${eth} (max: ${MAX_ETH})`);
  }

  const weiString = (eth * 1e18).toFixed(0);
  const weiValue = BigInt(weiString);

  const MAX_UINT256 = BigInt(
    "115792089237316195423570985008687907853269984665640564039457584007913129639935"
  );
  if (weiValue > MAX_UINT256) {
    throw new Error(`Wei value exceeds uint256 maximum: ${weiValue}`);
  }

  return weiValue;
}

/**
 * Convert Wei to ETH for display
 */
export function weiToEth(weiValue: bigint): string {
  const weiStr = weiValue.toString();
  const len = weiStr.length;

  if (len <= 18) {
    const padded = weiStr.padStart(18, "0");
    const eth = "0." + padded;
    return parseFloat(eth).toFixed(6);
  } else {
    const intPart = weiStr.slice(0, len - 18);
    const decPart = weiStr.slice(len - 18);
    const eth = intPart + "." + decPart;
    return parseFloat(eth).toFixed(6);
  }
}

/**
 * ========================================
 * TRANSACTION PREPARATION FUNCTIONS
 * ========================================
 */

/**
 * Prepare create course transaction
 * @param params Course creation parameters
 * @returns PreparedTransaction ready to send via thirdweb
 *
 * Smart Contract Signature:
 * function createCourse(
 *   string memory title,
 *   string memory description,
 *   string memory thumbnailCID,
 *   string memory creatorName,
 *   uint256 pricePerMonth,
 *   CourseCategory category,
 *   CourseDifficulty difficulty
 * ) external returns (uint256 courseId)
 */
export function prepareCreateCourseTransaction(
  params: CreateCourseParams
): PreparedTransaction {
  console.log("[Contract Service] ========================================");
  console.log("[Contract Service] Preparing create course transaction...");
  console.log("[Contract Service] Title:", params.metadata.title);
  console.log("[Contract Service] Creator:", params.metadata.creatorName);
  console.log("[Contract Service] Price:", params.pricePerMonth, "ETH");

  if (
    !params.metadata.thumbnailCID ||
    params.metadata.thumbnailCID.trim().length === 0
  ) {
    throw new Error("Thumbnail CID is required");
  }

  // Validate thumbnail CID (NO MINIMUM LENGTH)
  const thumbnailCidCheck = validateCID(params.metadata.thumbnailCID);
  if (!thumbnailCidCheck.valid) {
    throw new Error(thumbnailCidCheck.error);
  }

  const priceInWei = ethToWei(params.pricePerMonth);

  const categoryEnum = categoryToEnum(params.metadata.category);
  const difficultyEnum = difficultyToEnum(params.metadata.difficulty);

  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function createCourse(string title, string description, string thumbnailCID, string creatorName, uint256 pricePerMonth, uint8 category, uint8 difficulty) returns (uint256 courseId)",
    params: [
      params.metadata.title,
      params.metadata.description,
      params.metadata.thumbnailCID,
      params.metadata.creatorName,
      priceInWei,
      categoryEnum,
      difficultyEnum,
    ],
  });

  console.log("[Contract Service] ✅ Transaction prepared successfully");
  console.log(
    "[Contract Service] Category:",
    params.metadata.category,
    "->",
    categoryEnum
  );
  console.log(
    "[Contract Service] Difficulty:",
    params.metadata.difficulty,
    "->",
    difficultyEnum
  );
  console.log("[Contract Service] Price in Wei:", priceInWei.toString());
  console.log("[Contract Service] ========================================");

  return transaction;
}

/**
 * Prepare batch add sections transaction
 * @param params Batch section data
 * @returns PreparedTransaction ready to send via thirdweb
 *
 * Smart Contract Signature:
 * function batchAddSections(
 *   uint256 courseId,
 *   SectionData[] calldata sectionsData
 * ) external onlyCreator(courseId) courseExists(courseId) returns (bool success)
 *
 * struct SectionData {
 *   string title;
 *   string contentCID;
 *   uint256 duration;
 * }
 *
 * CRITICAL: This function handles the smart contract's batch limit of 50 sections.
 * For courses with >50 sections, the caller MUST split into multiple transactions.
 *
 * Gas Optimization Strategy:
 * - Batch size: 50 sections per transaction (smart contract limit)
 * - Sequential processing with receipt confirmation to prevent nonce conflicts
 * - Each batch must complete before next batch starts
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
 * Prepare add single section transaction
 * @param params Section data
 * @returns PreparedTransaction ready to send via thirdweb
 *
 * Smart Contract Signature:
 * function addCourseSection(
 *   uint256 courseId,
 *   string memory title,
 *   string memory contentCID,
 *   uint256 duration
 * ) external onlyCreator(courseId) courseExists(courseId)
 */
export function prepareAddSectionTransaction(
  params: AddSectionParams
): PreparedTransaction {
  console.log("[Contract Service] Preparing add section transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);
  console.log("[Contract Service] Section title:", params.title);

  if (!params.title || params.title.trim().length === 0) {
    throw new Error("Section title is required");
  }

  if (!params.contentCID || params.contentCID.trim().length === 0) {
    throw new Error("Content CID is required");
  }

  // Validate CID (NO MINIMUM LENGTH)
  const cidCheck = validateCID(params.contentCID);
  if (!cidCheck.valid) {
    throw new Error(cidCheck.error);
  }

  const durationCheck = validateDuration(params.duration);
  if (!durationCheck.valid) {
    throw new Error(durationCheck.error);
  }

  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function addCourseSection(uint256 courseId, string title, string contentCID, uint256 duration)",
    params: [
      params.courseId,
      params.title.trim(),
      params.contentCID.trim(),
      BigInt(params.duration),
    ],
  });

  console.log("[Contract Service] ✅ Add section transaction prepared");
  return transaction;
}

/**
 * Determine if batch upload should be used based on section count
 * @param sectionCount Number of sections to upload
 * @returns Strategy recommendation
 *
 * STRATEGY:
 * - 1 section: Use addCourseSection (sequential)
 * - 2-50 sections: Use batchAddSections (single transaction)
 * - 51-250 sections: Use batchAddSections (multiple batches of 50)
 * - 251+ sections: Use batchAddSections (multiple batches of 50)
 *
 * Gas Estimation:
 * - Single section: ~150,000 gas per section
 * - Batch (50 sections): ~7,000,000 gas total (~140,000 per section)
 * - Savings: ~10,000 gas per section when batching
 */
export function shouldUseBatchUpload(sections: SectionData[]): {
  shouldBatch: boolean;
  batches: SectionData[][];
  batchCount: number;
  strategy: string;
  estimatedGas: string;
  reasoning: string;
} {
  const BATCH_THRESHOLD = 1;
  const BATCH_SIZE = 50;
  const count = sections.length;

  // Strategy 1: Sequential for single section
  if (count <= BATCH_THRESHOLD) {
    return {
      shouldBatch: false,
      batches: [sections],
      batchCount: 1,
      strategy: "sequential",
      estimatedGas: "~150,000 gas",
      reasoning: "Single section - using sequential upload",
    };
  }

  // Strategy 2: Single batch (2-50 sections)
  if (count <= BATCH_SIZE) {
    return {
      shouldBatch: true,
      batches: [sections],
      batchCount: 1,
      strategy: "single-batch",
      estimatedGas: `~${(count * 140000).toLocaleString()} gas`,
      reasoning: `${count} sections - using single batch upload`,
    };
  }

  // Strategy 3: Multiple batches (51+ sections)
  const batches: SectionData[][] = [];
  for (let i = 0; i < count; i += BATCH_SIZE) {
    batches.push(sections.slice(i, i + BATCH_SIZE));
  }
  const batchCount = batches.length;

  const totalGasBatch = batchCount * 7000000;
  const totalGasSequential = count * 150000;

  return {
    shouldBatch: true,
    batches,
    batchCount,
    strategy: "multi-batch",
    estimatedGas: `~${totalGasBatch.toLocaleString()} gas (saves ~${(
      totalGasSequential - totalGasBatch
    ).toLocaleString()} gas)`,
    reasoning: `${count} sections split into ${batchCount} batches of ${BATCH_SIZE}. Significant gas savings vs sequential.`,
  };
}

/**
 * Prepare update course transaction
 * @param params Update parameters
 * @returns PreparedTransaction ready to send via thirdweb
 *
 * Smart Contract Signature:
 * function updateCourse(
 *   uint256 courseId,
 *   string memory title,
 *   string memory description,
 *   string memory thumbnailCID,
 *   string memory creatorName,
 *   uint256 pricePerMonth,
 *   bool isActive,
 *   CourseCategory category,
 *   CourseDifficulty difficulty
 * ) external onlyCreator(courseId) courseExists(courseId)
 */
export function prepareUpdateCourseTransaction(
  params: UpdateCourseParams
): PreparedTransaction {
  console.log("[Contract Service] Preparing update course transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);

  const categoryEnum = categoryToEnum(params.metadata.category);
  const difficultyEnum = difficultyToEnum(params.metadata.difficulty);

  if (!params.metadata.title || params.metadata.title.trim().length === 0) {
    throw new Error("Title is required");
  }

  if (
    !params.metadata.description ||
    params.metadata.description.trim().length === 0
  ) {
    throw new Error("Description is required");
  }

  if (
    !params.metadata.thumbnailCID ||
    params.metadata.thumbnailCID.trim().length === 0
  ) {
    throw new Error("Thumbnail CID is required");
  }

  const priceInWei = ethToWei(params.pricePerMonth);

  const MAX_PRICE_WEI = ethToWei("1000000");
  if (priceInWei > MAX_PRICE_WEI) {
    throw new Error(
      `Price too high: ${params.pricePerMonth} ETH (max: 1,000,000 ETH)`
    );
  }

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

  console.log("[Contract Service] ✅ Update transaction prepared");
  return transaction;
}

/**
 * Prepare delete course transaction
 * @param params Delete parameters
 * @returns PreparedTransaction ready to send via thirdweb
 */
export function prepareDeleteCourseTransaction(
  params: DeleteCourseParams
): PreparedTransaction {
  console.log("[Contract Service] Preparing delete course transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);

  const transaction = prepareContractCall({
    contract: courseFactory,
    method: "function deleteCourse(uint256 courseId)",
    params: [params.courseId],
  });

  return transaction;
}

/**
 * Prepare mint license transaction
 * @param params License mint parameters
 * @returns PreparedTransaction ready to send via thirdweb
 *
 * Smart Contract Signature:
 * function mintLicense(uint256 courseId, uint256 durationMonths) external payable
 */
export function prepareMintLicenseTransaction(
  params: MintLicenseParams
): PreparedTransaction {
  console.log("[Contract Service] Preparing mint license transaction...");
  console.log("[Contract Service] Course ID:", params.courseId);
  console.log("[Contract Service] Duration:", params.durationMonths, "months");
  console.log("[Contract Service] Price:", weiToEth(params.priceInWei), "ETH");

  if (params.durationMonths <= 0) {
    throw new Error("Duration must be positive");
  }

  const MAX_DURATION = 12;
  if (params.durationMonths > MAX_DURATION) {
    throw new Error(
      `Duration too long: ${params.durationMonths} (max: 12 months)`
    );
  }

  const priceInWei = params.priceInWei;

  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function mintLicense(uint256 courseId, uint256 durationMonths) payable",
    params: [params.courseId, BigInt(params.durationMonths)],
    value: priceInWei,
  });

  return transaction;
}

/**
 * ========================================
 * READ FUNCTIONS
 * ========================================
 */

/**
 * Get course details from blockchain
 * @param courseId Course ID
 * @returns Course data
 */
export async function getCourseDetails(courseId: bigint): Promise<Course> {
  console.log("[Contract Service] Fetching course details...");
  console.log("[Contract Service] Course ID:", courseId);

  const result = await readContract({
    contract: courseFactory,
    method:
      "function getCourse(uint256 courseId) view returns (string title, string description, string thumbnailCID, address creator, string creatorName, uint256 pricePerMonth, uint8 category, uint8 difficulty, bool isActive, uint256 totalRevenue, uint256 createdAt)",
    params: [courseId],
  });

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

  console.log("[Contract Service] ✅ Course details fetched");
  return course;
}

/**
 * Get section details from blockchain
 * @param courseId Course ID
 * @param sectionId Section ID
 * @returns Section data
 */
export async function getSectionDetails(
  courseId: bigint,
  sectionId: bigint
): Promise<Section> {
  console.log("[Contract Service] Fetching section details...");
  console.log("[Contract Service] Course ID:", courseId);
  console.log("[Contract Service] Section ID:", sectionId);

  const result = await readContract({
    contract: courseFactory,
    method:
      "function getCourseSection(uint256 courseId, uint256 sectionId) view returns (string title, string contentCID, uint256 duration, bool isActive)",
    params: [courseId, sectionId],
  });

  const section: Section = {
    title: result[0],
    contentCID: result[1],
    duration: result[2],
    isActive: result[3],
  };

  console.log("[Contract Service] ✅ Section details fetched");
  return section;
}

/**
 * ========================================
 * UTILITY FUNCTIONS
 * ========================================
 */

/**
 * Format duration in seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate total duration of all sections
 */
export function calculateTotalDuration(sections: SectionData[]): number {
  return sections.reduce((total, section) => total + section.duration, 0);
}

/**
 * Prepare transaction for updating a course section
 */
export function prepareUpdateSectionTransaction(params: {
  courseId: bigint;
  sectionId: bigint;
  title: string;
  contentCID: string;
  duration: number;
}) {
  const { courseId, sectionId, title, contentCID, duration } = params;

  const cidCheck = validateCID(contentCID);
  if (!cidCheck.valid) {
    throw new Error(cidCheck.error);
  }

  const durationCheck = validateDuration(duration);
  if (!durationCheck.valid) {
    throw new Error(durationCheck.error);
  }

  if (!title || title.trim().length === 0) {
    throw new Error("Section title is required");
  }

  if (title.length > 200) {
    throw new Error("Section title exceeds maximum length of 200 characters");
  }

  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function updateCourseSection(uint256 courseId, uint256 sectionId, string memory title, string memory contentCID, uint256 duration)",
    params: [
      courseId,
      sectionId,
      title.trim(),
      contentCID.trim(),
      BigInt(duration),
    ],
  });

  return transaction;
}

/**
 * Prepare transaction for deleting a course section
 */
export function prepareDeleteSectionTransaction(params: {
  courseId: bigint;
  sectionId: bigint;
}) {
  const { courseId, sectionId } = params;

  const transaction = prepareContractCall({
    contract: courseFactory,
    method: "function deleteCourseSection(uint256 courseId, uint256 sectionId)",
    params: [courseId, sectionId],
  });

  return transaction;
}

/**
 * Prepare transaction for moving/reordering a course section
 */
export function prepareMoveSectionTransaction(params: {
  courseId: bigint;
  fromIndex: bigint;
  toIndex: bigint;
}) {
  const { courseId, fromIndex, toIndex } = params;

  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function moveCourseSection(uint256 courseId, uint256 fromIndex, uint256 toIndex)",
    params: [courseId, fromIndex, toIndex],
  });

  return transaction;
}

/**
 * Prepare transaction for swapping two course sections
 */
export function prepareSwapSectionsTransaction(params: {
  courseId: bigint;
  indexA: bigint;
  indexB: bigint;
}) {
  const { courseId, indexA, indexB } = params;

  const transaction = prepareContractCall({
    contract: courseFactory,
    method:
      "function swapCourseSections(uint256 courseId, uint256 indexA, uint256 indexB)",
    params: [courseId, indexA, indexB],
  });

  return transaction;
}
