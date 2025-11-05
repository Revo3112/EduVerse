/**
 * API Route: Get/Delete Asset by ID
 *
 * Fetch or delete asset from Livepeer
 *
 * @route GET /api/livepeer/asset/[assetId]
 * @route DELETE /api/livepeer/asset/[assetId]
 */

import { livepeerClient } from "@/lib/livepeer";
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await livepeerClient.asset.get(assetId);

    // Handle response structure
    const asset = response.asset || response;

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    console.log(
      `[API Asset] Asset status: ${asset.status?.phase || "unknown"}`
    );

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
