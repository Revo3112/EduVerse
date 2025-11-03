/**
 * Thumbnail Upload Service
 * Specialized service for course thumbnail uploads
 *
 * @module thumbnail-service
 * @description Handles validation and upload of course thumbnails to Pinata
 */

import type {
  ErrorCode,
  UploadErrorResponse,
  UploadSuccessResponse
} from '@/lib/pinata-types';
import {
  FILE_VALIDATION_RULES,
  uploadFileToPrivateIPFS,
  validateFile,
  validateImageDimensions,
} from './pinata-upload.service';

// ============================================================================
// THUMBNAIL UPLOAD OPTIONS
// ============================================================================

export interface ThumbnailUploadOptions {
  courseId: string;
  courseName?: string;
  uploadedBy?: string;
  groupId?: string;
}

// ============================================================================
// THUMBNAIL UPLOAD
// ============================================================================

/**
 * Uploads a course thumbnail with validation
 * @param file - Thumbnail image file
 * @param options - Upload options
 * @returns Promise<UploadSuccessResponse | UploadErrorResponse>
 */
export async function uploadCourseThumbnail(
  file: File,
  options: ThumbnailUploadOptions
): Promise<UploadSuccessResponse | UploadErrorResponse> {
  console.log('[Thumbnail Service] Starting thumbnail upload...');
  console.log('[Thumbnail Service] Course ID:', options.courseId);
  console.log('[Thumbnail Service] File:', file.name);

  // Step 1: Validate file type and size
  const rules = FILE_VALIDATION_RULES.thumbnail;
  const validation = validateFile(file, rules);

  if (!validation.valid) {
    console.error('[Thumbnail Service] Validation failed:', validation.error);
    return {
      success: false,
      error: {
        code: validation.error!.code,
        message: validation.error!.message,
        retryable: false,
      },
    };
  }

  // Step 2: Validate image dimensions
  const dimensionValidation = await validateImageDimensions(file, rules);

  if (!dimensionValidation.valid) {
    console.error('[Thumbnail Service] Dimension validation failed:', dimensionValidation.error);
    return {
      success: false,
      error: {
        code: dimensionValidation.error!.code,
        message: dimensionValidation.error!.message,
        retryable: false,
      },
    };
  }

  console.log('[Thumbnail Service] Validation passed');

  // Step 3: Upload to Pinata
  const result = await uploadFileToPrivateIPFS(file, {
    name: `thumbnail-${options.courseId}-${Date.now()}.${file.name.split('.').pop()}`,
    groupId: options.groupId,
    keyvalues: {
      type: 'thumbnail',
      courseId: options.courseId,
      ...(options.courseName && { courseName: options.courseName }),
    },
    metadata: {
      courseId: options.courseId,
      fileType: 'thumbnail',
    },
  });

  if (result.success) {
    console.log('[Thumbnail Service] Thumbnail uploaded successfully');
    console.log('[Thumbnail Service] CID:', result.data.cid);
    console.log('[Thumbnail Service] Signed URL expires at:', result.data.expiresAt);
  } else {
    console.error('[Thumbnail Service] Thumbnail upload failed:', result.error);
  }

  return result;
}

// ============================================================================
// BATCH THUMBNAIL UPLOAD
// ============================================================================

/**
 * Uploads multiple course thumbnails
 * @param files - Array of thumbnail files
 * @param options - Upload options per file
 * @returns Promise<(UploadSuccessResponse | UploadErrorResponse)[]>
 */
export async function batchUploadThumbnails(
  files: File[],
  options: ThumbnailUploadOptions[]
): Promise<(UploadSuccessResponse | UploadErrorResponse)[]> {
  console.log('[Thumbnail Service] Batch uploading', files.length, 'thumbnails');

  const uploadPromises = files.map((file, index) =>
    uploadCourseThumbnail(file, options[index])
  );

  const results = await Promise.allSettled(uploadPromises);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error('[Thumbnail Service] Batch upload failed for file', index, ':', result.reason);
      return {
        success: false,
        error: {
          code: 'UPLOAD_FAILED' as ErrorCode,
          message: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          retryable: true,
        },
      } as UploadErrorResponse;
    }
  });
}
