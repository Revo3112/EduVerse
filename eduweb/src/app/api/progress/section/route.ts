/**
 * @fileoverview Section Progress Status API Route
 * @description GET endpoint to check progress for a specific section
 * @route GET /api/progress/section?courseId={id}&sectionId={id}&address={wallet}
 */

import { getSectionProgress } from "@/services/progress.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const sectionId = searchParams.get("sectionId");
    const address = searchParams.get("address");

    // Validate parameters
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: "Missing courseId parameter" },
        { status: 400 }
      );
    }

    if (!sectionId) {
      return NextResponse.json(
        { success: false, error: "Missing sectionId parameter" },
        { status: 400 }
      );
    }

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Missing address parameter" },
        { status: 400 }
      );
    }

    // Parse parameters
    let courseIdBigInt: bigint;
    let sectionIdBigInt: bigint;

    try {
      courseIdBigInt = BigInt(courseId);
      sectionIdBigInt = BigInt(sectionId);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid parameter format" },
        { status: 400 }
      );
    }

    // Get section progress
    const progress = await getSectionProgress(
      address,
      courseIdBigInt,
      sectionIdBigInt
    );

    if (!progress) {
      return NextResponse.json({
        success: true,
        data: {
          isStarted: false,
          isCompleted: false,
          sectionId: sectionId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isStarted: progress.startTime > BigInt(0),
        isCompleted: progress.isCompleted,
        sectionId: progress.sectionId.toString(),
        startTime: progress.startTime.toString(),
        completionTime: progress.completionTime.toString(),
      },
    });
  } catch (error) {
    console.error("[Progress Section API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
