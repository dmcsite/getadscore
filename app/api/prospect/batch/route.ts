import { NextRequest, NextResponse } from "next/server";
import { searchBrandsByDomain, searchAdsByBrandId } from "@/lib/foreplay";
import { findContact } from "@/lib/apollo";
import {
  getCachedBrand,
  cacheBrand,
  getRecentReportForBrand,
  saveLead,
  getLeadByDomain,
} from "@/lib/db";

export const maxDuration = 300; // 5 minutes for batch processing

interface BatchResult {
  domain: string;
  success: boolean;
  brand?: string;
  score?: number;
  reportUrl?: string;
  contactEmail?: string;
  leadId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

async function processDomain(domain: string): Promise<BatchResult> {
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  try {
    // Check if already a lead
    const existingLead = await getLeadByDomain(cleanDomain);
    if (existingLead) {
      return {
        domain: cleanDomain,
        success: true,
        skipped: true,
        skipReason: "Already a lead",
        brand: existingLead.brand_name || undefined,
        score: existingLead.score || undefined,
        reportUrl: existingLead.report_url || undefined,
        contactEmail: existingLead.contact_email || undefined,
        leadId: existingLead.id,
      };
    }

    // Get brand info
    let brandId: string | null = null;
    let brandName: string | null = null;

    const cachedBrand = await getCachedBrand(cleanDomain);
    if (cachedBrand) {
      brandId = cachedBrand.brand_id;
      brandName = cachedBrand.brand_name;
    } else {
      const brands = await searchBrandsByDomain(cleanDomain);
      if (brands.length > 0) {
        brandId = brands[0].id;
        brandName = brands[0].name;
        await cacheBrand(cleanDomain, brandId, brandName);
      }
    }

    // Get ads
    let ads: { creativeUrl: string; adCopy: string; thumbnail?: string }[] = [];
    if (brandId) {
      ads = await searchAdsByBrandId([brandId], { limit: 1, order: "newest" });
    }

    // Check for recent report or analyze
    let reportUrl: string | null = null;
    let score: number | null = null;
    let verdict: string | null = null;
    let topFix: string | null = null;
    let slug: string | null = null;

    if (brandName) {
      const recentReport = await getRecentReportForBrand(brandName, 14);
      if (recentReport) {
        reportUrl = `https://getadscore.com/r/${recentReport.slug}`;
        slug = recentReport.slug;
        score = recentReport.overall_score;
        verdict = recentReport.verdict;
        topFix = recentReport.report_data?.top_fixes?.[0] || null;
      }
    }

    // Analyze if no cached report
    if (!reportUrl && ads.length > 0 && ads[0].creativeUrl) {
      const analyzeUrl =
        process.env.NODE_ENV === "production"
          ? "https://www.getadscore.com/api/analyze-external"
          : "http://localhost:3000/api/analyze-external";

      const analyzeResponse = await fetch(analyzeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeUrl: ads[0].creativeUrl,
          brandName: brandName || cleanDomain,
          adCopy: ads[0].adCopy,
          thumbnailUrl: ads[0].thumbnail,
        }),
      });

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json();
        reportUrl = analyzeData.reportUrl;
        slug = analyzeData.slug;
        score = analyzeData.score;
        verdict = analyzeData.verdict;
        brandName = analyzeData.brandName || brandName;

        // Get top fix
        if (analyzeData.slug) {
          const reportResponse = await fetch(
            process.env.NODE_ENV === "production"
              ? `https://www.getadscore.com/api/report/${analyzeData.slug}`
              : `http://localhost:3000/api/report/${analyzeData.slug}`
          );
          if (reportResponse.ok) {
            const reportData = await reportResponse.json();
            topFix = reportData.report?.report_data?.top_fixes?.[0] || null;
          }
        }
      }
    }

    // Find contact via Apollo
    let contact: {
      name: string;
      firstName: string | null;
      lastName: string | null;
      title: string | null;
      email: string;
      linkedin: string | null;
    } | null = null;

    try {
      const apolloResult = await findContact(cleanDomain);
      if (apolloResult?.email) {
        contact = {
          name: apolloResult.name,
          firstName: apolloResult.firstName,
          lastName: apolloResult.lastName,
          title: apolloResult.title,
          email: apolloResult.email,
          linkedin: apolloResult.linkedin,
        };
      }
    } catch {
      // Continue without contact
    }

    // Save lead
    let leadId: string | null = null;
    if (brandName || contact?.email) {
      const lead = await saveLead({
        domain: cleanDomain,
        brandName: brandName || undefined,
        reportUrl: reportUrl || undefined,
        reportSlug: slug || undefined,
        score: score || undefined,
        verdict: verdict || undefined,
        topFix: topFix || undefined,
        contactName: contact?.name,
        contactTitle: contact?.title || undefined,
        contactEmail: contact?.email,
        contactLinkedin: contact?.linkedin || undefined,
      });
      leadId = lead.id;
    }

    return {
      domain: cleanDomain,
      success: true,
      brand: brandName || undefined,
      score: score || undefined,
      reportUrl: reportUrl || undefined,
      contactEmail: contact?.email,
      leadId: leadId || undefined,
    };
  } catch (error) {
    return {
      domain: cleanDomain,
      success: false,
      error: error instanceof Error ? error.message : "Failed to process",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domains } = body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: "domains array is required" },
        { status: 400 }
      );
    }

    // Limit batch size
    const limitedDomains = domains.slice(0, 20);

    // Process sequentially to avoid rate limits
    const results: BatchResult[] = [];
    for (const domain of limitedDomains) {
      const result = await processDomain(domain);
      results.push(result);

      // Small delay between requests to be nice to APIs
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Summary stats
    const stats = {
      total: results.length,
      successful: results.filter((r) => r.success && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.success).length,
      withContact: results.filter((r) => r.contactEmail).length,
      withReport: results.filter((r) => r.reportUrl).length,
    };

    return NextResponse.json({
      success: true,
      stats,
      results,
    });
  } catch (error) {
    console.error("Batch prospect error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch processing failed" },
      { status: 500 }
    );
  }
}
