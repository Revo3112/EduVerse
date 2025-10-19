/**
 * API Route: Enable IPFS Storage for Livepeer Asset
 *
 * Called after video upload completes to enable IPFS storage
 * Returns the IPFS CID for storing in smart contract
 *
 * @route POST /api/livepeer/enable-ipfs
 */

import { enableIPFSStorage } from "@/services/livepeer-upload.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId } = body;

    if (!assetId || typeof assetId !== "string") {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Enabling IPFS storage for asset: ${assetId}`);

    // Enable IPFS storage via service
    const result = await enableIPFSStorage(assetId);

    return NextResponse.json({
      success: true,
      ipfsCid: result.cid,
      gatewayUrl: result.gatewayUrl,
      nftMetadataCid: result.nftMetadataCid,
    });
  } catch (error) {
    console.error("[API] Failed to enable IPFS storage:", error);

    return NextResponse.json(
      {
        error: "Failed to enable IPFS storage",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
