/**
 * @fileoverview Hybrid Course Asset Upload API Route (OPTION A)
 * @description Uploads course thumbnails to Pinata and creates Livepeer upload endpoints
 * @author EduVerse Platform
 * @date 2025-01-31
 *
 * This API endpoint implements OPTION A (Hybrid Separation):
 * - Thumbnails & Certificates → Pinata IPFS (existing)
 * - Videos → Livepeer with IPFS storage (new)
 *
 * Workflow:
 * 1. Receive thumbnail + video metadata via FormData
 * 2. Upload thumbnail to Pinata (for course cards, certificates)
 * 3. Create Livepeer assets and return TUS endpoints for client-side upload
 * 4. Client uploads videos directly to Livepeer using tus-js-client
 *
 * Smart Contract Storage:
 * - thumbnailCID: Pinata IPFS CID (for static images)
 * - section.contentCID: Livepeer playback ID (16-char hex, auto-detected by HybridVideoPlayer)
 *
 * Detection Logic (HybridVideoPlayer):
 * - 16-char lowercase hex → Livepeer playback ID → LivepeerPlayerView
 * - IPFS CID (Qm or bafy prefix) → Pinata video → LegacyVideoPlayer
 */

import { formatFileSize } from "@/lib/pinata";
import { livepeerClient } from "@/lib/livepeer";
import { uploadCourseThumbnail } from "@/services/thumbnail.service";
import { NextRequest, NextResponse } from "next/server";

const MAX_VIDEOS_PER_REQUEST = 20;

interface UploadRequest {
  thumbnail: File;
  videoMetadata: Array<{
    filename: string;
    size: number;
    type: string;
    sectionId: string;
  }>;
  courseId: string;
}

async function parseAndValidateRequest(request: NextRequest): Promise<
  | {
      success: true;
      data: UploadRequest;
    }
  | {
      success: false;
      error: string;
      status: number;
    }
> {
  try {
    const formData = await request.formData();

    const courseId = formData.get("courseId") as string;
    if (!courseId) {
      return {
        success: false,
        error: "Missing required field: courseId",
        status: 400,
      };
    }

    const thumbnail = formData.get("thumbnail") as File | null;
    if (!thumbnail) {
      return {
        success: false,
        error: "Missing required field: thumbnail",
        status: 400,
      };
    }

    const videoMetadataJson = formData.get("videoMetadata") as string | null;
    if (!videoMetadataJson) {
      return {
        success: false,
        error: "Missing required field: videoMetadata",
        status: 400,
      };
    }

    const videoMetadata = JSON.parse(videoMetadataJson);

    if (!Array.isArray(videoMetadata)) {
      return {
        success: false,
        error: "videoMetadata must be an array",
        status: 400,
      };
    }

    if (videoMetadata.length === 0) {
      console.warn(
        "[Hybrid Upload] No videos provided - course will have no content"
      );
    }

    if (videoMetadata.length > MAX_VIDEOS_PER_REQUEST) {
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
        videoMetadata,
        courseId,
      },
    };
  } catch (error) {
    console.error("[Hybrid Upload] Failed to parse request:", error);
    return {
      success: false,
      error: "Invalid request format",
      status: 400,
    };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("[Hybrid Upload] ========================================");
    console.log("[Hybrid Upload] OPTION A: Pinata Thumbnail + Livepeer Videos");

    const validation = await parseAndValidateRequest(request);
    if (!validation.success) {
      console.error("[Hybrid Upload] Validation failed:", validation.error);
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: validation.status }
      );
    }

    const { thumbnail, videoMetadata, courseId } = validation.data;

    console.log("[Hybrid Upload] Course ID:", courseId);
    console.log(
      "[Hybrid Upload] Thumbnail:",
      thumbnail.name,
      formatFileSize(thumbnail.size)
    );
    console.log("[Hybrid Upload] Videos:", videoMetadata.length);
    videoMetadata.forEach((video, i) => {
      console.log(
        `[Hybrid Upload]   - Video ${i + 1}:`,
        video.filename,
        formatFileSize(video.size)
      );
    });

    console.log("[Hybrid Upload] ----------------------------------------");
    console.log("[Hybrid Upload] Uploading thumbnail to Pinata...");

    const thumbnailResult = await uploadCourseThumbnail(thumbnail, {
      courseId,
      courseName: `Course ${courseId}`,
    });

    if (!thumbnailResult.success) {
      console.error(
        "[Hybrid Upload] Thumbnail upload failed:",
        thumbnailResult.error
      );
      return NextResponse.json(
        {
          success: false,
          error: `Thumbnail upload failed: ${thumbnailResult.error.message}`,
          details: thumbnailResult.error,
        },
        { status: 500 }
      );
    }

    console.log("[Hybrid Upload] ✅ Thumbnail uploaded to Pinata");
    console.log("[Hybrid Upload]    CID:", thumbnailResult.data.cid);

    const tusEndpoints: Array<{
      sectionId: string;
      filename: string;
      assetId: string;
      tusEndpoint: string;
      playbackId: string;
    }> = [];

    if (videoMetadata.length > 0) {
      console.log("[Hybrid Upload] ----------------------------------------");
      console.log(
        "[Hybrid Upload] Creating",
        videoMetadata.length,
        "Livepeer assets..."
      );

      for (let i = 0; i < videoMetadata.length; i++) {
        const video = videoMetadata[i];

        console.log(
          `[Hybrid Upload] Video ${i + 1}/${videoMetadata.length}: ${
            video.filename
          }`
        );

        try {
          const videoName = `${courseId}_${video.sectionId}_${video.filename}`;

          console.log(`[Hybrid Upload] Creating asset with name: ${videoName}`);

          const createResponse = await livepeerClient.asset.create({
            name: videoName,
            staticMp4: true,
            storage: {
              ipfs: true,
            },
          });

          const createData =
            (createResponse as Record<string, unknown>).data || createResponse;
          const dataObj = createData as Record<string, unknown>;

          if (!dataObj || !dataObj.asset || !dataObj.tusEndpoint) {
            throw new Error("Invalid response from Livepeer asset creation");
          }

          const assetObj = dataObj.asset as Record<string, unknown>;
          const assetId = assetObj.id as string;
          let playbackId = (assetObj.playbackId as string) || "";
          const tusEndpoint = dataObj.tusEndpoint as string;

          console.log(`[Hybrid Upload] Asset created:`);
          console.log(`[Hybrid Upload]    Asset ID: ${assetId}`);
          console.log(
            `[Hybrid Upload]    Initial Playback ID: ${
              playbackId || "not yet available"
            }`
          );
          console.log(`[Hybrid Upload]    TUS Endpoint: ${tusEndpoint}`);

          // CRITICAL FIX: Poll for playbackId if not immediately available
          // Livepeer generates playbackId asynchronously after asset creation
          if (!playbackId) {
            console.log(`[Hybrid Upload] Polling for playback ID (max 30s)...`);
            const maxRetries = 15;
            const retryDelay = 2000; // 2 seconds

            for (let retry = 0; retry < maxRetries; retry++) {
              await new Promise((resolve) => setTimeout(resolve, retryDelay));

              try {
                const assetResponse = await livepeerClient.asset.get(assetId);
                const assetData =
                  (assetResponse as Record<string, unknown>).data ||
                  assetResponse;
                const updatedAsset = assetData as Record<string, unknown>;

                playbackId = (updatedAsset.playbackId as string) || "";

                if (playbackId) {
                  console.log(
                    `[Hybrid Upload] ✅ Playback ID retrieved: ${playbackId} (after ${
                      (retry + 1) * 2
                    }s)`
                  );
                  break;
                }

                console.log(
                  `[Hybrid Upload] Retry ${
                    retry + 1
                  }/${maxRetries}: Playback ID not ready yet...`
                );
              } catch (pollError) {
                console.error(
                  `[Hybrid Upload] Error polling asset ${assetId}:`,
                  pollError
                );
              }
            }

            if (!playbackId) {
              throw new Error(
                `Playback ID not available for asset ${assetId} after 30s. Asset may still be processing. Try again later.`
              );
            }
          }

          tusEndpoints.push({
            sectionId: video.sectionId,
            filename: video.filename,
            assetId,
            tusEndpoint,
            playbackId,
          });

          console.log(`[Hybrid Upload] ✅ Asset ${i + 1} created`);
        } catch (error) {
          console.error(`[Hybrid Upload] ❌ Asset ${i + 1} failed:`, error);
          return NextResponse.json(
            {
              success: false,
              error: `Asset creation failed: ${video.filename}`,
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
      }
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("[Hybrid Upload] ========================================");
    console.log(`[Hybrid Upload] ✅ Setup complete in ${elapsedTime}s`);
    console.log("[Hybrid Upload] Thumbnail CID:", thumbnailResult.data.cid);
    console.log("[Hybrid Upload] TUS Endpoints:", tusEndpoints.length);

    return NextResponse.json({
      success: true,
      thumbnailCID: thumbnailResult.data.cid,
      tusEndpoints,
      setupTime: elapsedTime,
    });
  } catch (error) {
    console.error("[Hybrid Upload] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
