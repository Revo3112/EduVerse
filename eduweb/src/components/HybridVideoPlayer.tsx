"use client";

import { isLivepeerPlaybackId } from "@/lib/livepeer-helpers";
import { EnrichedCourseSection, SectionProgress } from "@/lib/mock-data";
import { LegacyVideoPlayer } from "./LegacyVideoPlayer";
import { LivepeerPlayerView } from "./LivepeerPlayerView";

interface HybridVideoPlayerProps {
  section: EnrichedCourseSection;
  progress: SectionProgress | null;
  onProgressUpdate: (time: number) => void;
  onComplete?: () => void;
}

/**
 * Hybrid Video Player Wrapper
 *
 * Automatically detects whether to use:
 * - **Livepeer Player**: For new videos uploaded via Livepeer (playback ID format)
 * - **Legacy Player**: For existing Pinata IPFS videos (IPFS CID format)
 *
 * This ensures backward compatibility while enabling new Livepeer features for future uploads.
 *
 * Detection:
 * - Livepeer playback IDs: 16 char hex (e.g. "6d07el8nkjivmr6j")
 * - IPFS CIDs: Qm... or bafy... prefixes (46+ chars)
 */
export function HybridVideoPlayer({
  section,
  progress,
  onProgressUpdate,
  onComplete,
}: HybridVideoPlayerProps) {
  const isLivepeer = isLivepeerPlaybackId(section.contentCID);

  console.log("[Hybrid Player] Detected video type:", {
    contentCID: section.contentCID,
    isLivepeer,
    playerType: isLivepeer ? "Livepeer Player" : "Legacy Player (Pinata IPFS)",
  });

  if (isLivepeer) {
    // NEW: Use Livepeer Player with playback API
    return (
      <LivepeerPlayerView
        playbackId={section.contentCID}
        onProgressUpdate={onProgressUpdate}
        onComplete={onComplete}
        chapters={section.videoMetadata.chapters}
      />
    );
  }

  // LEGACY: Use existing Pinata signed URL player for backward compatibility
  return (
    <LegacyVideoPlayer
      section={section}
      progress={progress}
      onProgressUpdate={onProgressUpdate}
    />
  );
}
