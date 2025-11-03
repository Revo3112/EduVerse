/**
 * @fileoverview Thirdweb IPFS Upload Utility - Production Ready
 * @description Centralized utility for uploading files to IPFS via Thirdweb Storage SDK
 * @author EduVerse Platform
 * @date 2025-01-12
 *
 * This utility provides a reusable interface for uploading files to IPFS through
 * Thirdweb's Storage service. It handles file conversion, upload, and URL generation.
 *
 * Key Features:
 * - Supports all file types (images, videos, documents, etc.)
 * - Returns plain CID without ipfs:// prefix (ready for smart contract)
 * - Generates preview URLs via Thirdweb gateway
 * - Used by both certificate generation and course asset uploads
 * - Production-ready error handling and logging
 *
 * Note: This utility is designed for server-side use (API routes) where THIRDWEB_SECRET_KEY is available
 */

import { createThirdwebClient } from "thirdweb";
import { upload } from "thirdweb/storage";

/**
 * Upload result interface
 * @property cid - Plain IPFS CID (e.g., "QmXxxx..." or "bafyxxx...")
 * @property uri - Full IPFS URI with protocol (e.g., "ipfs://QmXxxx...")
 * @property previewUrl - HTTP gateway URL for immediate access
 */
export interface UploadResult {
  cid: string;
  uri: string;
  previewUrl: string;
}

/**
 * Get Thirdweb client for server-side operations
 * Requires both THIRDWEB_CLIENT_ID and THIRDWEB_SECRET_KEY environment variables
 */
function getServerClient() {
  const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;

  if (!THIRDWEB_CLIENT_ID) {
    throw new Error(
      'Thirdweb client ID not configured. ' +
      'Please set NEXT_PUBLIC_THIRDWEB_CLIENT_ID in your .env.local file.'
    );
  }

  if (!THIRDWEB_SECRET_KEY) {
    throw new Error(
      'Thirdweb secret key not configured. ' +
      'Please set THIRDWEB_SECRET_KEY in your .env.local file. ' +
      'Get your key from: https://thirdweb.com/dashboard/settings/api-keys'
    );
  }

  return createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
    secretKey: THIRDWEB_SECRET_KEY,
  });
}

/**
 * Upload a single file to IPFS using Thirdweb Storage
 *
 * @param arrayBuffer - File content as ArrayBuffer
 * @param filename - Name of the file (with extension)
 * @param mimeType - MIME type of the file (e.g., "image/jpeg", "video/mp4")
 * @returns Object containing CID, IPFS URI, and preview URL
 *
 * @example
 * ```typescript
 * const arrayBuffer = await file.arrayBuffer();
 * const result = await uploadFileToIPFS(arrayBuffer, "thumbnail.jpg", "image/jpeg");
 * console.log(result.cid); // "QmXxxx..."
 * console.log(result.previewUrl); // "https://89bdce641630ecf1c9de409c4a2ff759.ipfscdn.io/ipfs/QmXxxx..."
 * ```
 *
 * @throws Error if upload fails or Thirdweb client is unavailable
 */
export async function uploadFileToIPFS(
  arrayBuffer: ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  console.log(`[IPFS Upload] Starting upload for ${filename} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);

  try {
    // Get server-side client with secret key
    const client = getServerClient();

    // Convert ArrayBuffer to File object for Thirdweb SDK
    const file = new File([arrayBuffer], filename, { type: mimeType });

    console.log(`[IPFS Upload] Uploading to Thirdweb IPFS...`);

    // Upload to IPFS via Thirdweb Storage
    // Returns array of IPFS URIs (we only upload one file)
    const ipfsUris = await upload({
      client,
      files: [file],
    });

    console.log(`[IPFS Upload] Upload successful! URIs:`, ipfsUris);

    // Extract the first URI (format: "ipfs://QmXxxx...")
    const fullUri = ipfsUris[0];

    if (!fullUri || !fullUri.startsWith('ipfs://')) {
      throw new Error(`Invalid IPFS URI returned: ${fullUri}`);
    }

    // Extract plain CID by removing ipfs:// prefix
    // This format is required by our smart contract
    const cid = fullUri.replace('ipfs://', '');

    // Generate preview URL via Thirdweb gateway
    // Manually construct the gateway URL to avoid resolveScheme validation issues
    // Format: https://<clientId>.ipfscdn.io/ipfs/<cid>
    const previewUrl = `https://${client.clientId}.ipfscdn.io/ipfs/${cid}`;

    console.log(`[IPFS Upload] Complete!`);
    console.log(`  CID: ${cid}`);
    console.log(`  Gateway URL: ${previewUrl}`);

    return {
      cid,           // Plain CID for smart contract storage
      uri: fullUri,  // Full IPFS URI for reference
      previewUrl,    // HTTP URL for immediate access
    };
  } catch (error) {
    console.error(`[IPFS Upload] Failed to upload ${filename}:`, error);

    // Provide detailed error information
    if (error instanceof Error) {
      throw new Error(`Failed to upload ${filename} to IPFS: ${error.message}`);
    }

    throw new Error(`Failed to upload ${filename} to IPFS: Unknown error`);
  }
}

/**
 * Upload multiple files to IPFS in parallel
 * Provides better performance for batch uploads
 *
 * @param files - Array of file data to upload
 * @returns Promise with array of upload results
 *
 * @example
 * ```typescript
 * const files = [
 *   { arrayBuffer: await file1.arrayBuffer(), filename: "video1.mp4", mimeType: "video/mp4" },
 *   { arrayBuffer: await file2.arrayBuffer(), filename: "video2.mp4", mimeType: "video/mp4" },
 * ];
 *
 * const results = await uploadMultipleFiles(files);
 * console.log(results.map(r => r.cid)); // ["QmXxxx...", "QmYyyy..."]
 * ```
 */
export async function uploadMultipleFiles(
  files: Array<{ arrayBuffer: ArrayBuffer; filename: string; mimeType: string }>
): Promise<UploadResult[]> {
  console.log(`[IPFS Upload] Starting batch upload for ${files.length} files`);

  // Upload all files in parallel for better performance
  const uploadPromises = files.map(({ arrayBuffer, filename, mimeType }) =>
    uploadFileToIPFS(arrayBuffer, filename, mimeType)
  );

  const results = await Promise.all(uploadPromises);

  console.log(`[IPFS Upload] Batch upload complete! ${results.length} files uploaded`);

  return results;
}

/**
 * Validate file size before upload
 *
 * @param file - File to validate
 * @param maxSizeMB - Maximum allowed size in megabytes
 * @throws Error if file exceeds size limit
 */
export function validateFileSize(file: File, maxSizeMB: number): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(
      `File "${file.name}" exceeds maximum size of ${maxSizeMB}MB (actual: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
    );
  }
}

/**
 * Validate file type
 *
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @throws Error if file type is not allowed
 */
export function validateFileType(file: File, allowedTypes: string[]): void {
  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    );
  }
}

/**
 * Get file extension from filename
 *
 * @param filename - Name of the file
 * @returns File extension (e.g., "jpg", "mp4")
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.23 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if CID format is valid for smart contract
 * Smart contracts expect plain CID without ipfs:// prefix
 * Maximum length is typically 150 characters
 *
 * @param cid - CID to validate
 * @returns true if valid, false otherwise
 */
export function isValidSmartContractCID(cid: string): boolean {
  // Check for ipfs:// prefix (should not have it)
  if (cid.startsWith('ipfs://')) {
    return false;
  }

  // Check length (most CIDs are under 100 characters)
  if (cid.length === 0 || cid.length > 150) {
    return false;
  }

  // Check for valid CID v0 (Qm...) or v1 (bafy...)
  if (!cid.startsWith('Qm') && !cid.startsWith('bafy')) {
    return false;
  }

  return true;
}
