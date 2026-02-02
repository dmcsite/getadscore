import { NextRequest, NextResponse } from "next/server";
import { searchAdsByBrandId, getSwipefileAds, searchBrandsByDomain } from "@/lib/foreplay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandIds, domain, platform, displayFormat, limit, order, source } = body;

    // Validate input
    if (!brandIds && !domain && source !== "swipefile") {
      return NextResponse.json(
        { error: "brandIds, domain, or source:'swipefile' is required" },
        { status: 400 }
      );
    }

    let ads;
    let brands;

    if (source === "swipefile") {
      // Search from saved swipefile
      ads = await getSwipefileAds({
        platform: platform ? [platform] : undefined,
        displayFormat: displayFormat ? [displayFormat] : undefined,
        limit: limit || 10,
        order: order || "newest",
      });
    } else if (domain) {
      // Search by domain - first get brand IDs, then get ads
      brands = await searchBrandsByDomain(domain);
      if (brands.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          ads: [],
          message: "No brands found for this domain",
        });
      }
      const foundBrandIds = brands.map(b => b.id);
      ads = await searchAdsByBrandId(foundBrandIds, {
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
      brands: brands || undefined,
    });
  } catch (error) {
    console.error("Foreplay search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search Foreplay" },
      { status: 500 }
    );
  }
}
