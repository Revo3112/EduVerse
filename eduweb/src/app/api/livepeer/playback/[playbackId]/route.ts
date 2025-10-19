/**
 * API Route: Get Livepeer Playback Info
 *
 * Fetches playback information for video player
 * Returns parsed source and renditions for quality selector
 *
 * @route GET /api/livepeer/playback/[playbackId]
 */

import { getPlaybackInfo } from "@/services/livepeer-playback.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playbackId: string }> }
) {
  try {
    const { playbackId } = await params;

    if (!playbackId) {
      return NextResponse.json(
        { error: "Playback ID is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Fetching playback info: ${playbackId}`);

    // Get playback info via service
    const playbackInfo = await getPlaybackInfo(playbackId);

    return NextResponse.json({
      success: true,
      playbackId: playbackInfo.playbackId,
      src: playbackInfo.src,
      renditions: playbackInfo.renditions,
      isProcessing: playbackInfo.isProcessing,
      downloadUrl: playbackInfo.downloadUrl,
      type: playbackInfo.type,
    });
  } catch (error) {
    console.error("[API] Failed to get playback info:", error);

    return NextResponse.json(
      {
        error: "Failed to get playback info",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
