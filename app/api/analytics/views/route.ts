import { NextRequest, NextResponse } from "next/server";
import { getReportViewCount, getReportViewCounts, getViewCountsForLeads } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const slugs = searchParams.get("slugs");
    const forLeads = searchParams.get("forLeads");

    // Get counts for all leads
    if (forLeads === "true") {
      const counts = await getViewCountsForLeads();
      return NextResponse.json({ success: true, counts });
    }

    // Get count for single slug
    if (slug) {
      const count = await getReportViewCount(slug);
      return NextResponse.json({ success: true, count });
    }

    // Get counts for multiple slugs
    if (slugs) {
      const slugList = slugs.split(",").filter(Boolean);
      const counts = await getReportViewCounts(slugList);
      return NextResponse.json({ success: true, counts });
    }

    return NextResponse.json(
      { error: "slug, slugs, or forLeads parameter required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Get views error:", error);
    return NextResponse.json(
      { error: "Failed to get view counts" },
      { status: 500 }
    );
  }
}
