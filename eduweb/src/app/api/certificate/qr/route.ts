/**
 * @fileoverview Certificate QR API Route
 * @description GET endpoint to generate QR code data
 * @route GET /api/certificate/qr?tokenId={id}
 */

import { generateQRDataFromContract } from "@/services/certificate-blockchain.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");

    // Validate parameter
    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: "Missing tokenId parameter" },
        { status: 400 }
      );
    }

    // Parse tokenId as BigInt
    let tokenIdBigInt: bigint;
    try {
      tokenIdBigInt = BigInt(tokenId);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid tokenId format" },
        { status: 400 }
      );
    }

    // Generate QR data
    const qrData = await generateQRDataFromContract(tokenIdBigInt);

    return NextResponse.json({
      success: true,
      data: {
        qrData,
        verificationUrl: qrData, // Same as qrData, provided for clarity
      },
    });
  } catch (error) {
    console.error("Error generating QR data:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate QR data",
      },
      { status: 500 }
    );
  }
}
