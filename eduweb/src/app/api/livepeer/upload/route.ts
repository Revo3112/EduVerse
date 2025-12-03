/**
 * API Route: Request Upload URL from Livepeer
 *
 * This endpoint requests a TUS upload URL from Livepeer.
 * Client should then upload the file DIRECTLY to Livepeer using the TUS endpoint.
 *
 * Flow:
 * 1. Client calls this endpoint with video metadata
 * 2. Backend requests tusEndpoint from Livepeer API
 * 3. Client uploads file directly to tusEndpoint using tus-js-client
 *
 * @route POST /api/livepeer/upload
 * @see https://docs.livepeer.org/api-reference/asset/upload
 */

import { livepeerClient, type Asset, type Task } from "@/lib/livepeer";
import { NextRequest, NextResponse } from "next/server";

/**
 * Upload response data structure from Livepeer SDK
 */
interface UploadResponseData {
  tusEndpoint?: string;
  url?: string;
  asset?: Asset;
  task?: Task;
  data?: {
    tusEndpoint?: string;
    url?: string;
    asset?: Asset;
    task?: Task;
  };
}

/**
 * Request body schema
 */
interface RequestUploadBody {
  /** Display name for the asset */
  name: string;
  /** Whether to generate static MP4 for instant playback */
  staticMp4?: boolean;
  /** Enable IPFS storage immediately */
  enableIPFS?: boolean;
  /** Additional storage options */
  storage?: {
    ipfs?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestUploadBody = await request.json();
    const { name, staticMp4 = true, enableIPFS = false } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Video name is required" },
        { status: 400 }
      );
    }

    console.log(`[API Upload] Requesting upload URL for: ${name}`);
    console.log(`[API Upload] IPFS enabled: ${enableIPFS}`);

    const createPayload: {
      name: string;
      staticMp4: boolean;
      profiles: Array<{
        name: string;
        bitrate: number;
        fps: number;
        width: number;
        height: number;
      }>;
      storage?: { ipfs: boolean };
    } = {
      name,
      staticMp4,
      profiles: [
        {
          name: "360p",
          bitrate: 800000,
          fps: 30,
          width: 640,
          height: 360,
        },
        {
          name: "480p",
          bitrate: 1400000,
          fps: 30,
          width: 854,
          height: 480,
        },
        {
          name: "720p",
          bitrate: 2800000,
          fps: 30,
          width: 1280,
          height: 720,
        },
        {
          name: "1080p",
          bitrate: 5000000,
          fps: 30,
          width: 1920,
          height: 1080,
        },
      ],
    };

    if (enableIPFS) {
      createPayload.storage = { ipfs: true };
      console.log(`[API Upload] Adding IPFS storage to asset creation`);
    }

    const response = await livepeerClient.asset.create(createPayload);

    // Handle different response structures (SDK might wrap in .data)
    const responseData = response as unknown as UploadResponseData;
    const data = responseData.data || responseData;

    if (!data || !data.asset) {
      console.error("[API Upload] Invalid response structure");
      throw new Error("Invalid response from Livepeer API");
    }

    console.log(`[API Upload] Upload URL requested successfully`);
    console.log(`  - Asset ID: ${data.asset.id}`);
    console.log(`  - Playback ID: ${data.asset.playbackId || "pending"}`);

    // Return upload URLs and asset info to client
    return NextResponse.json({
      success: true,
      tusEndpoint: data.tusEndpoint,
      url: data.url,
      asset: {
        id: data.asset.id,
        playbackId: data.asset.playbackId,
        name: data.asset.name,
      },
      task: data.task
        ? {
            id: data.task.id,
          }
        : undefined,
    });
  } catch (error) {
    console.error("[API Upload] Failed to request upload URL:", error);

    return NextResponse.json(
      {
        error: "Failed to request upload URL",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
