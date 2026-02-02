import { NextRequest, NextResponse } from "next/server";
import { searchAdsByBrandId, getSwipefileAds } from "@/lib/foreplay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandIds, platform, displayFormat, limit, order, source } = body;

    // Validate input
    if (!brandIds && source !== "swipefile") {
      return NextResponse.json(
        { error: "brandIds array is required (or use source: 'swipefile')" },
        { status: 400 }
      );
    }

    let ads;

    if (source === "swipefile") {
      // Search from saved swipefile
      ads = await getSwipefileAds({
        platform: platform ? [platform] : undefined,
        displayFormat: displayFormat ? [displayFormat] : undefined,
        limit: limit || 10,
        order: order || "newest",
      });
    } else {
      // Search by brand IDs
      ads = await searchAdsByBrandId(
        Array.isArray(brandIds) ? brandIds : [brandIds],
        {
          platform: platform ? [platform] : undefined,
          displayFormat: displayFormat ? [displayFormat] : undefined,
          limit: limit || 10,
          order: order || "newest",
        }
      );
    }

    return NextResponse.json({
      success: true,
      count: ads.length,
      ads,
    });
  } catch (error) {
    console.error("Foreplay search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search Foreplay" },
      { status: 500 }
    );
  }
}
