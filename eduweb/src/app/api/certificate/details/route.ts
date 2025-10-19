/**
 * @fileoverview Certificate Details API Route
 * @description GET endpoint to retrieve full certificate details
 * @route GET /api/certificate/details?tokenId={id}
 */

import { getCertificateDetails } from "@/services/certificate-blockchain.service";
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

    // Get certificate details
    const certificate = await getCertificateDetails(tokenIdBigInt);

    return NextResponse.json({
      success: true,
      data: {
        tokenId: certificate.tokenId.toString(),
        platformName: certificate.platformName,
        recipientName: certificate.recipientName,
        recipientAddress: certificate.recipientAddress,
        lifetimeFlag: certificate.lifetimeFlag,
        isValid: certificate.isValid,
        ipfsCID: certificate.ipfsCID,
        baseRoute: certificate.baseRoute,
        issuedAt: certificate.issuedAt.toString(),
        lastUpdated: certificate.lastUpdated.toString(),
        totalCoursesCompleted: certificate.totalCoursesCompleted.toString(),
        paymentReceiptHash: certificate.paymentReceiptHash,
        completedCourses: certificate.completedCourses.map((id) =>
          id.toString()
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching certificate details:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch certificate details",
      },
      { status: 500 }
    );
  }
}
