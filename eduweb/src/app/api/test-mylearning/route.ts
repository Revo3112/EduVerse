import { NextRequest, NextResponse } from "next/server";
import { getMyCourses } from "@/services/goldsky-mylearning.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing address parameter",
        usage: "?address=0x...",
      },
      { status: 400 }
    );
  }

  const endpoint = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT;

  if (!endpoint) {
    return NextResponse.json(
      {
        success: false,
        error: "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not configured",
        hint: "Add the endpoint to .env.local",
      },
      { status: 500 }
    );
  }

  try {
    const startTime = Date.now();
    const result = await getMyCourses(address);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      endpoint,
      duration: `${duration}ms`,
      address,
      data: {
        enrollmentsCount: result.enrollments.length,
        certificatesCount: result.certificates.length,
        userStats: result.userStats,
        enrollments: result.enrollments.map((e) => ({
          id: e.id,
          courseId: e.courseId,
          courseTitle: e.course.title,
          status: e.status,
          isActive: e.isActive,
          isCompleted: e.isCompleted,
          completionPercentage: e.completionPercentage,
        })),
        certificates: result.certificates.map((c) => ({
          id: c.id,
          tokenId: c.tokenId,
          recipientName: c.recipientName,
          totalCourses: c.totalCourses,
        })),
      },
    });
  } catch (error: unknown) {
    console.error("MyLearning test error:", error);

    const errorObj = error as {
      message?: string;
      code?: string;
      originalError?: unknown;
    };
    const errorMessage = errorObj?.message || "Unknown error";
    const errorCode = errorObj?.code || "UNKNOWN";

    return NextResponse.json(
      {
        success: false,
        endpoint,
        address,
        error: {
          message: errorMessage,
          code: errorCode,
          details: errorObj?.originalError
            ? JSON.stringify(errorObj.originalError, null, 2)
            : null,
        },
        hint:
          errorMessage?.includes("404") || errorMessage?.includes("NOT_FOUND")
            ? "No enrollments found for this address. This is expected if the user has not enrolled in any courses yet."
            : "Check Goldsky endpoint configuration and network connectivity",
      },
      { status: errorMessage?.includes("CONFIG_ERROR") ? 500 : 200 }
    );
  }
}
