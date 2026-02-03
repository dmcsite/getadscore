import { NextRequest, NextResponse } from "next/server";
import { getPublicReportBySlug } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    const report = await getPublicReportBySlug(slug);

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Get report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get report" },
      { status: 500 }
    );
  }
}
