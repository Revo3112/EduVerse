/**
 * Livepeer Upload Service
 *
 * Server-side service for uploading videos to Livepeer with IPFS storage
 * For client-side uploads, use the useCreateAsset and useUpdateAsset hooks directly
 *
 * @module services/livepeer-upload.service
 * @see https://docs.livepeer.org/api-reference/asset/upload-via-url
 */

import { livepeerClient, type Asset, type Task } from "@/lib/livepeer";

/**
 * Livepeer SDK response structure for createViaUrl
 */
interface UploadViaUrlResponse {
  asset?: Asset;
  task?: Task;
  data?: {
    asset?: Asset;
    task?: Task;
  };
}

/**
 * Upload result containing asset and task information
 */
export interface LivepeerUploadResult {
  /** Created asset with playback info */
  asset: Asset;
  /** Background task processing the upload */
  task: Task;
  /** Playback ID for immediate use (before IPFS storage) */
  playbackId: string;
  /** IPFS CID (available after enableIPFSStorage is called) */
  ipfsCid?: string;
}

/**
 * IPFS storage result
 */
export interface IPFSStorageResult {
  /** IPFS CID of the video */
  cid: string;
  /** IPFS gateway URL */
  gatewayUrl: string;
  /** NFT metadata CID (if applicable) */
  nftMetadataCid?: string;
}

/**
 * Upload video to Livepeer from a URL source
 * Useful for uploading videos already stored in IPFS (Pinata) or S3
 *
 * @param url - Source URL (supports https://, ipfs://, ar:// protocols)
 * @param name - Display name for the asset
 * @param enableIPFS - Whether to enable IPFS storage immediately (default: false)
 * @returns Upload result with asset, task, and playback ID
 *
 * @example
 * ```typescript
 * // Upload from IPFS CID
 * const result = await uploadVideoFromURL(
 *   "ipfs://QmXXXXX...",
 *   "course-intro.mp4",
 *   true
 * );
 * console.log("Playback ID:", result.playbackId);
 * console.log("IPFS CID:", result.ipfsCid);
 * ```
 *
 * @example
 * ```typescript
 * // Upload from HTTPS URL
 * const result = await uploadVideoFromURL(
 *   "https://example.com/video.mp4",
 *   "tutorial.mp4"
 * );
 * ```
 */
export async function uploadVideoFromURL(
  url: string,
  name: string,
  enableIPFS: boolean = false
): Promise<LivepeerUploadResult> {
  try {
    console.log(`[Livepeer Upload] Starting upload from URL: ${url}`);

    const rawResponse = await livepeerClient.asset.createViaUrl({
      url,
      name,
      // Enable static MP4 for short videos (<2min) for instant playback
      staticMp4: true,
      // Enable IPFS storage if requested
      ...(enableIPFS && {
        storage: {
          ipfs: true,
        },
      }),
    });

    // Handle different response structures from SDK
    const response = rawResponse as unknown as UploadViaUrlResponse;
    const data = response.data || response;

    if (!data.asset || !data.task) {
      throw new Error("Invalid response from Livepeer API");
    }

    const result: LivepeerUploadResult = {
      asset: data.asset,
      task: data.task,
      playbackId: data.asset.playbackId || "",
      ipfsCid: data.asset.storage?.ipfs?.nftMetadata?.cid,
    };

    console.log(`[Livepeer Upload] Upload initiated successfully`);
    console.log(`  - Asset ID: ${data.asset.id}`);
    console.log(`  - Playback ID: ${result.playbackId}`);
    console.log(`  - Task ID: ${data.task.id}`);
    if (result.ipfsCid) {
      console.log(`  - IPFS CID: ${result.ipfsCid}`);
    }

    return result;
  } catch (error) {
    console.error("[Livepeer Upload] Upload failed:", error);
    throw new Error(
      `Failed to upload video to Livepeer: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Enable IPFS storage for an existing Livepeer asset
 * Call this after video has been uploaded and transcoded
 *
 * @param assetId - Livepeer asset ID
 * @returns IPFS storage information
 *
 * @example
 * ```typescript
 * // Enable IPFS after upload
 * const ipfsInfo = await enableIPFSStorage("09F8B46C-61A0-4254-9875-F71F4C605BC7");
 * console.log("IPFS CID:", ipfsInfo.cid);
 * console.log("Gateway URL:", ipfsInfo.gatewayUrl);
 * ```
 */
export async function enableIPFSStorage(
  assetId: string
): Promise<IPFSStorageResult> {
  try {
    console.log(`[Livepeer IPFS] Enabling IPFS storage for asset: ${assetId}`);

    // First, check if asset is ready
    const assetResponse = await livepeerClient.asset.get(assetId);
    const responseData = assetResponse as unknown as { asset?: Asset } | Asset;
    const asset =
      "asset" in responseData && responseData.asset
        ? responseData.asset
        : (responseData as Asset);

    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const phase = asset.status?.phase;
    console.log(`[Livepeer IPFS] Asset status: ${phase}`);

    if (phase !== "ready") {
      throw new Error(
        `Asset is not ready for IPFS storage. Current status: ${phase}. Please wait for processing to complete.`
      );
    }

    // Update asset with IPFS storage enabled
    // Note: SDK signature is update(payload, assetId) not update(assetId, payload)
    console.log(`[Livepeer IPFS] Requesting IPFS storage enablement...`);
    await livepeerClient.asset.update(
      {
        storage: {
          ipfs: true,
        },
      },
      assetId
    );

    // Poll for IPFS CID generation (Livepeer may need extra time to pin to IPFS)
    console.log(`[Livepeer IPFS] Polling for IPFS CID generation...`);
    const maxAttempts = 10;
    const pollInterval = 3000; // 3 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const pollResponse = await livepeerClient.asset.get(assetId);
      const pollData = pollResponse as unknown as { asset?: Asset } | Asset;
      const polledAsset =
        "asset" in pollData && pollData.asset
          ? pollData.asset
          : (pollData as Asset);

      const ipfsCid = polledAsset.storage?.ipfs?.nftMetadata?.cid;
      if (ipfsCid) {
        const result: IPFSStorageResult = {
          cid: ipfsCid,
          gatewayUrl:
            polledAsset.storage?.ipfs?.nftMetadata?.gatewayUrl ||
            `https://ipfs.io/ipfs/${ipfsCid}`,
          nftMetadataCid: ipfsCid,
        };

        console.log(`[Livepeer IPFS] IPFS storage enabled successfully`);
        console.log(`  - CID: ${result.cid}`);
        console.log(`  - Gateway URL: ${result.gatewayUrl}`);
        console.log(`  - Attempts: ${attempt}/${maxAttempts}`);

        return result;
      }

      if (attempt < maxAttempts) {
        console.log(
          `[Livepeer IPFS] CID not ready yet, waiting... (${attempt}/${maxAttempts})`
        );
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(
      `IPFS CID not generated after ${
        (maxAttempts * pollInterval) / 1000
      } seconds. ` +
        `This may indicate an issue with IPFS pinning. Please try again later or contact support.`
    );
  } catch (error) {
    console.error("[Livepeer IPFS] Failed to enable IPFS storage:", error);
    throw new Error(
      `Failed to enable IPFS storage: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get detailed asset information including IPFS CID and playback ID
 * Useful for checking upload status and retrieving metadata
 *
 * @param assetId - Livepeer asset ID
 * @returns Full asset details
 *
 * @example
 * ```typescript
 * const asset = await getAssetDetails("09F8B46C-61A0-4254-9875-F71F4C605BC7");
 * console.log("Status:", asset.status?.phase); // "ready", "processing", etc.
 * console.log("Duration:", asset.videoSpec?.duration);
 * console.log("IPFS CID:", asset.storage?.ipfs?.cid);
 * ```
 */
export async function getAssetDetails(assetId: string): Promise<Asset> {
  try {
    const response = await livepeerClient.asset.get(assetId);

    if (!response.asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    return response.asset;
  } catch (error) {
    console.error("[Livepeer] Failed to get asset details:", error);
    throw new Error(
      `Failed to get asset details: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Check if asset is ready for playback
 *
 * @param assetId - Livepeer asset ID
 * @returns True if asset is ready, false if still processing
 */
export async function isAssetReady(assetId: string): Promise<boolean> {
  try {
    const asset = await getAssetDetails(assetId);
    return asset.status?.phase === "ready";
  } catch {
    return false;
  }
}

/**
 * Upload video from Pinata IPFS to Livepeer
 * Convenience function for migrating videos from Pinata to Livepeer with IPFS
 *
 * @param pinataCID - Pinata IPFS CID
 * @param filename - Original filename
 * @param pinataGateway - Pinata gateway domain (from env)
 * @returns Upload result with Livepeer playback ID and new IPFS CID
 *
 * @example
 * ```typescript
 * const result = await uploadFromPinataIPFS(
 *   "QmXXXXX...",
 *   "video.mp4",
 *   "copper-far-firefly-220.mypinata.cloud"
 * );
 * // Now you have both Pinata CID and Livepeer playback ID
 * ```
 */
export async function uploadFromPinataIPFS(
  pinataCID: string,
  filename: string
): Promise<LivepeerUploadResult> {
  // Use IPFS protocol URL for better compatibility
  const ipfsUrl = `ipfs://${pinataCID}`;

  console.log(`[Livepeer Migration] Uploading from Pinata CID: ${pinataCID}`);

  // Upload to Livepeer with IPFS enabled
  const result = await uploadVideoFromURL(ipfsUrl, filename, true);

  console.log(`[Livepeer Migration] Migration successful`);
  console.log(`  - Original Pinata CID: ${pinataCID}`);
  console.log(`  - New Livepeer IPFS CID: ${result.ipfsCid}`);
  console.log(`  - Livepeer Playback ID: ${result.playbackId}`);

  return result;
}
