"use server";

import { getPlaybackSource } from "@/lib/livepeer-source";

/**
 * Server Action: Get Livepeer Playback Source
 *
 * Fetches playback info from Livepeer API and returns the Src[] array
 * formatted using getSrc() helper.
 *
 * This is a Server Action that can be called directly from client components.
 *
 * @param playbackId - Livepeer playback ID
 * @returns Object with success status and src array
 */
export async function getLivepeerSource(playbackId: string) {
  return await getPlaybackSource(playbackId);
}
