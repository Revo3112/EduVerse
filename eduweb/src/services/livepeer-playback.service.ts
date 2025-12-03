/**
 * Livepeer Playback Service
 *
 * Server-side service for fetching playback information and video sources
 * Provides wrapper functions for safe playback info retrieval with error handling
 *
 * @module services/livepeer-playback.service
 * @see https://docs.livepeer.org/api-reference/playback/get
 */

import { livepeerClient } from "@/lib/livepeer";
import {
  getBestQualityMP4,
  getVideoRenditions,
  isVideoProcessing,
  parsePlaybackSource,
  type VideoRendition,
} from "@/lib/livepeer-helpers";

/**
 * Playback source type from Livepeer SDK
 */
type PlaybackSource = ReturnType<typeof parsePlaybackSource>;

/**
 * Raw playback info structure from Livepeer API
 */
interface RawPlaybackInfo {
  type?: string;
  meta?: {
    source?: Array<{
      hrn?: string;
      url?: string;
      height?: number;
      width?: number;
      bitrate?: number;
    }>;
  };
  playbackInfo?: unknown;
}

/**
 * Playback information result
 * Contains parsed sources and metadata for Player component
 */
export interface PlaybackInfoResult {
  /** Playback ID */
  playbackId: string;
  /** Parsed source array for Player.Root src prop */
  src: PlaybackSource | null;
  /** Available video renditions for quality selector */
  renditions: VideoRendition[];
  /** Whether video is still processing/transcoding */
  isProcessing: boolean;
  /** Best quality MP4 URL for download */
  downloadUrl: string | null;
  /** Video type: "live", "vod", or "recording" */
  type: string;
  /** Raw playback info from API (for advanced usage) */
  raw: RawPlaybackInfo;
}

/**
 * Get comprehensive playback information for an asset
 * This is the main function to use for video playback integration
 *
 * @param playbackId - Livepeer playback ID from asset
 * @returns Complete playback information with parsed sources
 *
 * @throws Error if playback ID is invalid or API request fails
 *
 * @example
 * ```typescript
 * // In API route (/api/playback/[playbackId]/route.ts)
 * const playbackInfo = await getPlaybackInfo("eaw4nk06ts2d0mzb");
 *
 * // Return to client for Player component
 * return NextResponse.json({
 *   src: playbackInfo.src,
 *   renditions: playbackInfo.renditions,
 *   isProcessing: playbackInfo.isProcessing
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Usage in component (client-side)
 * const response = await fetch(`/api/playback/${playbackId}`);
 * const { src, renditions } = await response.json();
 *
 * <Player.Root src={src}>
 *   <Player.Video />
 * </Player.Root>
 * ```
 */
export async function getPlaybackInfo(
  playbackId: string
): Promise<PlaybackInfoResult> {
  try {
    console.log(`[Livepeer Playback] Fetching playback info: ${playbackId}`);

    // Fetch playback info from Livepeer API
    const response = await livepeerClient.playback.get(playbackId);

    if (!response.playbackInfo) {
      throw new Error(`No playback info found for: ${playbackId}`);
    }

    // Parse source for Player component
    const src = parsePlaybackSource(response);

    // Extract video renditions for quality selector
    const renditions = getVideoRenditions(response);

    // Check if still processing
    const isProcessing = isVideoProcessing(response);

    // Get best quality MP4 for download
    const downloadUrl = getBestQualityMP4(response);

    const result: PlaybackInfoResult = {
      playbackId,
      src,
      renditions,
      isProcessing,
      downloadUrl,
      type: response.playbackInfo.type || "vod",
      raw: response,
    };

    console.log(`[Livepeer Playback] Playback info retrieved successfully`);
    console.log(`  - Type: ${result.type}`);
    console.log(`  - Renditions: ${renditions.length}`);
    console.log(`  - Processing: ${isProcessing}`);
    console.log(`  - Download URL: ${downloadUrl ? "Available" : "N/A"}`);

    return result;
  } catch (error) {
    console.error("[Livepeer Playback] Failed to get playback info:", error);
    throw new Error(
      `Failed to get playback info: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get playback source only (minimal data for fast loading)
 * Use this when you only need the src for Player component
 *
 * @param playbackId - Livepeer playback ID
 * @returns Parsed source for Player.Root src prop
 *
 * @example
 * ```typescript
 * const src = await getPlaybackSource("eaw4nk06ts2d0mzb");
 * <Player.Root src={src} />
 * ```
 */
export async function getPlaybackSource(
  playbackId: string
): Promise<PlaybackSource | null> {
  try {
    const response = await livepeerClient.playback.get(playbackId);
    return parsePlaybackSource(response);
  } catch (error) {
    console.error("[Livepeer Playback] Failed to get playback source:", error);
    return null;
  }
}

/**
 * Check if video is ready for playback
 * Useful for polling during video processing
 *
 * @param playbackId - Livepeer playback ID
 * @returns True if ready, false if still processing or error
 *
 * @example
 * ```typescript
 * // Poll until video is ready
 * const checkVideo = setInterval(async () => {
 *   const ready = await isPlaybackReady("eaw4nk06ts2d0mzb");
 *   if (ready) {
 *     clearInterval(checkVideo);
 *     // Load player
 *   }
 * }, 5000); // Check every 5 seconds
 * ```
 */
export async function isPlaybackReady(playbackId: string): Promise<boolean> {
  try {
    const response = await livepeerClient.playback.get(playbackId);
    return !isVideoProcessing(response);
  } catch {
    return false;
  }
}

/**
 * Get video metadata from playback info
 * Includes duration, dimensions, bitrate, etc.
 *
 * @param playbackId - Livepeer playback ID
 * @returns Video metadata object
 *
 * @example
 * ```typescript
 * const metadata = await getVideoMetadata("eaw4nk06ts2d0mzb");
 * console.log("Duration:", metadata.duration);
 * console.log("Resolution:", `${metadata.width}x${metadata.height}`);
 * ```
 */
export async function getVideoMetadata(playbackId: string): Promise<{
  duration?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  format?: string;
} | null> {
  try {
    const response = await livepeerClient.playback.get(playbackId);
    const sources = response.playbackInfo?.meta?.source;

    if (!Array.isArray(sources) || sources.length === 0) {
      return null;
    }

    // Get metadata from highest quality source
    interface SourceMeta {
      duration?: number;
      width?: number;
      height?: number;
      bitrate?: number;
      type?: string;
    }
    const highestQuality = sources.reduce(
      (best: SourceMeta | null, current: SourceMeta) => {
        if (!best) return current;
        return (current.height || 0) > (best.height || 0) ? current : best;
      },
      null as SourceMeta | null
    );

    return {
      duration: highestQuality?.duration,
      width: highestQuality?.width,
      height: highestQuality?.height,
      bitrate: highestQuality?.bitrate,
      format: highestQuality?.type,
    };
  } catch (error) {
    console.error("[Livepeer Playback] Failed to get metadata:", error);
    return null;
  }
}

/**
 * Get playback URL for embedding in iframe or external players
 * Returns the embeddable player URL for Livepeer Studio
 *
 * @param playbackId - Livepeer playback ID
 * @param options - Embed options (autoplay, muted, loop)
 * @returns Embeddable player URL
 *
 * @example
 * ```typescript
 * const embedUrl = getEmbedUrl("eaw4nk06ts2d0mzb", {
 *   autoplay: true,
 *   muted: true
 * });
 *
 * <iframe src={embedUrl} allowFullScreen />
 * ```
 */
export function getEmbedUrl(
  playbackId: string,
  options: {
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
  } = {}
): string {
  const params = new URLSearchParams();

  if (options.autoplay !== undefined) {
    params.set("autoplay", String(options.autoplay));
  }
  if (options.muted !== undefined) {
    params.set("muted", String(options.muted));
  }
  if (options.loop !== undefined) {
    params.set("loop", String(options.loop));
  }

  const queryString = params.toString();
  return `https://lvpr.tv?v=${playbackId}${
    queryString ? `&${queryString}` : ""
  }`;
}

/**
 * Get HLS manifest URL for custom players
 * Useful for integrating with Video.js, Plyr, or other HLS players
 *
 * @param playbackId - Livepeer playback ID
 * @returns HLS manifest URL
 *
 * @example
 * ```typescript
 * const hlsUrl = getHLSUrl("eaw4nk06ts2d0mzb");
 *
 * // Use with Video.js
 * videojs('my-video', {
 *   sources: [{ src: hlsUrl, type: 'application/x-mpegURL' }]
 * });
 * ```
 */
export function getHLSUrl(playbackId: string): string {
  return `https://livepeercdn.studio/hls/${playbackId}/index.m3u8`;
}
