/**
 * @fileoverview Course Progress Status API Route
 * @description GET endpoint to check progress status for a course
 * @route GET /api/progress/course?courseId={id}&address={wallet}
 */

import { getCourseProgress } from "@/services/progress.service";
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

    // Get course progress
    const progress = await getCourseProgress(address, courseIdBigInt);

    return NextResponse.json({
      success: true,
      data: {
        courseId: progress.courseId.toString(),
        student: progress.student,
        totalSections: progress.totalSections,
        completedSections: progress.completedSections,
        completionPercentage: progress.completionPercentage,
        isFullyCompleted: progress.isFullyCompleted,
        lastActivityTime: progress.lastActivityTime.toString(),
        sections: progress.sections.map((s) => ({
          sectionId: s.sectionId.toString(),
          startTime: s.startTime.toString(),
          completionTime: s.completionTime.toString(),
          isCompleted: s.isCompleted,
        })),
      },
    });
  } catch (error) {
    console.error("[Progress Course API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
