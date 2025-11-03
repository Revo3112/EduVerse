/**
 * IPFS Helper Functions
 * Utilities for working with Pinata private IPFS files
 *
 * @module ipfs-helpers
 * @description Provides helper functions for generating signed URLs and fetching private IPFS content
 */

/**
 * Generates a signed URL for a given CID (CACHED VERSION - Recommended for thumbnails)
 *
 * Uses GET endpoint with Next.js Data Cache for optimal performance.
 * Significantly reduces Pinata API calls through intelligent caching.
 *
 * Performance:
 * - First request: ~200-500ms (fetches from Pinata)
 * - Cached requests: <10ms (served from Next.js cache)
 * - Cache duration: 50 minutes (safe buffer before 1-hour expiry)
 * - Auto-revalidates using stale-while-revalidate pattern
 *
 * @param cid - IPFS Content Identifier
 * @param expirySeconds - Expiry time in seconds (default: 3600 = 1 hour for thumbnails)
 * @returns Promise with signedUrl, expiresAt, and cached flag
 */
export async function getSignedUrlCached(
  cid: string,
  expirySeconds: number = 3600
): Promise<{ signedUrl: string; expiresAt: number; cid: string; cached?: boolean }> {
  try {
    console.log(`[IPFS Helper - Cached] Fetching signed URL for CID: ${cid}`);

    const response = await fetch(`/api/ipfs/signed-url/${cid}?expiry=${expirySeconds}`, {
      method: 'GET',
      // Note: Caching is handled by the Route Handler's revalidate config
      // Client-side fetch will automatically benefit from server-side cache
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch signed URL');
    }

    const result = await response.json();
    console.log(`[IPFS Helper - Cached] Signed URL fetched successfully`);
    console.log(`[IPFS Helper - Cached] Cached: ${result.cached || false}`);
    console.log(`[IPFS Helper - Cached] Expires at: ${new Date(result.expiresAt).toISOString()}`);

    return {
      signedUrl: result.signedUrl,
      expiresAt: result.expiresAt,
      cid: result.cid,
      cached: result.cached,
    };
  } catch (error) {
    console.error('[IPFS Helper - Cached] Error fetching signed URL:', error);
    throw error;
  }
}

/**
 * Generates a signed URL for a given CID (UNCACHED VERSION - Use for videos or manual refresh)
 *
 * Uses POST endpoint without caching. Suitable for:
 * - Long videos that need custom expiry times
 * - Manual refresh operations
 * - Dynamic content that shouldn't be cached
 *
 * @param cid - IPFS Content Identifier
 * @param expirySeconds - Expiry time in seconds (default: 7200 = 2 hours)
 * @returns Promise with signedUrl and expiresAt
 */
export async function getSignedUrlForCID(
  cid: string,
  expirySeconds: number = 7200
): Promise<{ signedUrl: string; expiresAt: number; cid: string }> {
  try {
    console.log(`[IPFS Helper] Fetching signed URL for CID: ${cid}`);

    const response = await fetch('/api/ipfs/refresh-signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cid, expirySeconds }),
      // Explicitly disable caching for POST requests
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch signed URL');
    }

    const result = await response.json();
    console.log(`[IPFS Helper] Signed URL fetched successfully`);
    console.log(`[IPFS Helper] Expires at: ${new Date(result.expiresAt).toISOString()}`);

    return {
      signedUrl: result.signedUrl,
      expiresAt: result.expiresAt,
      cid: result.cid,
    };
  } catch (error) {
    console.error('[IPFS Helper] Error fetching signed URL:', error);
    throw error;
  }
}

/**
 * Generates signed URLs for multiple CIDs in batch (CACHED VERSION)
 *
 * Uses the cached GET endpoint for optimal performance.
 * Ideal for loading multiple thumbnails at once.
 *
 * @param cids - Array of IPFS Content Identifiers
 * @param expirySeconds - Expiry time in seconds (default: 3600 = 1 hour)
 * @returns Promise with array of results
 */
export async function getBatchSignedUrlsCached(
  cids: string[],
  expirySeconds: number = 3600
): Promise<Array<{ signedUrl: string; expiresAt: number; cid: string; cached?: boolean }>> {
  console.log(`[IPFS Helper - Cached] Fetching ${cids.length} signed URLs in batch...`);

  const promises = cids.map(cid => getSignedUrlCached(cid, expirySeconds));
  const results = await Promise.all(promises);

  const cachedCount = results.filter(r => r.cached).length;
  console.log(`[IPFS Helper - Cached] Successfully fetched ${results.length} signed URLs (${cachedCount} from cache)`);
  return results;
}

/**
 * Generates signed URLs for multiple CIDs in batch (UNCACHED VERSION)
 *
 * Uses POST endpoint without caching. Use for videos or dynamic content.
 *
 * @param cids - Array of IPFS Content Identifiers
 * @param expirySeconds - Expiry time in seconds (default: 7200 = 2 hours)
 * @returns Promise with array of results
 */
export async function getBatchSignedUrls(
  cids: string[],
  expirySeconds: number = 7200
): Promise<Array<{ signedUrl: string; expiresAt: number; cid: string }>> {
  console.log(`[IPFS Helper] Fetching ${cids.length} signed URLs in batch...`);

  const promises = cids.map(cid => getSignedUrlForCID(cid, expirySeconds));
  const results = await Promise.all(promises);

  console.log(`[IPFS Helper] Successfully fetched ${results.length} signed URLs`);
  return results;
}

/**
 * Checks if a signed URL is about to expire
 * @param expiresAt - Expiry timestamp in milliseconds
 * @param thresholdMinutes - Minutes before expiry to consider as "expiring soon" (default: 5)
 * @returns boolean indicating if URL is expiring soon
 */
export function isSignedUrlExpiringSoon(
  expiresAt: number,
  thresholdMinutes: number = 5
): boolean {
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  const thresholdMs = thresholdMinutes * 60 * 1000;

  return timeUntilExpiry > 0 && timeUntilExpiry <= thresholdMs;
}

/**
 * Checks if a signed URL has expired
 * @param expiresAt - Expiry timestamp in milliseconds
 * @returns boolean indicating if URL has expired
 */
export function isSignedUrlExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * Formats time until expiry as human-readable string
 * @param expiresAt - Expiry timestamp in milliseconds
 * @returns Formatted string like "1h 30m" or "5m" or "Expired"
 */
export function formatTimeUntilExpiry(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Type guard to check if CID is valid format
 * @param cid - String to validate
 * @returns boolean indicating if CID appears valid
 */
export function isValidCID(cid: string): boolean {
  // Basic validation: CIDv0 or CIDv1 format
  // CIDv0: starts with "Qm" and is 46 characters
  // CIDv1: starts with "bafy" and is longer

  if (!cid || typeof cid !== 'string') return false;

  const isCIDv0 = cid.startsWith('Qm') && cid.length === 46;
  const isCIDv1 = cid.startsWith('bafy') && cid.length > 50;

  return isCIDv0 || isCIDv1;
}

/**
 * Error class for IPFS-related errors
 */
export class IPFSError extends Error {
  constructor(
    message: string,
    public code: string = 'IPFS_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'IPFSError';
  }
}

/**
 * Fetches course data with signed URLs for all assets
 * @param courseId - Course identifier
 * @returns Promise with course data including signed URLs
 */
export async function getCourseWithSignedUrls(courseId: string | bigint): Promise<{
  thumbnailUrl: string;
  thumbnailExpiresAt: number;
  sections: Array<{
    sectionId: bigint;
    videoUrl: string;
    videoExpiresAt: number;
  }>;
}> {
  // TODO: Replace with actual smart contract call
  // For now, this is a placeholder showing the expected structure

  console.log(`[IPFS Helper] Fetching course ${courseId} with signed URLs...`);

  // Example structure - replace with actual implementation
  throw new IPFSError(
    'getCourseWithSignedUrls not yet implemented - awaiting smart contract integration',
    'NOT_IMPLEMENTED'
  );
}
