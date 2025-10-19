/**
 * @fileoverview Hybrid Course Asset Upload API Route (OPTION A)
 * @description Uploads course thumbnails to Pinata and videos to Livepeer with IPFS
 * @author EduVerse Platform
 * @date 2025-01-18
 *
 * This API endpoint implements OPTION A (Hybrid Separation):
 * - Thumbnails & Certificates → Pinata IPFS (existing)
 * - Videos → Livepeer with IPFS storage (new)
 *
 * Workflow:
 * 1. Receive thumbnail + video files via FormData
 * 2. Upload thumbnail to Pinata (for course cards, certificates)
 * 3. Upload each video to Livepeer:
 *    a. Upload video file
 *    b. Enable IPFS storage on asset
 *    c. Wait for IPFS CID generation
 * 4. Return CIDs compatible with smart contract format
 *
 * Smart Contract Storage:
 * - thumbnailCID: Pinata IPFS CID (for static images)
 * - section.contentCID: Livepeer playback ID (16-char hex, auto-detected by HybridVideoPlayer)
 *
 * Detection Logic (HybridVideoPlayer):
 * - 16-char lowercase hex → Livepeer playback ID → LivepeerPlayerView
 * - IPFS CID (Qm or bafy prefix) → Pinata video → LegacyVideoPlayer
 */

import { formatFileSize } from '@/lib/pinata';
import { enableIPFSStorage } from '@/services/livepeer-upload.service';
import { uploadCourseThumbnail } from '@/services/thumbnail.service';
import { getVideoSizeRecommendation } from '@/services/video.service';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_VIDEOS_PER_REQUEST = 20;
const IPFS_POLLING_INTERVAL = 2000; // 2 seconds
const IPFS_POLLING_MAX_ATTEMPTS = 60; // 2 minutes total

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

    const courseId = formData.get('courseId') as string;
    if (!courseId) {
      return {
        success: false,
        error: 'Missing required field: courseId',
        status: 400,
      };
    }

    const thumbnail = formData.get('thumbnail') as File | null;
    if (!thumbnail) {
      return {
        success: false,
        error: 'Missing required field: thumbnail',
        status: 400,
      };
    }

    const videos = formData.getAll('videos') as File[];
    const sectionIds = formData.getAll('sectionIds') as string[];

    if (videos.length === 0) {
      console.warn('[Hybrid Upload] No videos provided - course will have no content');
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
    console.error('[Hybrid Upload] Failed to parse request:', error);
    return {
      success: false,
      error: 'Invalid request format',
      status: 400,
    };
  }
}

// ============================================================================
// IPFS POLLING HELPER
// ============================================================================

/**
 * Polls Livepeer asset until IPFS CID is available
 */
async function waitForIPFSCID(assetId: string): Promise<string | null> {
  console.log(`[Hybrid Upload] Polling for IPFS CID (asset: ${assetId})...`);

  for (let i = 0; i < IPFS_POLLING_MAX_ATTEMPTS; i++) {
    try {
      // Fetch asset details via API route
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/livepeer/playback/${assetId}`);

      if (response.ok) {
        const data = await response.json();

        // Check if IPFS CID is available
        if (data.asset?.storage?.ipfs?.cid) {
          const ipfsCID = data.asset.storage.ipfs.cid;
          console.log(`[Hybrid Upload] ✅ IPFS CID available: ${ipfsCID}`);
          return ipfsCID;
        }
      }

      // Wait before next attempt
      if (i < IPFS_POLLING_MAX_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, IPFS_POLLING_INTERVAL));
      }
    } catch (error) {
      console.error(`[Hybrid Upload] Polling attempt ${i + 1} failed:`, error);
    }
  }

  console.warn(`[Hybrid Upload] ⚠️ IPFS CID not available after ${IPFS_POLLING_MAX_ATTEMPTS} attempts`);
  return null;
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[Hybrid Upload] ========================================');
    console.log('[Hybrid Upload] OPTION A: Pinata Thumbnail + Livepeer Videos');

    // Step 1: Parse and validate request
    const validation = await parseAndValidateRequest(request);
    if (!validation.success) {
      console.error('[Hybrid Upload] Validation failed:', validation.error);
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const { thumbnail, videos, courseId, sectionIds } = validation.data;

    console.log('[Hybrid Upload] Course ID:', courseId);
    console.log('[Hybrid Upload] Thumbnail:', thumbnail.name, formatFileSize(thumbnail.size));
    console.log('[Hybrid Upload] Videos:', videos.length);
    videos.forEach((video, i) => {
      const recommendation = getVideoSizeRecommendation(video.size);
      console.log(`[Hybrid Upload]   - Video ${i + 1}:`, video.name, formatFileSize(video.size));
      if (!recommendation.isOptimal) {
        console.warn(`[Hybrid Upload]     WARNING: ${recommendation.message}`);
      }
    });

    // Step 2: Upload thumbnail to Pinata
    console.log('[Hybrid Upload] ----------------------------------------');
    console.log('[Hybrid Upload] Uploading thumbnail to Pinata...');

    const thumbnailResult = await uploadCourseThumbnail(thumbnail, {
      courseId,
      courseName: `Course ${courseId}`,
    });

    if (!thumbnailResult.success) {
      console.error('[Hybrid Upload] Thumbnail upload failed:', thumbnailResult.error);
      return NextResponse.json(
        {
          success: false,
          error: `Thumbnail upload failed: ${thumbnailResult.error.message}`,
          details: thumbnailResult.error,
        },
        { status: 500 }
      );
    }

    console.log('[Hybrid Upload] ✅ Thumbnail uploaded to Pinata');
    console.log('[Hybrid Upload]    CID:', thumbnailResult.data.cid);

    // Step 3: Upload videos to Livepeer with IPFS
    const videoResults: Array<{
      sectionId: string;
      filename: string;
      cid: string; // Livepeer playback ID (will be used as contentCID)
      ipfsCid: string | null; // Actual IPFS CID (optional, for reference)
      duration: number;
    }> = [];

    if (videos.length > 0) {
      console.log('[Hybrid Upload] ----------------------------------------');
      console.log('[Hybrid Upload] Uploading', videos.length, 'videos to Livepeer...');

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const sectionId = sectionIds[i];

        console.log(`[Hybrid Upload] Video ${i + 1}/${videos.length}: ${video.name}`);

        try {
          // Upload video file to Livepeer via upload API
          const videoFormData = new FormData();
          videoFormData.append('file', video);
          videoFormData.append('name', `${courseId}_${sectionId}_${video.name}`);

          const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/livepeer/upload`, {
            method: 'POST',
            body: videoFormData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          const uploadResult = await uploadResponse.json();
          const assetId = uploadResult.asset.id;
          const playbackId = uploadResult.asset.playbackId;
          const duration = uploadResult.asset.videoSpec?.duration || 0;

          console.log(`[Hybrid Upload] ✅ Video uploaded to Livepeer`);
          console.log(`[Hybrid Upload]    Asset ID: ${assetId}`);
          console.log(`[Hybrid Upload]    Playback ID: ${playbackId}`);
          console.log(`[Hybrid Upload]    Duration: ${duration}s`);

          // Enable IPFS storage
          console.log(`[Hybrid Upload] Enabling IPFS storage...`);
          const ipfsResult = await enableIPFSStorage(assetId);

          if (ipfsResult.cid) {
            console.log(`[Hybrid Upload] ✅ IPFS storage enabled: ${ipfsResult.cid}`);
          } else {
            console.warn(`[Hybrid Upload] ⚠️ IPFS CID not immediately available`);
          }

          // Poll for IPFS CID (optional - don't block if not available)
          const ipfsCid = await waitForIPFSCID(assetId);

          // Store result with playback ID as primary CID
          // HybridVideoPlayer will detect this as Livepeer content
          videoResults.push({
            sectionId,
            filename: video.name,
            cid: playbackId, // ✅ Use playback ID as contentCID for smart contract
            ipfsCid: ipfsCid || null, // Optional IPFS CID for reference
            duration: Math.round(duration),
          });

          console.log(`[Hybrid Upload] ✅ Video ${i + 1} complete`);
        } catch (error) {
          console.error(`[Hybrid Upload] ❌ Video ${i + 1} failed:`, error);
          return NextResponse.json(
            {
              success: false,
              error: `Video upload failed: ${video.name}`,
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }
      }
    }

    // Step 4: Return results in compatible format
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('[Hybrid Upload] ========================================');
    console.log(`[Hybrid Upload] ✅ Upload complete in ${elapsedTime}s`);
    console.log('[Hybrid Upload] Thumbnail CID:', thumbnailResult.data.cid);
    console.log('[Hybrid Upload] Video Count:', videoResults.length);

    return NextResponse.json({
      success: true,
      thumbnailCID: thumbnailResult.data.cid, // Pinata CID for thumbnail
      videos: videoResults, // Array with playback IDs as CIDs
      uploadTime: elapsedTime,
    });
  } catch (error) {
    console.error('[Hybrid Upload] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
