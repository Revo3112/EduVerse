/**
 * Livepeer Studio API Client Configuration
 *
 * Server-side only - NEVER import this file in client-side components
 * Used for: Asset creation, IPFS storage, playback info retrieval
 *
 * @module lib/livepeer
 * @see https://docs.livepeer.org/sdks/javascript
 */

import { Livepeer } from "livepeer";

// Validate API key presence
if (!process.env.LIVEPEER_API_KEY) {
  throw new Error(
    "LIVEPEER_API_KEY is not defined in environment variables. " +
    "Please add it to .env.local file."
  );
}

/**
 * Singleton Livepeer client instance
 *
 * @example
 * ```typescript
 * import { livepeerClient } from "@/lib/livepeer";
 *
 * // Fetch playback info
 * const playbackInfo = await livepeerClient.playback.get(playbackId);
 *
 * // Create asset via URL
 * const asset = await livepeerClient.asset.createViaUrl({
 *   url: "ipfs://QmXXX...",
 *   name: "video.mp4"
 * });
 * ```
 */
export const livepeerClient = new Livepeer({
  apiKey: process.env.LIVEPEER_API_KEY,
});

/**
 * Type exports for Livepeer API responses
 * Re-export commonly used types for convenience
 */
export type {
  Asset,
  PlaybackInfo,
  Task,
  TranscodeProfile
} from "livepeer/models/components";
