/**
 * Pinata SDK Core Service
 * Singleton instance for Pinata IPFS SDK with private network support
 *
 * @module pinata
 * @description Initializes and exports Pinata SDK instance for private uploads
 *
 * @security CRITICAL - PINATA_JWT must never be exposed to client
 */

import { PinataSDK } from "pinata";
import type { PinataConfig } from "./pinata-types";

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

/**
 * Validates required environment variables
 * @throws Error if required variables are missing
 */
function validateEnvironment(): PinataConfig {
  const jwt = process.env.PINATA_JWT;
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;

  if (!jwt) {
    throw new Error(
      "PINATA_JWT environment variable is required. " +
        "Please add it to your .env.local file."
    );
  }

  if (!gateway) {
    throw new Error(
      "NEXT_PUBLIC_PINATA_GATEWAY environment variable is required. " +
        "Please add it to your .env.local file."
    );
  }

  // Parse optional expiry values
  const defaultExpiry = process.env.PINATA_SIGNED_URL_EXPIRY
    ? parseInt(process.env.PINATA_SIGNED_URL_EXPIRY, 10)
    : 3600; // 1 hour default

  const videoExpiry = process.env.PINATA_VIDEO_SIGNED_URL_EXPIRY
    ? parseInt(process.env.PINATA_VIDEO_SIGNED_URL_EXPIRY, 10)
    : 7200; // 2 hours default

  return {
    jwt,
    gateway,
    defaultExpiry,
    videoExpiry,
    maxRetries: 3,
  };
}

// ============================================================================
// SDK INITIALIZATION
// ============================================================================

/**
 * Initializes Pinata SDK with validated configuration
 * @returns Configured PinataSDK instance
 */
function initializePinataSDK(): PinataSDK {
  const config = validateEnvironment();

  console.log("[Pinata] Initializing SDK...");
  console.log("[Pinata] Gateway:", config.gateway);
  console.log("[Pinata] JWT length:", config.jwt.length);
  console.log(
    "[Pinata] Default signed URL expiry:",
    config.defaultExpiry,
    "seconds"
  );
  console.log(
    "[Pinata] Video signed URL expiry:",
    config.videoExpiry,
    "seconds"
  );

  const sdk = new PinataSDK({
    pinataJwt: config.jwt,
    pinataGateway: config.gateway,
  });

  console.log("[Pinata] SDK initialized successfully");

  return sdk;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton Pinata SDK instance
 *
 * @example
 * ```typescript
 * import { pinata, pinataConfig } from '@/lib/pinata';
 *
 * // Upload private file
 * const upload = await pinata.upload.private.file(file)
 *   .name("my-file.png")
 *   .keyvalues({ courseId: "123" });
 *
 * // Generate signed URL
 * const url = await pinata.gateways.private.createAccessLink({
 *   cid: upload.cid,
 *   expires: pinataConfig.defaultExpiry
 * });
 * ```
 */
export const pinata = initializePinataSDK();

/**
 * Exported configuration for use in services
 */
export const pinataConfig = validateEnvironment();

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Tests connection to Pinata API
 * @returns Promise<boolean> true if connection successful
 */
export async function testPinataConnection(): Promise<boolean> {
  try {
    console.log("[Pinata] Testing connection...");

    // List files with limit 1 to test API access
    const result = await pinata.files.private.list().limit(1);

    console.log("[Pinata] Connection successful");
    console.log("[Pinata] Files found:", result.files?.length ?? 0);

    return true;
  } catch (error) {
    console.error("[Pinata] Connection failed:", error);
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validates CID format
 * @param cid - Content Identifier to validate
 * @returns true if valid CID format
 */
export function isValidCID(cid: string): boolean {
  // CIDv0: Qm... (46 characters)
  // CIDv1: bafy... or bafk... (variable length)
  const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const cidV1Regex = /^(bafy|bafk|bafz|baf2)[a-z0-9]{52,}$/i;

  return cidV0Regex.test(cid) || cidV1Regex.test(cid);
}

/**
 * Extracts CID from various URL formats
 * @param url - URL or CID string
 * @returns Extracted CID or null
 */
export function extractCID(url: string): string | null {
  // Already a CID
  if (isValidCID(url)) {
    return url;
  }

  // Extract from ipfs:// URL
  if (url.startsWith("ipfs://")) {
    const cid = url.replace("ipfs://", "").split("/")[0];
    return isValidCID(cid) ? cid : null;
  }

  // Extract from gateway URL
  const gatewayMatch = url.match(/\/ipfs\/([^/?]+)/);
  if (gatewayMatch && isValidCID(gatewayMatch[1])) {
    return gatewayMatch[1];
  }

  return null;
}

/**
 * Generates expiry timestamp
 * @param seconds - Seconds from now
 * @returns ISO timestamp string
 */
export function generateExpiryTimestamp(seconds: number): string {
  const expiryDate = new Date(Date.now() + seconds * 1000);
  return expiryDate.toISOString();
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { PinataSDK };
