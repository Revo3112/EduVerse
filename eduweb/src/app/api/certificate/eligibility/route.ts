/**
 * @fileoverview Certificate Eligibility API Route
 * @description GET endpoint to check if user can add course to certificate
 * @route GET /api/certificate/eligibility?address={wallet}&courseId={id}
 */

import {
    checkEligibilityForCertificate,
    getCertificatePrice,
} from "@/services/certificate-blockchain.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const courseId = searchParams.get("courseId");

    // Validate parameters
    if (!address) {
      return NextResponse.json(
        { success: false, error: "Missing address parameter" },
        { status: 400 }
      );
    }

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "Missing courseId parameter" },
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

    // Check eligibility
    const eligibility = await checkEligibilityForCertificate(
      address,
      courseIdBigInt
    );

    let price = null;
    if (eligibility.eligible) {
      price = await getCertificatePrice(
        courseIdBigInt,
        eligibility.isFirstCertificate
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        eligible: eligibility.eligible,
        isFirstCertificate: eligibility.isFirstCertificate,
        reason: eligibility.reason || null,
        price: price ? price.toString() : null,
      },
    });
  } catch (error) {
    console.error("Error checking eligibility:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check eligibility",
      },
      { status: 500 }
    );
  }
}
