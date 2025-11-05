import { NextRequest, NextResponse } from "next/server";
import { uploadCourseThumbnail } from "@/services/thumbnail.service";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    console.log("[Upload Thumbnail] Uploading to Pinata:", file.name);

    const result = await uploadCourseThumbnail(file, {
      courseId: "thumbnail",
      courseName: file.name,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to upload thumbnail",
          message: result.error,
        },
        { status: 500 }
      );
    }

    console.log("[Upload Thumbnail] Upload successful:", result.data.cid);

    return NextResponse.json({
      success: true,
      cid: result.data.cid,
    });
  } catch (error) {
    console.error("[Upload Thumbnail] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload thumbnail",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
