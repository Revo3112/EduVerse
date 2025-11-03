/**
 * Video Upload Service
 * Specialized service for course video uploads with large file support
 *
 * @module video-service
 * @description Handles validation and upload of course videos to Pinata
 */

import { pinataConfig } from '@/lib/pinata';
import type {
  ErrorCode,
  UploadErrorResponse,
  UploadProgressCallback,
  UploadSuccessResponse
} from '@/lib/pinata-types';
import {
  FILE_VALIDATION_RULES,
  uploadFileToPrivateIPFS,
  validateFile,
} from './pinata-upload.service';

// ============================================================================
// VIDEO UPLOAD OPTIONS
// ============================================================================

export interface VideoUploadOptions {
  courseId: string;
  sectionId: string;
  sectionName?: string;
  uploadedBy?: string;
  groupId?: string;
  onProgress?: UploadProgressCallback;
}

// ============================================================================
// VIDEO VALIDATION
// ============================================================================

/**
 * Validates video file before upload
 * @param file - Video file
 * @returns Validation result with specific video checks
 */
function validateVideoFile(file: File) {
  console.log('[Video Service] Validating video file...');

  const rules = FILE_VALIDATION_RULES.video;
  const validation = validateFile(file, rules);

  if (!validation.valid) {
    return validation;
  }

  // Additional video-specific validation
  // Check if file name contains valid video extension
  const validExtensions = ['.mp4', '.webm', '.mov'];
  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: {
        code: 'UNSUPPORTED_FILE_TYPE' as ErrorCode,
        message: `File must have one of these extensions: ${validExtensions.join(', ')}`,
      },
    };
  }

  console.log('[Video Service] Video validation passed');
  return { valid: true };
}

// ============================================================================
// VIDEO DURATION EXTRACTION
// ============================================================================

/**
 * Extracts video duration from video file using HTML5 video element
 * Validates against smart contract requirements (60-10800 seconds)
 *
 * @param file - Video file to extract duration from
 * @returns Promise<number> - Duration in seconds (rounded down)
 * @throws Error if duration is out of smart contract range or extraction fails
 *
 * @example
 * const duration = await extractVideoDuration(videoFile);
 * console.log('Video duration:', duration, 'seconds');
 */
export async function extractVideoDuration(file: File): Promise<number> {
  console.log('[Video Service] Extracting video duration...');

  return new Promise((resolve, reject) => {
    // Create temporary video element
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Clean up object URL to prevent memory leaks
      window.URL.revokeObjectURL(video.src);

      // Get duration and round down to whole seconds
      const duration = Math.floor(video.duration);

      console.log('[Video Service] Raw duration:', video.duration);
      console.log('[Video Service] Rounded duration:', duration, 'seconds');
      console.log('[Video Service] Duration in minutes:', (duration / 60).toFixed(2));

      // Validate against smart contract limits
      // Smart contract requires: 60 seconds (1 min) to 10800 seconds (3 hours)
      if (isNaN(duration) || duration <= 0) {
        reject(new Error('Invalid video duration: Unable to determine video length'));
      } else if (duration < 60) {
        reject(new Error(
          `Video too short: ${duration}s (minimum: 60s / 1 minute). ` +
          `Smart contract requires videos to be at least 1 minute long.`
        ));
      } else if (duration > 10800) {
        const hours = (duration / 3600).toFixed(2);
        reject(new Error(
          `Video too long: ${duration}s / ${hours} hours (maximum: 10800s / 3 hours). ` +
          `Smart contract requires videos to be at most 3 hours long.`
        ));
      } else {
        console.log('[Video Service] ✓ Duration valid for smart contract');
        resolve(duration);
      }
    };

    video.onerror = (event) => {
      // Clean up on error
      window.URL.revokeObjectURL(video.src);
      console.error('[Video Service] Failed to load video metadata:', event);
      reject(new Error(
        'Failed to load video metadata. The file may be corrupted or in an unsupported format.'
      ));
    };

    // Load video metadata
    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      reject(new Error(
        `Failed to create video object: ${error instanceof Error ? error.message : 'Unknown error'}`
      ));
    }
  });
}

// ============================================================================
// VIDEO UPLOAD
// ============================================================================

/**
 * Uploads a course section video with validation and duration extraction
 * @param file - Video file
 * @param options - Upload options
 * @returns Promise<UploadSuccessResponse | UploadErrorResponse>
 */
export async function uploadCourseVideo(
  file: File,
  options: VideoUploadOptions
): Promise<UploadSuccessResponse | UploadErrorResponse> {
  console.log('[Video Service] Starting video upload...');
  console.log('[Video Service] Course ID:', options.courseId);
  console.log('[Video Service] Section ID:', options.sectionId);
  console.log('[Video Service] File:', file.name);
  console.log('[Video Service] Size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');

  // Notify progress: Preparing
  options.onProgress?.({
    uploadedBytes: 0,
    totalBytes: file.size,
    percentage: 0,
    stage: 'preparing',
  });

  // Step 1: Validate video file
  const validation = validateVideoFile(file);

  if (!validation.valid) {
    console.error('[Video Service] Validation failed:', validation.error);
    return {
      success: false,
      error: {
        code: validation.error!.code,
        message: validation.error!.message,
        retryable: false,
      },
    };
  }

  // Step 2: Extract video duration (CRITICAL for smart contract)
  console.log('[Video Service] Extracting video duration for smart contract...');
  let duration: number;

  try {
    duration = await extractVideoDuration(file);
    console.log('[Video Service] ✓ Duration extracted successfully:', duration, 'seconds');
    console.log('[Video Service] ✓ Duration valid for smart contract (60-10800s range)');
  } catch (error) {
    console.error('[Video Service] ✗ Duration extraction failed:', error);
    return {
      success: false,
      error: {
        code: 'INVALID_DURATION' as ErrorCode,
        message: error instanceof Error
          ? error.message
          : 'Failed to extract video duration',
        retryable: false,
      },
    };
  }

  // Notify progress: Uploading (after duration extraction)
  options.onProgress?.({
    uploadedBytes: 0,
    totalBytes: file.size,
    percentage: 10,
    stage: 'uploading',
  });

  // Step 3: Upload to Pinata with duration stored in keyvalues
  console.log('[Video Service] Uploading to Pinata (this may take a while for large files)...');

  const result = await uploadFileToPrivateIPFS(file, {
    name: `video-${options.courseId}-${options.sectionId}-${Date.now()}.${file.name.split('.').pop()}`,
    groupId: options.groupId,
    keyvalues: {
      type: 'video',
      courseId: options.courseId,
      sectionId: options.sectionId,
      duration: duration.toString(),  // ✅ Store duration in Pinata keyvalues for backend indexer
      ...(options.sectionName && { sectionName: options.sectionName }),
    },
    metadata: {
      courseId: options.courseId,
      sectionId: options.sectionId,
      fileType: 'video',
      duration,  // Also store in metadata for Goldsky indexer
    },
  });

  if (result.success) {
    console.log('[Video Service] Video uploaded successfully');
    console.log('[Video Service] CID:', result.data.cid);
    console.log('[Video Service] Duration:', duration, 'seconds');
    console.log('[Video Service] Size:', (result.data.size / (1024 * 1024)).toFixed(2), 'MB');
    console.log('[Video Service] Signed URL expires at:', result.data.expiresAt);
    console.log('[Video Service] Expiry duration:', pinataConfig.videoExpiry, 'seconds');

    // Notify progress: Complete
    options.onProgress?.({
      uploadedBytes: file.size,
      totalBytes: file.size,
      percentage: 100,
      stage: 'complete',
    });

    // ✅ Return response with duration included
    return {
      success: true,
      data: {
        ...result.data,
        duration,  // ✅ Add duration to response for smart contract & Goldsky indexer
      },
    };
  } else {
    console.error('[Video Service] Video upload failed:', result.error);
  }

  return result;
}

// ============================================================================
// BATCH VIDEO UPLOAD
// ============================================================================

/**
 * Uploads multiple course section videos sequentially
 * Sequential upload prevents overwhelming the connection
 * @param files - Array of video files
 * @param options - Upload options per file
 * @returns Promise<(UploadSuccessResponse | UploadErrorResponse)[]>
 */
export async function batchUploadVideosSequential(
  files: File[],
  options: VideoUploadOptions[]
): Promise<(UploadSuccessResponse | UploadErrorResponse)[]> {
  console.log('[Video Service] Batch uploading', files.length, 'videos (sequential)');

  const results: (UploadSuccessResponse | UploadErrorResponse)[] = [];

  for (let i = 0; i < files.length; i++) {
    console.log(`[Video Service] Uploading video ${i + 1} of ${files.length}...`);

    const result = await uploadCourseVideo(files[i], options[i]);
    results.push(result);

    if (!result.success) {
      console.error(`[Video Service] Video ${i + 1} failed, continuing with next...`);
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[Video Service] Batch upload complete: ${successCount}/${files.length} successful`);

  return results;
}

/**
 * Uploads multiple course section videos in parallel
 * Use with caution for large files - may overwhelm connection
 * @param files - Array of video files
 * @param options - Upload options per file
 * @param maxParallel - Maximum parallel uploads (default: 2)
 * @returns Promise<(UploadSuccessResponse | UploadErrorResponse)[]>
 */
export async function batchUploadVideosParallel(
  files: File[],
  options: VideoUploadOptions[],
  maxParallel: number = 2
): Promise<(UploadSuccessResponse | UploadErrorResponse)[]> {
  console.log('[Video Service] Batch uploading', files.length, 'videos (max', maxParallel, 'parallel)');

  const results: (UploadSuccessResponse | UploadErrorResponse)[] = new Array(files.length);
  const queue = files.map((file, index) => ({ file, index }));

  const uploadWorker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const { file, index } = item;
      console.log(`[Video Service] Uploading video ${index + 1} of ${files.length}...`);

      const result = await uploadCourseVideo(file, options[index]);
      results[index] = result;
    }
  };

  // Create worker pool
  const workers = Array(Math.min(maxParallel, files.length))
    .fill(null)
    .map(() => uploadWorker());

  await Promise.all(workers);

  const successCount = results.filter(r => r.success).length;
  console.log(`[Video Service] Batch upload complete: ${successCount}/${files.length} successful`);

  return results;
}

// ============================================================================
// VIDEO UTILITIES
// ============================================================================

/**
 * Estimates upload time based on file size
 * @param fileSize - File size in bytes
 * @param connectionSpeed - Connection speed in Mbps (default: 10)
 * @returns Estimated time in seconds
 */
export function estimateUploadTime(fileSize: number, connectionSpeed: number = 10): number {
  // Convert Mbps to bytes per second
  const bytesPerSecond = (connectionSpeed * 1024 * 1024) / 8;

  // Add 20% overhead for protocol and processing
  const estimatedSeconds = (fileSize / bytesPerSecond) * 1.2;

  return Math.ceil(estimatedSeconds);
}

/**
 * Checks if video file size is within recommended limits
 * @param fileSize - File size in bytes
 * @returns Recommendation object
 */
export function getVideoSizeRecommendation(fileSize: number): {
  isOptimal: boolean;
  message: string;
  estimatedUploadTime: number;
} {
  // const rules = FILE_VALIDATION_RULES.video;
  const sizeMB = fileSize / (1024 * 1024);
  const estimatedTime = estimateUploadTime(fileSize);

  if (sizeMB > 200) {
    return {
      isOptimal: false,
      message: `Video is ${sizeMB.toFixed(2)}MB. Consider compressing to under 200MB for optimal performance. Estimated upload time: ${Math.ceil(estimatedTime / 60)} minutes.`,
      estimatedUploadTime: estimatedTime,
    };
  }

  if (sizeMB > 100) {
    return {
      isOptimal: true,
      message: `Video size (${sizeMB.toFixed(2)}MB) is acceptable but on the larger side. Estimated upload time: ${Math.ceil(estimatedTime / 60)} minutes.`,
      estimatedUploadTime: estimatedTime,
    };
  }

  return {
    isOptimal: true,
    message: `Video size (${sizeMB.toFixed(2)}MB) is optimal. Estimated upload time: ${Math.ceil(estimatedTime)} seconds.`,
    estimatedUploadTime: estimatedTime,
  };
}
