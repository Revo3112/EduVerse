/**
 * @fileoverview Certificate Verification API Route
 * @description GET endpoint for public certificate verification
 * @route GET /api/certificate/verify?tokenId={id}
 */

import {
    generateQRDataFromContract,
    getCertificateCompletedCourses,
    getLearningJourneySummary,
    verifyCertificate,
} from "@/services/certificate-blockchain.service";
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

    // Get verification data
    const [isValid, journey, qrData, completedCourses] = await Promise.all([
      verifyCertificate(tokenIdBigInt),
      getLearningJourneySummary(tokenIdBigInt),
      generateQRDataFromContract(tokenIdBigInt),
      getCertificateCompletedCourses(tokenIdBigInt),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        isValid,
        recipientName: journey.recipientName,
        platformName: journey.platformName,
        totalCourses: journey.totalCourses.toString(),
        issuedAt: journey.issuedAt.toString(),
        lastUpdated: journey.lastUpdated.toString(),
        qrData,
        completedCourses: completedCourses.map((id) => id.toString()),
      },
    });
  } catch (error) {
    console.error("Error verifying certificate:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify certificate",
      },
      { status: 500 }
    );
  }
}
