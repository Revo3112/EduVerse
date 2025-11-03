/**
 * @fileoverview Certificate User API Route
 * @description GET endpoint to retrieve user's certificate ID and stats
 * @route GET /api/certificate/user?address={wallet}
 */

import {
    getUserCertificateId,
    getUserCertificateStats,
} from "@/services/certificate-blockchain.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    // Validate parameter
    if (!address) {
      return NextResponse.json(
        { success: false, error: "Missing address parameter" },
        { status: 400 }
      );
    }

    // Get user's certificate ID and stats
    const tokenId = await getUserCertificateId(address);
    const hasCertificate = tokenId > BigInt(0);

    let stats = null;
    if (hasCertificate) {
      stats = await getUserCertificateStats(address);
    }

    return NextResponse.json({
      success: true,
      data: {
        hasCertificate,
        tokenId: tokenId.toString(),
        totalCourses: stats ? stats.totalCourses.toString() : "0",
        issuedAt: stats ? stats.issuedAt.toString() : null,
        lastUpdated: stats ? stats.lastUpdated.toString() : null,
      },
    });
  } catch (error) {
    console.error("Error fetching user certificate:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch user certificate",
      },
      { status: 500 }
    );
  }
}
