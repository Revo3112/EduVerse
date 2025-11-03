/**
 * @fileoverview License Status API Route
 * @description GET endpoint to check license status for a course
 * @route GET /api/license/status?courseId={id}&address={wallet}
 */

import { getLicenseStatus } from "@/services/license.service";
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

    // Get license status
    const status = await getLicenseStatus(address, courseIdBigInt);

    return NextResponse.json({
      success: true,
      data: {
        hasLicense: status.hasLicense,
        isValid: status.isValid,
        isExpired: status.isExpired,
        license: status.license
          ? {
              courseId: status.license.courseId.toString(),
              student: status.license.student,
              durationLicense: status.license.durationLicense.toString(),
              expiryTimestamp: status.license.expiryTimestamp.toString(),
              isActive: status.license.isActive,
            }
          : null,
        timeRemaining: status.timeRemaining,
        expiryDate: status.expiryDate?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[License Status API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
