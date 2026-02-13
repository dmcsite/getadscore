import { NextRequest, NextResponse } from "next/server";
import { searchBrandsByDomain, searchAdsByBrandId } from "@/lib/foreplay";
import { findContact } from "@/lib/apollo";
import { getCachedBrand, cacheBrand, getRecentReportForBrand, saveLead, getLeadByDomain } from "@/lib/db";

export const maxDuration = 60; // Allow up to 60 seconds for the full pipeline

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, forceRefresh } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "domain is required" },
        { status: 400 }
      );
    }

    // Clean domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];

    const results: {
      step: string;
      status: "success" | "error" | "skipped";
      data?: unknown;
      error?: string;
    }[] = [];

    // Step 1: Get brand (from cache or Foreplay API)
    let brandId: string | null = null;
    let brandName: string | null = null;
    let ads: { id: string; creativeUrl: string; brandName: string; adCopy: string; thumbnail?: string }[] = [];

    try {
      // Check cache first
      const cachedBrand = await getCachedBrand(cleanDomain);

      if (cachedBrand) {
        brandId = cachedBrand.brand_id;
        brandName = cachedBrand.brand_name;
        results.push({
          step: "brand_cache",
          status: "success",
          data: { cached: true, brandName },
        });
      } else {
        // Fetch from Foreplay API
        const brands = await searchBrandsByDomain(cleanDomain);

        if (brands.length > 0) {
          brandId = brands[0].id;
          brandName = brands[0].name;

          // Cache for future use
          await cacheBrand(cleanDomain, brandId, brandName);

          results.push({
            step: "foreplay_brands",
            status: "success",
            data: { cached: false, brandName },
          });
        } else {
          results.push({
            step: "foreplay_brands",
            status: "error",
            data: { count: 0 },
          });
        }
      }

      // Get ads if we have a brand
      if (brandId) {
        ads = await searchAdsByBrandId([brandId], { limit: 1, order: "newest" });
        results.push({
          step: "foreplay_ads",
          status: ads.length > 0 ? "success" : "error",
          data: { count: ads.length },
        });
      }
    } catch (error) {
      results.push({
        step: "foreplay",
        status: "error",
        error: error instanceof Error ? error.message : "Foreplay search failed",
      });
    }

    // Step 2: Check for existing report or analyze
    let reportUrl: string | null = null;
    let score: number | null = null;
    let verdict: string | null = null;
    let topFix: string | null = null;
    let slug: string | null = null;
    let usedCache = false;

    // Check for recent report first (unless forceRefresh)
    if (brandName && !forceRefresh) {
      try {
        const recentReport = await getRecentReportForBrand(brandName, 14);

        if (recentReport) {
          reportUrl = `https://getadscore.com/r/${recentReport.slug}`;
          slug = recentReport.slug;
          score = recentReport.overall_score;
          verdict = recentReport.verdict;
          topFix = recentReport.report_data?.top_fixes?.[0] || null;
          usedCache = true;

          results.push({
            step: "report_cache",
            status: "success",
            data: { cached: true, age: recentReport.created_at },
          });
        }
      } catch {
        // Ignore cache errors, proceed with fresh analysis
      }
    }

    // If no cached report, analyze the ad
    if (!usedCache && ads.length > 0 && ads[0].creativeUrl) {
      try {
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

          // Get top fix from report
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

          results.push({
            step: "analyze",
            status: "success",
            data: { score, verdict, reportUrl },
          });
        } else {
          const errorData = await analyzeResponse.json().catch(() => ({}));
          results.push({
            step: "analyze",
            status: "error",
            error: errorData.error || "Analysis failed",
          });
        }
      } catch (error) {
        results.push({
          step: "analyze",
          status: "error",
          error: error instanceof Error ? error.message : "Analysis failed",
        });
      }
    } else if (!usedCache) {
      results.push({
        step: "analyze",
        status: "skipped",
        error: "No ads found to analyze",
      });
    }

    // Step 3: Find contact via Apollo
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
        results.push({
          step: "apollo",
          status: "success",
          data: { name: contact.name, title: contact.title },
        });
      } else {
        results.push({
          step: "apollo",
          status: "error",
          error: "No contacts with email found",
        });
      }
    } catch (error) {
      results.push({
        step: "apollo",
        status: "error",
        error: error instanceof Error ? error.message : "Apollo search failed",
      });
    }

    // Step 4: Save lead (if we have meaningful data)
    let leadId: string | null = null;
    if (brandName || contact?.email) {
      try {
        // Check if lead already exists for this domain
        const existingLead = await getLeadByDomain(cleanDomain);

        if (!existingLead) {
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
          results.push({
            step: "save_lead",
            status: "success",
            data: { leadId: lead.id, isNew: true },
          });
        } else {
          leadId = existingLead.id;
          results.push({
            step: "save_lead",
            status: "success",
            data: { leadId: existingLead.id, isNew: false, existing: true },
          });
        }
      } catch (error) {
        results.push({
          step: "save_lead",
          status: "error",
          error: error instanceof Error ? error.message : "Failed to save lead",
        });
      }
    }

    // Build response
    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      brand: brandName,
      reportUrl,
      score,
      verdict,
      topFix,
      contact,
      cached: usedCache,
      leadId,
      pipeline: results,
    });
  } catch (error) {
    console.error("Pipeline error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
