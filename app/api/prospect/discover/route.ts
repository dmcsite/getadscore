import { NextRequest, NextResponse } from "next/server";
import { discoverBrands, extractDomainFromBrand } from "@/lib/foreplay";
import { getLeadByDomain } from "@/lib/db";

// Domains to exclude (social media, landing page builders, etc.)
const EXCLUDED_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "twitter.com",
  "youtube.com",
  "linkedin.com",
  "pinterest.com",
  "pagedeck.app",
  "linktree.com",
  "linktr.ee",
  "bio.link",
  "carrd.co",
  "fb.me",
  "bit.ly",
  "goo.gl",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, niches, limit = 10 } = body;

    // Support both single niche and array of niches
    const nicheList = niches || (niche ? [niche] : []);

    if (nicheList.length === 0) {
      return NextResponse.json(
        { error: "niche or niches is required" },
        { status: 400 }
      );
    }

    // Discover brands from Foreplay Discovery Ads API
    const brands = await discoverBrands({
      query: nicheList[0], // Use first niche as search query
      niches: nicheList,
      limit: Math.min(limit, 10),
    });

    // Extract domains and filter out brands without websites
    const prospects: Array<{
      brandId: string;
      brandName: string;
      domain: string;
      avatar?: string;
      alreadyLead: boolean;
    }> = [];

    for (const brand of brands) {
      if (prospects.length >= limit) break;

      const domain = extractDomainFromBrand(brand);
      if (!domain) continue;

      // Skip excluded domains (social media, etc.)
      if (EXCLUDED_DOMAINS.some((excluded) => domain.includes(excluded))) continue;

      // Check if already a lead
      const existingLead = await getLeadByDomain(domain);

      prospects.push({
        brandId: brand.id,
        brandName: brand.name,
        domain,
        avatar: brand.avatar,
        alreadyLead: !!existingLead,
      });
    }

    return NextResponse.json({
      success: true,
      count: prospects.length,
      prospects,
      filters: {
        niches: nicheList,
      },
    });
  } catch (error) {
    console.error("Prospect discover error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to discover prospects" },
      { status: 500 }
    );
  }
}
