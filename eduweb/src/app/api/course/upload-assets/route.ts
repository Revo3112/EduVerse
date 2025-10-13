/**
 * @fileoverview Course Asset Upload API Route
 * @description Handles private IPFS uploads for course thumbnails and section videos via Pinata
 * @author EduVerse Platform
 * @date 2025-01-12
 * @updated 2025-10-13 - Migrated from Thirdweb to Pinata Private IPFS
 * @updated 2025-10-13 - Added video duration extraction for smart contract & Goldsky indexer
 *
 * This API endpoint processes course asset uploads during the publish workflow.
 * All uploads are stored on Pinata private IPFS with signed URLs for secure retrieval.
 *
 * **IMPORTANT: This endpoint is ONLY called during course publishing, never during draft saves.**
 *
 * Workflow:
 * 1. Receive thumbnail + video files via FormData
 * 2. Validate files against size and type constraints
 * 3. Extract video duration for smart contract validation (60-10800s)
 * 4. Upload thumbnail to Pinata private IPFS with metadata
 * 5. Upload all videos in parallel with metadata (including duration)
 * 6. Return CIDs + signed URLs + durations ready for blockchain transaction
 *
 * Smart Contract Requirements:
 * - thumbnailCID: string (max 150 chars)
 * - section.contentCID: string (max 150 chars)
 * - section.duration: uint256 (60-10800 seconds) ✅ NEW!
 * - Format: Plain CID without "ipfs://" prefix
 *
 * Goldsky Indexer Requirements:
 * - Duration stored in Pinata keyvalues for backend indexing
 * - Duration included in metadata for event tracking
 *
 * Pinata Features:
 * - Private IPFS storage with signed URLs
 * - Metadata tagging for organization (courseId, fileType, sectionId, duration)
 * - 30-day expiry for signed URLs (auto-refresh on frontend)
 */

import { uploadCourseThumbnail } from '@/services/thumbnail.service';
import { uploadCourseVideo } from '@/services/video.service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/course/upload-assets
 *
 * Upload course thumbnail and section videos to IPFS with duration extraction
 *
 * Request Body (FormData):
 * - thumbnail: File (required) - Course thumbnail image
 * - videos: File[] (optional) - Array of section video files
 * - courseId: string (optional) - Course ID for logging/tracking
 *
 * Response:
 * ```json
 * {
 *   "success": true,
 *   "thumbnailCID": "QmXxxx...",
 *   "thumbnailPreviewUrl": "https://...",
 *   "videoCIDs": ["QmYyyy...", "QmZzzz..."],
 *   "videoPreviewUrls": ["https://...", "https://..."],
 *   "videoDurations": [1800, 2400],
 *   "videos": [
 *     {
 *       "cid": "QmYyyy...",
 *       "previewUrl": "https://...",
 *       "duration": 1800,
 *       "size": 52428800,
 *       "mimeType": "video/mp4",
 *       "expiresAt": 1697241600
 *     }
 *   ]
 * }
 * ```
 *
 * Error Response:
 * ```json
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "details": "Detailed error information"
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[Course Upload API] Received upload request');

    // Parse multipart form data
    const formData = await req.formData();

    // Extract course ID for logging
    const courseId = formData.get('courseId') as string | null;
    if (courseId) {
      console.log(`[Course Upload API] Processing assets for course: ${courseId}`);
    }

    // ==============================================
    // STEP 1: UPLOAD THUMBNAIL
    // ==============================================

    const thumbnailFile = formData.get('thumbnail') as File | null;

    if (!thumbnailFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thumbnail is required',
          details: 'No thumbnail file provided in request'
        },
        { status: 400 }
      );
    }

    console.log(`[Course Upload API] Uploading thumbnail: ${thumbnailFile.name} (${thumbnailFile.type}, ${(thumbnailFile.size / 1024 / 1024).toFixed(2)}MB)`);

    // Upload thumbnail using thumbnail service
    const thumbnailUploadResult = await uploadCourseThumbnail(thumbnailFile, {
      courseId: courseId || 'unknown',
    });

    if (!thumbnailUploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thumbnail upload failed',
          details: thumbnailUploadResult.error.message
        },
        { status: 400 }
      );
    }

    const thumbnailData = thumbnailUploadResult.data;
    console.log(`[Course Upload API] ✓ Thumbnail uploaded. CID: ${thumbnailData.cid}`);

    // ==============================================
    // STEP 2: UPLOAD VIDEOS WITH DURATION EXTRACTION
    // ==============================================

    const videoFiles = formData.getAll('videos') as File[];
    const videoCIDs: string[] = [];
    const videoPreviewUrls: string[] = [];
    const videoDurations: number[] = [];
    const videoDetails: Array<{
      cid: string;
      previewUrl: string;
      duration: number;
      size: number;
      mimeType: string;
      expiresAt: number | undefined;
    }> = [];

    if (videoFiles.length > 0) {
      console.log(`[Course Upload API] Processing ${videoFiles.length} video(s)...`);

      // Upload all videos in parallel using video service (with duration extraction)
      console.log('[Course Upload API] Uploading videos with duration extraction...');

      const videoUploadPromises = videoFiles.map(async (video, index) => {
        console.log(`[Course Upload API] Processing video ${index + 1}/${videoFiles.length}: ${video.name}`);

        // Use video service which includes duration extraction
        const result = await uploadCourseVideo(video, {
          courseId: courseId || 'unknown',
          sectionId: `section_${index}`,
          sectionName: `Section ${index + 1}`,
        });

        if (!result.success) {
          throw new Error(`Video ${index + 1} upload failed: ${result.error.message}`);
        }

        console.log(`[Course Upload API] ✓ Video ${index + 1}/${videoFiles.length} uploaded. CID: ${result.data.cid}, Duration: ${result.data.duration}s`);
        return result.data;
      });

      try {
        const videoResults = await Promise.all(videoUploadPromises);

        // Extract all data including durations
        videoResults.forEach(result => {
          videoCIDs.push(result.cid);
          videoPreviewUrls.push(result.signedUrl || '');
          videoDurations.push(result.duration || 0);

          videoDetails.push({
            cid: result.cid,
            previewUrl: result.signedUrl || '',
            duration: result.duration || 0,
            size: result.size,
            mimeType: result.mimeType,
            expiresAt: result.expiresAt,
          });
        });

        console.log(`[Course Upload API] ✓ All ${videoFiles.length} video(s) uploaded with durations extracted`);
        console.log(`[Course Upload API] Durations:`, videoDurations.map((d, i) => `Video ${i+1}: ${d}s`).join(', '));
      } catch (error) {
        console.error('[Course Upload API] Video upload failed:', error);
        return NextResponse.json(
          {
            success: false,
            error: 'Video upload failed',
            details: error instanceof Error ? error.message : 'Unknown video upload error'
          },
          { status: 400 }
        );
      }
    } else {
      console.log('[Course Upload API] No videos to upload');
    }

    // ==============================================
    // STEP 3: RETURN RESULTS WITH DURATIONS
    // ==============================================

    const totalVideoSize = videoFiles.length > 0
      ? `${(videoFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)}MB`
      : '0MB';

    const response = {
      success: true,
      // Thumbnail data
      thumbnailCID: thumbnailData.cid,
      thumbnailPreviewUrl: thumbnailData.signedUrl,
      thumbnailExpiresAt: thumbnailData.expiresAt,
      // Video data (legacy arrays for backward compatibility)
      videoCIDs,
      videoPreviewUrls,
      videoDurations,  // ✅ NEW: Array of durations for smart contract
      // Video details (NEW: detailed objects for frontend)
      videos: videoDetails,  // ✅ NEW: Full video info with durations
      // Summary
      summary: {
        totalFiles: 1 + videoFiles.length,
        thumbnailSize: `${(thumbnailFile.size / 1024 / 1024).toFixed(2)}MB`,
        videosCount: videoFiles.length,
        totalVideoSize,
        totalDuration: videoDurations.reduce((sum, d) => sum + d, 0),
        totalDurationFormatted: `${Math.floor(videoDurations.reduce((sum, d) => sum + d, 0) / 60)} minutes`,
        storage: 'Pinata Private IPFS',
        signedUrlExpiry: '30 days',
        smartContractReady: true,  // ✅ All data ready for smart contract
        goldskyIndexerReady: true,  // ✅ Duration stored in keyvalues for indexer
      }
    };

    console.log('[Course Upload API] ✅ Upload completed successfully:', response.summary);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Course Upload API] Upload failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/course/upload-assets
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/course/upload-assets',
    methods: ['POST'],
    description: 'Upload course thumbnails and videos to Pinata Private IPFS with duration extraction',
    features: {
      storage: 'Pinata Private IPFS',
      signedUrls: true,
      urlExpiry: '30 days',
      parallelUploads: true,
      metadataTagging: true,
      videoDurationExtraction: true,  // ✅ NEW
      smartContractReady: true,  // ✅ NEW
      goldskyIndexerReady: true,  // ✅ NEW
    },
    smartContract: {
      thumbnailCID: 'string (max 150 chars)',
      contentCID: 'string (max 150 chars)',
      duration: 'uint256 (60-10800 seconds)',
      format: 'Plain CID without ipfs:// prefix',
    },
    limits: {
      thumbnailMaxSizeMB: 5,
      videoMaxSizeMB: 500,
      videoDurationMin: 60,  // seconds (1 minute)
      videoDurationMax: 10800,  // seconds (3 hours)
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedVideoTypes: ['video/mp4', 'video/webm', 'video/mov', 'video/quicktime'],
    },
  });
}
