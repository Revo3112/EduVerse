/**
 * @fileoverview Certificate Price API Route
 * @description GET endpoint to calculate certificate price
 * @route GET /api/certificate/price?courseId={id}&address={wallet}
 */

import {
    calculateCertificatePrice,
    getUserCertificateId,
} from "@/services/certificate-blockchain.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const address = searchParams.get("address");

    // Validate parameters
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "Missing courseId parameter" },
        { status: 400 }
      );
    }

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Missing address parameter" },
        { status: 400 }
      );
    }

    // Parse courseId as BigInt
    let courseIdBigInt: bigint;
    try {
      courseIdBigInt = BigInt(courseId);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid courseId format" },
        { status: 400 }
      );
    }

    // Check if user has certificate (determines fee percentage)
    const tokenId = await getUserCertificateId(address);
    const isFirstCertificate = tokenId === BigInt(0);

    // Calculate price
    const priceInfo = await calculateCertificatePrice(
      courseIdBigInt,
      isFirstCertificate
    );

    return NextResponse.json({
      success: true,
      data: {
        basePrice: priceInfo.basePrice.toString(),
        platformFee: priceInfo.platformFee.toString(),
        platformFeePercentage: priceInfo.platformFeePercentage,
        creatorFee: priceInfo.creatorFee.toString(),
        totalRequired: priceInfo.totalRequired.toString(),
        priceInEth: priceInfo.priceInEth,
        isFirstCertificate,
      },
    });
  } catch (error) {
    console.error("Error calculating certificate price:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate certificate price",
      },
      { status: 500 }
    );
  }
}
