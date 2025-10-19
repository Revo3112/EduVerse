import { getSrc } from "@livepeer/react/external";
import { Livepeer } from "livepeer";

/**
 * Server-side function to get playback source for Livepeer player
 *
 * This uses the official Livepeer SDK to fetch playback info and transform
 * it into the correct Src[] format using getSrc().
 *
 * @param playbackId - Livepeer playback ID (16-char hex string)
 * @returns Src[] array for Player.Root component
 */
export async function getPlaybackSource(playbackId: string) {
  try {
    const apiKey = process.env.LIVEPEER_API_KEY;

    if (!apiKey) {
      throw new Error("LIVEPEER_API_KEY is not configured");
    }

    // Initialize Livepeer client
    const livepeer = new Livepeer({
      apiKey,
    });

    console.log("[Livepeer] Fetching playback info for:", playbackId);

    // Fetch playback information from Livepeer API
    const response = await livepeer.playback.get(playbackId);

    if (!response.playbackInfo) {
      throw new Error("No playback info returned from Livepeer");
    }

    console.log("[Livepeer] Playback info received:", {
      type: response.playbackInfo.type,
      meta: response.playbackInfo.meta,
    });

    // Transform playback info into Src[] using official getSrc() helper
    // This handles WebRTC, HLS, and MP4 sources automatically
    const src = getSrc(response.playbackInfo);

    console.log("[Livepeer] Source generated:", {
      sourceCount: src?.length ?? 0,
      types: src?.map((s) => s.type).join(", ") ?? "none",
    });

    return {
      success: true,
      src,
      playbackInfo: response.playbackInfo,
    };
  } catch (error) {
    console.error("[Livepeer] Error fetching playback source:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch playback source",
      src: null,
      playbackInfo: null,
    };
  }
}
