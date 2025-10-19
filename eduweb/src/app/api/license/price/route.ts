/**
 * @fileoverview License Price Calculation API Route
 * @description GET endpoint to calculate license price for purchase/renewal
 * @route GET /api/license/price?courseId={id}&duration={months}
 */

import { calculateLicensePrice } from "@/services/license.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const duration = searchParams.get("duration");

    // Validate parameters
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "Missing courseId parameter" },
        { status: 400 }
      );
    }

    if (!duration) {
      return NextResponse.json(
        { success: false, error: "Missing duration parameter" },
        { status: 400 }
      );
    }

    // Parse parameters
    let courseIdBigInt: bigint;
    let durationMonths: number;

    try {
      courseIdBigInt = BigInt(courseId);
      durationMonths = parseInt(duration);

      if (isNaN(durationMonths) || durationMonths < 1 || durationMonths > 12) {
        return NextResponse.json(
          { success: false, error: "Duration must be between 1 and 12 months" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid parameter format" },
        { status: 400 }
      );
    }

    // Calculate price
    const priceInfo = await calculateLicensePrice(courseIdBigInt, durationMonths);

    return NextResponse.json({
      success: true,
      data: {
        coursePrice: priceInfo.coursePrice.toString(),
        durationMonths: priceInfo.durationMonths,
        totalPrice: priceInfo.totalPrice.toString(),
        platformFee: priceInfo.platformFee.toString(),
        creatorRevenue: priceInfo.creatorRevenue.toString(),
        priceInEth: priceInfo.priceInEth,
      },
    });
  } catch (error) {
    console.error("[License Price API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
