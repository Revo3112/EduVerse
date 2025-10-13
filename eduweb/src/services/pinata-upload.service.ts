/**
 * Pinata Upload Service
 * Core service for uploading files and JSON to Pinata private IPFS
 *
 * @module pinata-upload.service
 * @description Provides type-safe methods for all upload operations
 */

import { formatFileSize, pinata, pinataConfig } from '@/lib/pinata';
import type {
    ErrorCode,
    FileValidationRule,
    PrivateUploadOptions,
    SignedUrlResponse,
    UploadErrorResponse,
    UploadSuccessResponse,
    ValidationResult
} from '@/lib/pinata-types';

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const FILE_VALIDATION_RULES: Record<string, FileValidationRule> = {
  thumbnail: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    minWidth: 800,
    minHeight: 450,
  },
  video: {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/mov', 'video/quicktime'],
  },
  certificate: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/png'],
    exactWidth: 1200,
    exactHeight: 900,
  },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates file against rules
 * @param file - File to validate
 * @param rules - Validation rules
 * @returns ValidationResult
 */
export function validateFile(file: File, rules: FileValidationRule): ValidationResult {
  // Size validation
  if (file.size > rules.maxSize) {
    return {
      valid: false,
      error: {
        code: 'FILE_TOO_LARGE' as ErrorCode,
        message: `File size ${formatFileSize(file.size)} exceeds maximum ${formatFileSize(rules.maxSize)}`,
      },
    };
  }

  // Type validation
  if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_FILE_TYPE' as ErrorCode,
        message: `File type ${file.type} not allowed. Allowed types: ${rules.allowedTypes.join(', ')}`,
      },
    };
  }

  return { valid: true };
}

/**
 * Validates image dimensions
 * NOTE: This validation only works in browser environment (not Node.js)
 * In server-side contexts, dimension validation is skipped
 *
 * @param file - File to validate
 * @param rules - Validation rules
 * @returns Promise<ValidationResult>
 */
export async function validateImageDimensions(
  file: File,
  rules: FileValidationRule
): Promise<ValidationResult> {
  if (!file.type.startsWith('image/')) {
    return { valid: true }; // Skip for non-images
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    console.warn('[Pinata Upload] Image dimension validation skipped (server environment)');
    return { valid: true }; // Skip validation in Node.js/server-side
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;

      // Exact dimensions
      if (rules.exactWidth && width !== rules.exactWidth) {
        resolve({
          valid: false,
          error: {
            code: 'INVALID_DIMENSIONS' as ErrorCode,
            message: `Width must be exactly ${rules.exactWidth}px, got ${width}px`,
          },
        });
        return;
      }

      if (rules.exactHeight && height !== rules.exactHeight) {
        resolve({
          valid: false,
          error: {
            code: 'INVALID_DIMENSIONS' as ErrorCode,
            message: `Height must be exactly ${rules.exactHeight}px, got ${height}px`,
          },
        });
        return;
      }

      // Minimum dimensions
      if (rules.minWidth && width < rules.minWidth) {
        resolve({
          valid: false,
          error: {
            code: 'INVALID_DIMENSIONS' as ErrorCode,
            message: `Width ${width}px is below minimum ${rules.minWidth}px`,
          },
        });
        return;
      }

      if (rules.minHeight && height < rules.minHeight) {
        resolve({
          valid: false,
          error: {
            code: 'INVALID_DIMENSIONS' as ErrorCode,
            message: `Height ${height}px is below minimum ${rules.minHeight}px`,
          },
        });
        return;
      }

      // Maximum dimensions
      if (rules.maxWidth && width > rules.maxWidth) {
        resolve({
          valid: false,
          error: {
            code: 'INVALID_DIMENSIONS' as ErrorCode,
            message: `Width ${width}px exceeds maximum ${rules.maxWidth}px`,
          },
        });
        return;
      }

      if (rules.maxHeight && height > rules.maxHeight) {
        resolve({
          valid: false,
          error: {
            code: 'INVALID_DIMENSIONS' as ErrorCode,
            message: `Height ${height}px exceeds maximum ${rules.maxHeight}px`,
          },
        });
        return;
      }

      resolve({ valid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: {
          code: 'INVALID_FILE' as ErrorCode,
          message: 'Failed to load image',
        },
      });
    };

    img.src = url;
  });
}

// ============================================================================
// PRIVATE UPLOAD FUNCTIONS
// ============================================================================

/**
 * Builds keyvalues object respecting Pinata's 9 keyvalue limit
 * Priority order: courseId, fileType, sectionId, uploadedAt, custom keyvalues
 *
 * @param options - Upload options containing metadata and keyvalues
 * @returns Record<string, string> with max 9 entries
 */
function buildKeyvalues(options: PrivateUploadOptions): Record<string, string> {
  const keyvalues: Record<string, string> = {};
  const MAX_KEYVALUES = 9;

  // Priority 1: Course ID (essential for all files)
  if (options.metadata?.courseId) {
    keyvalues.courseId = options.metadata.courseId;
  }

  // Priority 2: File type (for categorization)
  if (options.metadata?.fileType) {
    keyvalues.fileType = options.metadata.fileType;
  }

  // Priority 3: Section ID (for videos)
  if (options.metadata?.sectionId) {
    keyvalues.sectionId = options.metadata.sectionId;
  }

  // Priority 4: Upload timestamp
  keyvalues.uploadedAt = new Date().toISOString();

  // Priority 5: Custom keyvalues (up to remaining limit)
  if (options.keyvalues) {
    Object.entries(options.keyvalues).forEach(([key, value]) => {
      if (Object.keys(keyvalues).length < MAX_KEYVALUES) {
        keyvalues[key] = String(value);
      }
    });
  }

  return keyvalues;
}

/**
 * Uploads file to Pinata private IPFS with validation
 *
 * @param file - File to upload
 * @param options - Upload options
 * @returns Promise<UploadSuccessResponse | UploadErrorResponse>
 */
export async function uploadFileToPrivateIPFS(
  file: File,
  options: PrivateUploadOptions = {}
): Promise<UploadSuccessResponse | UploadErrorResponse> {
  const startTime = Date.now();

  try {
    console.log('[Pinata Upload] Starting file upload...');
    console.log('[Pinata Upload] File:', file.name, formatFileSize(file.size));
    console.log('[Pinata Upload] Type:', file.type);

    // Build keyvalues (respecting 9 limit)
    const keyvalues = buildKeyvalues(options);
    console.log('[Pinata Upload] Keyvalues count:', Object.keys(keyvalues).length);

    // Upload to private IPFS
    let uploadBuilder = pinata.upload.private
      .file(file)
      .name(options.name || file.name)
      .keyvalues(keyvalues);

    // Add group if provided
    if (options.groupId) {
      uploadBuilder = uploadBuilder.group(options.groupId);
    }

    const upload = await uploadBuilder;

    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('[Pinata Upload] Upload completed in', uploadTime, 'seconds');
    console.log('[Pinata Upload] CID:', upload.cid);
    console.log('[Pinata Upload] Pinata ID:', upload.id);

    // Generate signed URL
    const expiry = options.metadata?.fileType === 'video'
      ? pinataConfig.videoExpiry!
      : pinataConfig.defaultExpiry!;

    console.log('[Pinata Upload] Generating signed URL (expiry:', expiry, 'seconds)...');

    const signedUrl = await pinata.gateways.private.createAccessLink({
      cid: upload.cid,
      expires: expiry,
    });

    console.log('[Pinata Upload] Signed URL generated successfully');

    return {
      success: true,
      data: {
        cid: upload.cid,
        pinataId: upload.id,
        name: upload.name,
        size: upload.size,
        mimeType: upload.mime_type,
        signedUrl,
        expiresAt: Date.now() + (expiry * 1000), // Unix timestamp in milliseconds
        uploadedAt: new Date().toISOString(),
        network: 'private' as const,
      },
    };
  } catch (error: unknown) {
    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('[Pinata Upload] Upload failed after', uploadTime, 'seconds');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pinata Upload] Error:', errorMessage);

    return {
      success: false,
      error: {
        code: 'UPLOAD_FAILED' as ErrorCode,
        message: errorMessage,
        details: error,
        retryable: errorMessage.includes('network') || errorMessage.includes('timeout'),
      },
    };
  }
}

/**
 * Uploads JSON data to Pinata private IPFS
 *
 * @param data - JSON data to upload
 * @param options - Upload options
 * @returns Promise<UploadSuccessResponse | UploadErrorResponse>
 */
export async function uploadJSONToPrivateIPFS(
  data: Record<string, unknown>,
  options: PrivateUploadOptions = {}
): Promise<UploadSuccessResponse | UploadErrorResponse> {
  const startTime = Date.now();

  try {
    console.log('[Pinata Upload] Starting JSON upload...');
    console.log('[Pinata Upload] Data keys:', Object.keys(data).join(', '));

    // Build keyvalues (respecting 9 limit)
    const keyvalues = buildKeyvalues({
      ...options,
      keyvalues: {
        ...options.keyvalues,
        dataType: 'json',
      },
    });
    console.log('[Pinata Upload] Keyvalues count:', Object.keys(keyvalues).length);

    // Upload to private IPFS
    let uploadBuilder = pinata.upload.private
      .json(data)
      .name(options.name || `data_${Date.now()}.json`)
      .keyvalues(keyvalues);

    // Add group if provided
    if (options.groupId) {
      uploadBuilder = uploadBuilder.group(options.groupId);
    }

    const upload = await uploadBuilder;

    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('[Pinata Upload] JSON upload completed in', uploadTime, 'seconds');
    console.log('[Pinata Upload] CID:', upload.cid);

    // Generate signed URL
    const expiry = pinataConfig.defaultExpiry!;
    const signedUrl = await pinata.gateways.private.createAccessLink({
      cid: upload.cid,
      expires: expiry,
    });

    return {
      success: true,
      data: {
        cid: upload.cid,
        pinataId: upload.id,
        name: upload.name,
        size: upload.size,
        mimeType: 'application/json',
        signedUrl,
        expiresAt: Date.now() + (expiry * 1000), // Unix timestamp in milliseconds
        uploadedAt: new Date().toISOString(),
        network: 'private' as const,
      },
    };
  } catch (error: unknown) {
    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('[Pinata Upload] JSON upload failed after', uploadTime, 'seconds');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pinata Upload] Error:', errorMessage);

    return {
      success: false,
      error: {
        code: 'UPLOAD_FAILED' as ErrorCode,
        message: errorMessage,
        details: error,
        retryable: false,
      },
    };
  }
}

// ============================================================================
// SIGNED URL GENERATION
// ============================================================================

/**
 * Generates a signed URL for an existing CID
 *
 * @param cid - Content Identifier
 * @param expires - Expiry time in seconds (optional)
 * @returns Promise<SignedUrlResponse>
 */
export async function generateSignedUrl(
  cid: string,
  expires?: number
): Promise<SignedUrlResponse> {
  try {
    const expiry = expires || pinataConfig.defaultExpiry!;

    console.log('[Pinata] Generating signed URL for CID:', cid);
    console.log('[Pinata] Expiry:', expiry, 'seconds');

    const signedUrl = await pinata.gateways.private.createAccessLink({
      cid,
      expires: expiry,
    });

    return {
      success: true,
      signedUrl,
      expiresAt: Date.now() + (expiry * 1000), // Unix timestamp in milliseconds
      expires: expiry,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pinata] Failed to generate signed URL:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generates signed URLs for multiple CIDs
 *
 * @param cids - Array of Content Identifiers
 * @param expires - Expiry time in seconds (optional)
 * @returns Promise<SignedUrlResponse[]>
 */
export async function batchGenerateSignedUrls(
  cids: string[],
  expires?: number
): Promise<SignedUrlResponse[]> {
  console.log('[Pinata] Generating signed URLs for', cids.length, 'CIDs...');

  const promises = cids.map(cid => generateSignedUrl(cid, expires));
  const results = await Promise.all(promises);

  return results;
}
