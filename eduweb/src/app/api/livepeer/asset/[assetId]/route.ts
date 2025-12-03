/**
 * API Route: Get/Delete Asset by ID
 *
 * Fetch or delete asset from Livepeer
 *
 * @route GET /api/livepeer/asset/[assetId]
 * @route DELETE /api/livepeer/asset/[assetId]
 */

import { livepeerClient, type Asset } from "@/lib/livepeer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    console.log(`[API Asset] Fetching asset: ${assetId}`);

    // Get asset from Livepeer
    const response = await livepeerClient.asset.get(assetId);

    // Handle response structure - SDK returns GetAssetResponse with asset property
    const responseData = response as unknown as { asset?: Asset } | Asset;
    const asset =
      "asset" in responseData && responseData.asset
        ? responseData.asset
        : (responseData as Asset);

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const status = asset.status?.phase || "unknown";
    console.log(`[API Asset] Asset status: ${status}`);

    return NextResponse.json(asset);
  } catch (error) {
    console.error("[API Asset] Failed to get asset:", error);

    return NextResponse.json(
      {
        error: "Failed to get asset",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    console.log(`[API Asset Delete] Deleting asset: ${assetId}`);

    await livepeerClient.asset.delete(assetId);

    console.log(`[API Asset Delete] Asset deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    console.error("[API Asset Delete] Failed to delete asset:", error);

    return NextResponse.json(
      {
        error: "Failed to delete asset",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
