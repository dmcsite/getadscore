import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { searchBrandsByDomain, searchAdsByBrandId } from "@/lib/foreplay";

export const maxDuration = 300; // 5 minutes for batch processing

function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return neon(databaseUrl);
}

interface VideoReport {
  id: string;
  slug: string;
  ad_name: string;
  creative_url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dryRun = true, limit = 10 } = body;

    const sql = getDb();

    // Find video reports without thumbnails
    const videoReports = await sql`
      SELECT id, slug, ad_name, creative_url
      FROM public_reports
      WHERE report_data->>'media_type' = 'video'
        AND (thumbnail_url IS NULL OR thumbnail_url = '')
      ORDER BY created_at DESC
      LIMIT ${limit}
    ` as VideoReport[];

    const results: Array<{
      slug: string;
      adName: string;
      status: "updated" | "skipped" | "error";
      thumbnailUrl?: string;
      error?: string;
    }> = [];

    for (const report of videoReports) {
      try {
        // Try to extract domain from creative URL or use brand name to search
        let thumbnailUrl: string | null = null;

        // Search Foreplay for the brand
        // First try using ad_name as brand search
        const brandSearchTerms = report.ad_name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .split(" ")
          .filter((w) => w.length > 2)
          .slice(0, 2)
          .join(" ");

        if (brandSearchTerms) {
          // Search for brand by name - try domain extraction from creative URL first
          let domain: string | null = null;
          try {
            const url = new URL(report.creative_url);
            // Try to extract meaningful domain (skip CDN domains)
            if (!url.hostname.includes("cdn") && !url.hostname.includes("cloudfront")) {
              domain = url.hostname.replace("www.", "");
            }
          } catch {
            // Not a valid URL
          }

          let brandId: string | null = null;

          // Try domain search first if we have one
          if (domain) {
            const brands = await searchBrandsByDomain(domain);
            if (brands.length > 0) {
              brandId = brands[0].id;
            }
          }

          // If we found a brand, get its ads
          if (brandId) {
            const ads = await searchAdsByBrandId([brandId], { limit: 1, order: "newest" });
            if (ads.length > 0 && ads[0].thumbnail) {
              thumbnailUrl = ads[0].thumbnail;
            }
          }
        }

        if (thumbnailUrl) {
          if (!dryRun) {
            // Update the report with the thumbnail
            await sql`
              UPDATE public_reports
              SET thumbnail_url = ${thumbnailUrl}
              WHERE id = ${report.id}
            `;
          }

          results.push({
            slug: report.slug,
            adName: report.ad_name,
            status: "updated",
            thumbnailUrl,
          });
        } else {
          results.push({
            slug: report.slug,
            adName: report.ad_name,
            status: "skipped",
            error: "Could not find thumbnail from Foreplay",
          });
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        results.push({
          slug: report.slug,
          adName: report.ad_name,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const stats = {
      total: results.length,
      updated: results.filter((r) => r.status === "updated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return NextResponse.json({
      success: true,
      dryRun,
      stats,
      results,
      message: dryRun
        ? "Dry run complete. Set dryRun: false to apply changes."
        : "Backfill complete.",
    });
  } catch (error) {
    console.error("Backfill thumbnails error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backfill failed" },
      { status: 500 }
    );
  }
}

// GET to check how many reports need backfill
export async function GET() {
  try {
    const sql = getDb();

    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM public_reports
      WHERE report_data->>'media_type' = 'video'
        AND (thumbnail_url IS NULL OR thumbnail_url = '')
    `;

    const count = parseInt(countResult[0]?.count || "0", 10);

    return NextResponse.json({
      videoReportsWithoutThumbnails: count,
      message: count > 0
        ? `Found ${count} video reports without thumbnails. POST to this endpoint to backfill.`
        : "All video reports have thumbnails.",
    });
  } catch (error) {
    console.error("Backfill check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
