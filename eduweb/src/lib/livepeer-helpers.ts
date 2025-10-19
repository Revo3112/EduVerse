/**
 * Livepeer Helper Functions
 *
 * Utility functions for working with Livepeer playback, sources, and Player component
 * These helpers can be used in both server and client components
 *
 * @module lib/livepeer-helpers
 * @see https://docs.livepeer.org/sdks/react/player/Root
 */

import { getSrc as livepeerGetSrc } from "@livepeer/react/external";

// Src type will be inferred from getSrc return type

/**
 * Video quality rendition metadata
 * Extracted from playback info for quality selector UI
 */
export interface VideoRendition {
  /** Quality label (e.g., "360p", "720p", "1080p", "Auto") */
  label: string;
  /** Video width in pixels */
  width?: number;
  /** Video height in pixels */
  height: number;
  /** Bitrate in bits per second */
  bitrate?: number;
  /** Playback URL for this rendition */
  url: string;
  /** Rendition type: "MP4" or "HLS" */
  type: "MP4" | "HLS";
}

/**
 * Parse Livepeer playback info into Player-compatible source
 *
 * @param playbackInfo - Raw playback info from livepeer.playback.get()
 * @returns Parsed source array for Player.Root src prop
 *
 * @example
 * ```typescript
 * const playbackInfo = await livepeerClient.playback.get(playbackId);
 * const src = parsePlaybackSource(playbackInfo);
 *
 * // Use in Player component
 * <Player.Root src={src}>
 *   <Player.Video />
 * </Player.Root>
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsePlaybackSource(playbackInfo: any): any | null {
  if (!playbackInfo?.playbackInfo) {
    console.error("Invalid playback info structure:", playbackInfo);
    return null;
  }

  try {
    return livepeerGetSrc(playbackInfo.playbackInfo);
  } catch (error) {
    console.error("Failed to parse playback source:", error);
    return null;
  }
}

/**
 * Extract video renditions from playback info for quality selector
 *
 * @param playbackInfo - Raw playback info from livepeer.playback.get()
 * @returns Array of available video renditions sorted by quality (lowest to highest)
 *
 * @example
 * ```typescript
 * const renditions = getVideoRenditions(playbackInfo);
 *
 * // Render quality selector
 * {renditions.map(r => (
 *   <button key={r.label}>{r.label}</button>
 * ))}
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getVideoRenditions(playbackInfo: any): VideoRendition[] {
  // Support both direct playbackInfo (from getSrc) and nested format (from old API)
  const sources = playbackInfo?.meta?.source || playbackInfo?.playbackInfo?.meta?.source;

  if (!Array.isArray(sources) || sources.length === 0) {
    console.warn("[getVideoRenditions] No sources found:", playbackInfo);
    return [];
  }

  const renditions: VideoRendition[] = [];

  // Process MP4 renditions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mp4Sources = sources.filter((s: any) => s.hrn === "MP4");
  for (const source of mp4Sources) {
    if (source.height && source.url) {
      renditions.push({
        label: `${source.height}p`,
        width: source.width,
        height: source.height,
        bitrate: source.bitrate,
        url: source.url,
        type: "MP4",
      });
    }
  }

  // Process HLS rendition (adaptive streaming)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsSource = sources.find((s: any) => s.hrn === "HLS (TS)");
  if (hlsSource?.url) {
    renditions.push({
      label: "Auto (HLS)",
      height: 0, // HLS adapts automatically
      url: hlsSource.url,
      type: "HLS",
    });
  }

  console.log("[getVideoRenditions] Found renditions:", renditions.length);

  // Sort by height (quality): lowest to highest
  return renditions.sort((a, b) => a.height - b.height);
}

/**
 * Check if video is still processing/transcoding
 *
 * @param playbackInfo - Raw playback info from livepeer.playback.get()
 * @returns True if video is still processing, false if ready
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isVideoProcessing(playbackInfo: any): boolean {
  // Support both direct playbackInfo and nested format
  const sources = playbackInfo?.meta?.source || playbackInfo?.playbackInfo?.meta?.source;

  // No sources means still processing
  if (!Array.isArray(sources) || sources.length === 0) {
    return true;
  }

  // Only source playback available means transcoding in progress
  // Transcoded renditions will include MP4 or HLS
  const hasTranscodedRenditions = sources.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.hrn === "MP4" || s.hrn === "HLS (TS)"
  );

  return !hasTranscodedRenditions;
}

/**
 * Get best quality MP4 URL for download
 *
 * @param playbackInfo - Raw playback info from livepeer.playback.get()
 * @returns URL of highest quality MP4 rendition, or null if none available
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBestQualityMP4(playbackInfo: any): string | null {
  const renditions = getVideoRenditions(playbackInfo);
  const mp4Renditions = renditions.filter((r) => r.type === "MP4");

  if (mp4Renditions.length === 0) return null;

  // Return highest quality (last in sorted array)
  return mp4Renditions[mp4Renditions.length - 1].url;
}

/**
 * Format video duration from seconds to HH:MM:SS
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatDuration(3665); // "01:01:05"
 * formatDuration(125);  // "02:05"
 * ```
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Validate playback ID format
 * Livepeer playback IDs are typically 16 characters long
 *
 * @param playbackId - Playback ID to validate
 * @returns True if format is valid
 */
export function isValidPlaybackId(playbackId: string): boolean {
  return /^[a-z0-9]{16}$/.test(playbackId);
}

/**
 * Detect if a content ID is a Livepeer playback ID (vs IPFS CID)
 * Used to determine which player to use (Livepeer vs legacy Pinata)
 *
 * Livepeer playback IDs: 16 character lowercase hex strings (e.g. "6d07el8nkjivmr6j")
 * IPFS CIDs: Start with Qm, bafy, or other base58/base32 prefixes (typically 46+ chars)
 *
 * @param contentId - Content ID from course section
 * @returns True if Livepeer playback ID, false if IPFS CID
 *
 * @example
 * ```typescript
 * isLivepeerPlaybackId("6d07el8nkjivmr6j"); // true - Livepeer
 * isLivepeerPlaybackId("QmX7v8..."); // false - IPFS CID
 * isLivepeerPlaybackId("bafybei..."); // false - IPFS CID
 * ```
 */
export function isLivepeerPlaybackId(contentId: string): boolean {
  if (!contentId) return false;

  // IPFS CIDs start with known prefixes and are typically 46+ characters
  const ipfsPrefixes = ['Qm', 'bafy', 'bafk', 'bafybe', 'zdj'];
  const isIpfs = ipfsPrefixes.some(prefix => contentId.startsWith(prefix));

  if (isIpfs) return false;

  // Livepeer playback IDs are exactly 16 lowercase alphanumeric characters
  return /^[a-z0-9]{16}$/.test(contentId);
}
