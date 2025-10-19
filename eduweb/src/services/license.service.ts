/**
 * @fileoverview Course License Service (Thirdweb SDK)
 * @description Handles blockchain interactions with CourseLicense contract
 * @author EduVerse Platform
 * @date 2025-10-19
 *
 * This service provides functions to interact with the CourseLicense smart contract:
 * - preparePurchaseLicenseTransaction(): Prepare transaction to purchase/mint license
 * - prepareRenewLicenseTransaction(): Prepare transaction to renew existing license
 * - checkLicenseStatus(): Check if user has valid (active & not expired) license
 * - getLicenseDetails(): Retrieve detailed license information
 * - calculateLicensePrice(): Calculate total price for license purchase/renewal
 * - formatLicenseExpiry(): Format expiry timestamp for UI display
 *
 * Smart Contract Integration:
 * - CourseLicense.sol with ERC-1155 soulbound NFT
 * - License duration in months (1-12 months typical)
 * - Revenue split between creator and platform (configurable fee %)
 * - Automatic expiry marking with checkAndMarkExpired()
 * - Events: LicenseMinted, LicenseRenewed, LicenseExpired, RevenueRecorded
 *
 * Business Logic:
 * - One license per (student, course) pair
 * - Soulbound (non-transferable) - maintains learning integrity
 * - Renewable even after expiry - allows continuing progress
 * - Price = coursePrice * durationMonths
 * - Platform fee deducted before creator revenue
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

/**
 * License structure from CourseLicense.sol
 * Represents an active or expired course access license
 */
export interface License {
  courseId: bigint;
  student: string; // Ethereum address
  durationLicense: bigint; // Duration in months
  expiryTimestamp: bigint; // Unix timestamp when license expires
  isActive: boolean; // False if expired or revoked
}

/**
 * License status with additional computed fields
 * Used for UI display and business logic
 */
export interface LicenseStatus {
  hasLicense: boolean; // Whether license exists
  isValid: boolean; // Whether license is active and not expired
  isExpired: boolean; // Whether license has passed expiry timestamp
  license: License | null; // Full license details if exists
  timeRemaining: number | null; // Seconds until expiry (null if expired/none)
  expiryDate: Date | null; // JavaScript Date object for expiry
}

/**
 * Price calculation result for license purchase/renewal
 */
export interface LicensePriceInfo {
  coursePrice: bigint; // Price per month from course
  durationMonths: number; // Number of months
  totalPrice: bigint; // coursePrice * durationMonths
  platformFee: bigint; // Platform's cut
  creatorRevenue: bigint; // Creator's cut after platform fee
  priceInEth: string; // Formatted ETH string for display
}

// ============================================================================
// LICENSE PURCHASE FUNCTIONS
// ============================================================================

/**
 * Prepare transaction to purchase/mint a new course license
 *
 * @param courseId - Course ID to purchase license for
 * @param durationMonths - License duration in months (1-12)
 * @param totalPrice - Total price in wei (coursePrice * durationMonths)
 * @returns Prepared transaction ready to be sent
 *
 * @example
 * ```typescript
 * const priceInfo = await calculateLicensePrice(courseId, 3);
 * const tx = await preparePurchaseLicenseTransaction(courseId, 3, priceInfo.totalPrice);
 * await sendTransaction(tx);
 * ```
 *
 * Smart Contract:
 * - Calls: mintLicense(uint256 courseId, uint256 durationMonths)
 * - Payable: msg.value must equal coursePrice * durationMonths
 * - Emits: LicenseMinted, RevenueRecorded
 * - Reverts if: already has active license, invalid duration, wrong payment
 */
export async function preparePurchaseLicenseTransaction(
  courseId: bigint,
  durationMonths: number,
  totalPrice: bigint
): Promise<PreparedTransaction> {
  if (durationMonths < 1 || durationMonths > 12) {
    throw new Error("License duration must be between 1 and 12 months");
  }

  return prepareContractCall({
    contract: courseLicense,
    method: "function mintLicense(uint256 courseId, uint256 durationMonths) payable",
    params: [courseId, BigInt(durationMonths)],
    value: totalPrice, // Payment in wei
  });
}

/**
 * Prepare transaction to renew an existing course license
 *
 * @param courseId - Course ID to renew license for
 * @param durationMonths - Additional months to add (1-12)
 * @param totalPrice - Total price in wei (coursePrice * durationMonths)
 * @returns Prepared transaction ready to be sent
 *
 * @example
 * ```typescript
 * // Renew for 6 more months
 * const priceInfo = await calculateLicensePrice(courseId, 6);
 * const tx = await prepareRenewLicenseTransaction(courseId, 6, priceInfo.totalPrice);
 * await sendTransaction(tx);
 * ```
 *
 * Smart Contract:
 * - Calls: renewLicense(uint256 courseId, uint256 durationMonths)
 * - Payable: msg.value must equal coursePrice * durationMonths
 * - Emits: LicenseRenewed, RevenueRecorded
 * - Extends expiry: if active, adds to current expiry; if expired, adds to now
 * - Reverts if: no existing license, invalid duration, wrong payment
 */
export async function prepareRenewLicenseTransaction(
  courseId: bigint,
  durationMonths: number,
  totalPrice: bigint
): Promise<PreparedTransaction> {
  if (durationMonths < 1 || durationMonths > 12) {
    throw new Error("Renewal duration must be between 1 and 12 months");
  }

  return prepareContractCall({
    contract: courseLicense,
    method: "function renewLicense(uint256 courseId, uint256 durationMonths) payable",
    params: [courseId, BigInt(durationMonths)],
    value: totalPrice, // Payment in wei
  });
}

// ============================================================================
// LICENSE STATUS FUNCTIONS
// ============================================================================

/**
 * Check if user has a valid (active and not expired) license for a course
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID to check
 * @returns True if license exists, is active, and not expired
 *
 * @example
 * ```typescript
 * const hasAccess = await checkLicenseStatus(address, courseId);
 * if (!hasAccess) {
 *   // Redirect to purchase page
 * }
 * ```
 *
 * Smart Contract:
 * - Calls: hasValidLicense(address student, uint256 courseId) view
 * - Checks: license exists, isActive == true, expiryTimestamp > block.timestamp
 */
export async function checkLicenseStatus(
  userAddress: string,
  courseId: bigint
): Promise<boolean> {
  try {
    const hasValid = await readContract({
      contract: courseLicense,
      method: "function hasValidLicense(address student, uint256 courseId) view returns (bool)",
      params: [userAddress, courseId],
    });

    return hasValid;
  } catch (error) {
    console.error("[License Service] Error checking license status:", error);
    return false;
  }
}

/**
 * Get detailed license information for a user and course
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID to query
 * @returns Full license details or null if no license exists
 *
 * @example
 * ```typescript
 * const license = await getLicenseDetails(address, courseId);
 * if (license) {
 *   console.log(`Expires at: ${new Date(Number(license.expiryTimestamp) * 1000)}`);
 * }
 * ```
 *
 * Smart Contract:
 * - Calls: getLicense(address student, uint256 courseId) view returns (License)
 * - Returns: License struct with all fields
 * - Returns empty struct if no license exists (check isActive to verify)
 */
export async function getLicenseDetails(
  userAddress: string,
  courseId: bigint
): Promise<License | null> {
  try {
    const license = await readContract({
      contract: courseLicense,
      method:
        "function getLicense(address student, uint256 courseId) view returns ((uint256 courseId, address student, uint256 durationLicense, uint256 expiryTimestamp, bool isActive))",
      params: [userAddress, courseId],
    });

    // Convert contract response to License interface
    const licenseData: License = {
      courseId: license.courseId,
      student: license.student,
      durationLicense: license.durationLicense,
      expiryTimestamp: license.expiryTimestamp,
      isActive: license.isActive,
    };

    // Return null if license doesn't exist (isActive will be false for non-existent)
    if (!licenseData.isActive && licenseData.expiryTimestamp === BigInt(0)) {
      return null;
    }

    return licenseData;
  } catch (error) {
    console.error("[License Service] Error getting license details:", error);
    return null;
  }
}

/**
 * Get comprehensive license status with computed fields
 *
 * @param userAddress - Student's wallet address
 * @param courseId - Course ID to query
 * @returns Detailed status including validity, expiry, time remaining
 *
 * @example
 * ```typescript
 * const status = await getLicenseStatus(address, courseId);
 * if (status.isExpired) {
 *   // Show renewal prompt
 * } else if (status.timeRemaining < 7 * 24 * 60 * 60) {
 *   // Show "Expiring soon" warning
 * }
 * ```
 */
export async function getLicenseStatus(
  userAddress: string,
  courseId: bigint
): Promise<LicenseStatus> {
  const license = await getLicenseDetails(userAddress, courseId);

  if (!license) {
    return {
      hasLicense: false,
      isValid: false,
      isExpired: false,
      license: null,
      timeRemaining: null,
      expiryDate: null,
    };
  }

  const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
  const expiryTimestamp = Number(license.expiryTimestamp);
  const isExpired = expiryTimestamp <= now;
  const timeRemaining = isExpired ? 0 : expiryTimestamp - now;

  return {
    hasLicense: true,
    isValid: license.isActive && !isExpired,
    isExpired,
    license,
    timeRemaining: isExpired ? null : timeRemaining,
    expiryDate: new Date(expiryTimestamp * 1000),
  };
}

// ============================================================================
// PRICE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate total price for license purchase or renewal
 *
 * @param courseId - Course ID to calculate price for
 * @param durationMonths - Number of months (1-12)
 * @returns Detailed price breakdown including platform fee and creator revenue
 *
 * @example
 * ```typescript
 * const priceInfo = await calculateLicensePrice(courseId, 3);
 * console.log(`Total: ${priceInfo.priceInEth} ETH`);
 * console.log(`Creator gets: ${formatEther(priceInfo.creatorRevenue)} ETH`);
 * ```
 *
 * Formula:
 * - totalPrice = coursePrice * durationMonths
 * - platformFee = totalPrice * platformFeePercentage / 100
 * - creatorRevenue = totalPrice - platformFee
 */
export async function calculateLicensePrice(
  courseId: bigint,
  durationMonths: number
): Promise<LicensePriceInfo> {
  if (durationMonths < 1 || durationMonths > 12) {
    throw new Error("Duration must be between 1 and 12 months");
  }

  try {
    // Get course details from CourseFactory to get price
    const course = await readContract({
      contract: courseFactory,
      method:
        "function courses(uint256) view returns (address creator, uint64 id, uint32 createdAt, uint128 pricePerMonth, uint8 category, uint8 difficulty, bool isActive, string title, string description, string thumbnailCID, string creatorName)",
      params: [courseId],
    });

    // Course is returned as tuple array, destructure to get pricePerMonth (index 3)
    const [creator, id, createdAt, pricePerMonth] = course;
    const coursePrice = pricePerMonth;
    const totalPrice = coursePrice * BigInt(durationMonths);

    // Get platform fee percentage from CourseLicense contract
    // Contract uses BASIS POINTS: 200 = 2%, divide by 10000
    let platformFeePercentage = BigInt(200); // Default 2% (200 basis points)
    try {
      platformFeePercentage = await readContract({
        contract: courseLicense,
        method: "function platformFeePercentage() view returns (uint256)",
        params: [],
      });
    } catch {
      // Use default if contract doesn't expose this (older versions)
      console.warn("[License Service] Using default platform fee: 2% (200 basis points)");
    }

    // Calculate fees using basis points (divide by 10000)
    const platformFee = (totalPrice * platformFeePercentage) / BigInt(10000);
    const creatorRevenue = totalPrice - platformFee;

    // Format for display (convert wei to ETH)
    const priceInEth = (Number(totalPrice) / 1e18).toFixed(6);

    return {
      coursePrice,
      durationMonths,
      totalPrice,
      platformFee,
      creatorRevenue,
      priceInEth,
    };
  } catch (error) {
    console.error("[License Service] Error calculating price:", error);
    throw new Error("Failed to calculate license price");
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format license expiry timestamp for UI display
 *
 * @param expiryTimestamp - Unix timestamp (in seconds)
 * @param format - Display format ('full' | 'short' | 'relative')
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatLicenseExpiry(1735689600, 'full')    // "January 1, 2025 at 12:00 AM"
 * formatLicenseExpiry(1735689600, 'short')   // "Jan 1, 2025"
 * formatLicenseExpiry(1735689600, 'relative') // "in 2 days" or "2 days ago"
 * ```
 */
export function formatLicenseExpiry(
  expiryTimestamp: bigint,
  format: "full" | "short" | "relative" = "full"
): string {
  const expiryDate = new Date(Number(expiryTimestamp) * 1000);

  if (format === "full") {
    return expiryDate.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (format === "short") {
    return expiryDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Relative format: "in 2 days" or "2 days ago"
  const now = Date.now();
  const diff = expiryDate.getTime() - now;
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);

  let relativeStr = "";
  if (months > 0) {
    relativeStr = `${months} month${months > 1 ? "s" : ""}`;
  } else if (days > 0) {
    relativeStr = `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    relativeStr = `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    relativeStr = `${minutes} minute${minutes > 1 ? "s" : ""}`;
  } else {
    relativeStr = `${seconds} second${seconds > 1 ? "s" : ""}`;
  }

  return diff > 0 ? `in ${relativeStr}` : `${relativeStr} ago`;
}

/**
 * Check if license is expiring soon (within warning threshold)
 *
 * @param expiryTimestamp - Unix timestamp (in seconds)
 * @param warningDays - Number of days before expiry to warn (default: 7)
 * @returns True if license expires within warning threshold
 *
 * @example
 * ```typescript
 * if (isLicenseExpiringSoon(license.expiryTimestamp, 7)) {
 *   // Show renewal reminder
 * }
 * ```
 */
export function isLicenseExpiringSoon(
  expiryTimestamp: bigint,
  warningDays: number = 7
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const warningThreshold = now + warningDays * 24 * 60 * 60;
  return Number(expiryTimestamp) <= warningThreshold && Number(expiryTimestamp) > now;
}

/**
 * Get recommended renewal duration based on current license status
 *
 * @param license - Current license details (null if no license)
 * @returns Recommended duration in months (1, 3, 6, or 12)
 *
 * @example
 * ```typescript
 * const license = await getLicenseDetails(address, courseId);
 * const recommended = getRecommendedRenewalDuration(license);
 * // Suggest: "Renew for {recommended} months"
 * ```
 *
 * Logic:
 * - No license or expired >30 days: recommend 3 months
 * - Expired <30 days: recommend same duration as original
 * - Active: recommend same duration as original
 */
export function getRecommendedRenewalDuration(license: License | null): number {
  if (!license) {
    return 3; // Default for new purchases
  }

  const now = Math.floor(Date.now() / 1000);
  const expiryTimestamp = Number(license.expiryTimestamp);
  const daysSinceExpiry = (now - expiryTimestamp) / (24 * 60 * 60);

  // If expired more than 30 days ago, recommend 3 months
  if (daysSinceExpiry > 30) {
    return 3;
  }

  // Otherwise, recommend same duration as original license
  const originalDuration = Number(license.durationLicense);
  return Math.min(Math.max(originalDuration, 1), 12); // Clamp to 1-12
}
