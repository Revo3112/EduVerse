import { useCallback, useEffect, useState } from 'react';

interface UseSignedUrlOptions {
  cid: string;
  initialSignedUrl: string;
  expiresAt: number;
  refreshThreshold?: number; // milliseconds before expiry to refresh
  enabled?: boolean; // Enable/disable auto-refresh
}

interface UseSignedUrlReturn {
  signedUrl: string;
  expiresAt: number;
  isRefreshing: boolean;
  refreshSignedUrl: () => Promise<void>;
  timeUntilExpiry: number;
}

/**
 * Hook to automatically refresh signed URLs before expiry
 *
 * Features:
 * - Automatic refresh before expiry (default: 1 minute)
 * - Manual refresh support
 * - Expiry countdown
 * - Error handling with retry
 *
 * @example
 * ```tsx
 * function VideoPlayer({ videoCID, initialUrl, expiresAt }) {
 *   const { signedUrl, isRefreshing, timeUntilExpiry } = useSignedUrl({
 *     cid: videoCID,
 *     initialSignedUrl: initialUrl,
 *     expiresAt,
 *   });
 *
 *   return (
 *     <div>
 *       <video src={signedUrl} controls />
 *       {isRefreshing && <p>Refreshing video URL...</p>}
 *       <p>URL expires in {Math.round(timeUntilExpiry / 1000)}s</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSignedUrl({
  cid,
  initialSignedUrl,
  expiresAt,
  refreshThreshold = 60000, // 1 minute
  enabled = true,
}: UseSignedUrlOptions): UseSignedUrlReturn {
  const [signedUrl, setSignedUrl] = useState(initialSignedUrl);
  const [expiryTime, setExpiryTime] = useState(expiresAt);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(expiresAt - Date.now());

  /**
   * Refresh the signed URL via API
   */
  const refreshSignedUrl = useCallback(async () => {
    if (isRefreshing || !enabled) return;

    try {
      setIsRefreshing(true);
      console.log(`[useSignedUrl] Refreshing signed URL for CID: ${cid}`);

      const response = await fetch('/api/ipfs/refresh-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh signed URL');
      }

      const result = await response.json();
      setSignedUrl(result.signedUrl);
      setExpiryTime(result.expiresAt);

      console.log(`[useSignedUrl] Signed URL refreshed successfully`);
      console.log(`[useSignedUrl] New expiry: ${new Date(result.expiresAt).toISOString()}`);

    } catch (error) {
      console.error('[useSignedUrl] Refresh error:', error);

      // Retry once after 5 seconds
      setTimeout(() => {
        if (!isRefreshing) {
          console.log('[useSignedUrl] Retrying refresh...');
          refreshSignedUrl();
        }
      }, 5000);

    } finally {
      setIsRefreshing(false);
    }
  }, [cid, isRefreshing, enabled]);

  /**
   * Update time until expiry every second
   */
  useEffect(() => {
    if (!enabled) return;

    const updateInterval = setInterval(() => {
      const now = Date.now();
      const remaining = expiryTime - now;
      setTimeUntilExpiry(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(updateInterval);
  }, [expiryTime, enabled]);

  /**
   * Auto-refresh timer
   * Checks every 30 seconds if refresh is needed
   */
  useEffect(() => {
    if (!enabled) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;

      // Refresh if within threshold and not already expired
      if (timeUntilExpiry <= refreshThreshold && timeUntilExpiry > 0) {
        const minutesRemaining = Math.round(timeUntilExpiry / 60000);
        console.log(
          `[useSignedUrl] Signed URL expiring in ${minutesRemaining} minute(s), refreshing...`
        );
        refreshSignedUrl();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [expiryTime, refreshThreshold, refreshSignedUrl, enabled]);

  /**
   * Refresh immediately if URL is already expired
   */
  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    if (expiryTime <= now) {
      console.log('[useSignedUrl] Signed URL already expired, refreshing immediately...');
      refreshSignedUrl();
    }
  }, [expiryTime, refreshSignedUrl, enabled]);

  return {
    signedUrl,
    expiresAt: expiryTime,
    isRefreshing,
    refreshSignedUrl,
    timeUntilExpiry,
  };
}

/**
 * Format time until expiry as human-readable string
 */
export function formatTimeUntilExpiry(milliseconds: number): string {
  if (milliseconds <= 0) return 'Expired';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
