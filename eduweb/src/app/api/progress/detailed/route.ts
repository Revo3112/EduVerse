/**
 * @fileoverview Detailed Progress API Route
 * @description GET endpoint to get detailed progress with section metadata
 * @route GET /api/progress/detailed?courseId={id}&address={wallet}
 */

import { getAllProgressForCourse } from "@/services/progress.service";
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

    // Get detailed progress
    const details = await getAllProgressForCourse(address, courseIdBigInt);

    return NextResponse.json({
      success: true,
      data: details.map((section) => ({
        sectionId: section.sectionId.toString(),
        title: section.title,
        isCompleted: section.isCompleted,
        startTime: section.startTime.toString(),
        completionTime: section.completionTime.toString(),
        durationSeconds: section.durationSeconds,
        durationFormatted: section.durationFormatted,
      })),
    });
  } catch (error) {
    console.error("[Progress Detailed API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
