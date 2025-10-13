/**
 * @fileoverview Course Asset Upload API Route (Pinata Version)
 * @description Handles IPFS uploads for course thumbnails and section videos via Pinata
 * @author EduVerse Platform
 * @date 2025-01-12
 *
 * This API endpoint processes course asset uploads during the publish workflow.
 * It uploads files to Pinata private IPFS and returns CIDs and signed URLs.
 *
 * **IMPORTANT: This endpoint is ONLY called during course publishing, never during draft saves.**
 *
 * Workflow:
 * 1. Receive thumbnail + video files via FormData
 * 2. Validate all files
 * 3. Upload thumbnail to Pinata private IPFS
 * 4. Upload all videos to Pinata private IPFS (sequential for stability)
 * 5. Generate signed URLs for immediate access
 * 6. Return CIDs (plain format) and signed URLs
 *
 * Smart Contract Requirements:
 * - thumbnailCID: string (max 150 chars) - Plain CID without "ipfs://" prefix
 * - section.videoCID: string (max 150 chars) - Plain CID without "ipfs://" prefix
 *
 * Security:
 * - All uploads go to Pinata PRIVATE network
 * - Content accessed via signed URLs that expire
 * - Signed URLs regenerated as needed
 */

import { formatFileSize } from '@/lib/pinata';
import { uploadCourseThumbnail } from '@/services/thumbnail.service';
import { estimateUploadTime, getVideoSizeRecommendation, uploadCourseVideo } from '@/services/video.service';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_VIDEOS_PER_REQUEST = 20; // Prevent overwhelming the server

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

interface UploadRequest {
  thumbnail: File;
  videos: File[];
  courseId: string;
  sectionIds: string[];
}

/**
 * Validates and parses the multipart form data
 */
async function parseAndValidateRequest(request: NextRequest): Promise<{
  success: true;
  data: UploadRequest;
} | {
  success: false;
  error: string;
  status: number;
}> {
  try {
    const formData = await request.formData();

    // Extract course ID
    const courseId = formData.get('courseId') as string;
    if (!courseId) {
      return {
        success: false,
        error: 'Missing required field: courseId',
        status: 400,
      };
    }

    // Extract thumbnail
    const thumbnail = formData.get('thumbnail') as File | null;
    if (!thumbnail) {
      return {
        success: false,
        error: 'Missing required field: thumbnail',
        status: 400,
      };
    }

    // Extract videos and section IDs
    const videos = formData.getAll('videos') as File[];
    const sectionIds = formData.getAll('sectionIds') as string[];

    if (videos.length === 0) {
      console.warn('[Upload API] No videos provided - course will have no content');
    }

    if (videos.length !== sectionIds.length) {
      return {
        success: false,
        error: `Mismatch: ${videos.length} videos but ${sectionIds.length} section IDs`,
        status: 400,
      };
    }

    if (videos.length > MAX_VIDEOS_PER_REQUEST) {
      return {
        success: false,
        error: `Too many videos: maximum ${MAX_VIDEOS_PER_REQUEST} per request`,
        status: 400,
      };
    }

    return {
      success: true,
      data: {
        thumbnail,
        videos,
        courseId,
        sectionIds,
      },
    };
  } catch (error) {
    console.error('[Upload API] Failed to parse request:', error);
    return {
      success: false,
      error: 'Invalid request format',
      status: 400,
    };
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[Upload API] ========================================');
    console.log('[Upload API] Received upload request');

    // Step 1: Parse and validate request
    const validation = await parseAndValidateRequest(request);
    if (!validation.success) {
      console.error('[Upload API] Validation failed:', validation.error);
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const { thumbnail, videos, courseId, sectionIds } = validation.data;

    console.log('[Upload API] Course ID:', courseId);
    console.log('[Upload API] Thumbnail:', thumbnail.name, formatFileSize(thumbnail.size));
    console.log('[Upload API] Videos:', videos.length);
    videos.forEach((video, i) => {
      const recommendation = getVideoSizeRecommendation(video.size);
      console.log(`[Upload API]   - Video ${i + 1}:`, video.name, formatFileSize(video.size));
      if (!recommendation.isOptimal) {
        console.warn(`[Upload API]     WARNING: ${recommendation.message}`);
      }
    });

    // Step 2: Upload thumbnail
    console.log('[Upload API] ----------------------------------------');
    console.log('[Upload API] Uploading thumbnail...');

    const thumbnailResult = await uploadCourseThumbnail(thumbnail, {
      courseId,
      courseName: `Course ${courseId}`, // Can be enhanced with actual course name
    });

    if (!thumbnailResult.success) {
      console.error('[Upload API] Thumbnail upload failed:', thumbnailResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `Thumbnail upload failed: ${thumbnailResult.error.message}`,
          details: thumbnailResult.error,
        },
        { status: 500 }
      );
    }

    console.log('[Upload API] ✅ Thumbnail uploaded successfully');
    console.log('[Upload API]    CID:', thumbnailResult.data.cid);
    console.log('[Upload API]    Signed URL expires:', thumbnailResult.data.expiresAt);

    // Step 3: Upload videos sequentially
    const videoCIDs: string[] = [];
    const videoSignedUrls: string[] = [];
    const videoDurations: number[] = [];
    const videoUploadResults: Array<{ success: boolean; error?: string }> = [];

    if (videos.length > 0) {
      console.log('[Upload API] ----------------------------------------');
      console.log('[Upload API] Uploading', videos.length, 'videos...');

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const sectionId = sectionIds[i];
        const estimatedTime = estimateUploadTime(video.size);

        console.log(`[Upload API] Video ${i + 1}/${videos.length}:`, video.name);
        console.log(`[Upload API]    Size: ${formatFileSize(video.size)}`);
        console.log(`[Upload API]    Estimated upload time: ${Math.ceil(estimatedTime / 60)} minutes`);

        const videoResult = await uploadCourseVideo(video, {
          courseId,
          sectionId,
          sectionName: `Section ${i + 1}`,
        });

        if (videoResult.success) {
          videoCIDs.push(videoResult.data.cid);
          videoSignedUrls.push(videoResult.data.signedUrl || '');
          videoDurations.push(videoResult.data.duration || 0);
          videoUploadResults.push({ success: true });
          console.log(`[Upload API] ✅ Video ${i + 1} uploaded successfully`);
          console.log(`[Upload API]    CID: ${videoResult.data.cid}`);
          console.log(`[Upload API]    Duration: ${videoResult.data.duration ?? 0}s (${Math.floor((videoResult.data.duration ?? 0) / 60)}m ${(videoResult.data.duration ?? 0) % 60}s)`);
        } else {
          console.error(`[Upload API] ❌ Video ${i + 1} failed:`, videoResult.error.message);
          videoUploadResults.push({
            success: false,
            error: videoResult.error.message,
          });
          videoCIDs.push(''); // Placeholder for failed upload
          videoSignedUrls.push('');
          videoDurations.push(0); // Placeholder for failed upload
        }
      }
    }

    // Step 4: Calculate summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const successfulVideos = videoUploadResults.filter(r => r.success).length;

    console.log('[Upload API] ========================================');
    console.log('[Upload API] Upload complete in', totalTime, 'seconds');
    console.log('[Upload API] Thumbnail: ✅ Success');
    console.log('[Upload API] Videos:', `${successfulVideos}/${videos.length} successful`);

    // Return response matching frontend expectations (flat structure)
    const response = {
      success: true,
      thumbnailCID: thumbnailResult.data.cid,
      thumbnailSignedUrl: thumbnailResult.data.signedUrl,
      thumbnailExpiresAt: thumbnailResult.data.expiresAt,
      videos: videos.map((_, index) => ({
        cid: videoCIDs[index] || null,
        signedUrl: videoSignedUrls[index] || null,
        duration: videoDurations[index] || 0,
        success: videoUploadResults[index].success,
        error: videoUploadResults[index].error,
      })),
      videoDurations: videoDurations, // ✅ Add durations array for easy mapping to sections
      meta: {
        courseId,
        totalUploadTime: totalTime,
        thumbnailSize: thumbnailResult.data.size,
        thumbnailSuccess: true,
        videosUploaded: successfulVideos,
        videosTotal: videos.length,
        totalDuration: videoDurations.reduce((sum, d) => sum + d, 0), // Total course duration
        allSuccess: successfulVideos === videos.length,
        storage: 'Pinata Private IPFS',
        signedUrlExpiry: '30 days',
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('[Upload API] ========================================');
    console.error('[Upload API] Fatal error after', totalTime, 'seconds');
    console.error('[Upload API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS HANDLER (CORS)
// ============================================================================

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
