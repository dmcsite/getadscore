import { NextRequest, NextResponse } from "next/server";
import { searchBrandsByDomain, searchAdsByBrandId } from "@/lib/foreplay";
import {
  getCachedBrand,
  cacheBrand,
  getRecentReportForBrand,
  saveLead,
  getLeadByDomain,
} from "@/lib/db";

export const maxDuration = 300; // 5 minutes for batch processing

interface ApolloContact {
  name: string;
  email: string;
  title?: string;
  company?: string;
  domain: string;
}

interface ProcessResult {
  domain: string;
  name: string;
  email: string;
  status: "qualified" | "no_ads" | "exists" | "error";
  brand?: string;
  score?: number;
  verdict?: string;
  reportUrl?: string;
  leadId?: string;
  error?: string;
}

async function processContact(contact: ApolloContact): Promise<ProcessResult> {
  const cleanDomain = contact.domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase();

  try {
    // Check if already a lead
    const existingLead = await getLeadByDomain(cleanDomain);
    if (existingLead) {
      return {
        domain: cleanDomain,
        name: contact.name,
        email: contact.email,
        status: "exists",
        brand: existingLead.brand_name || undefined,
        score: existingLead.score || undefined,
        reportUrl: existingLead.report_url || undefined,
        leadId: existingLead.id,
      };
    }

    // Get brand info from Foreplay
    let brandId: string | null = null;
    let brandName: string | null = contact.company || null;

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

    // Get ads from Foreplay
    let ads: { creativeUrl: string; adCopy: string; thumbnail?: string }[] = [];
    if (brandId) {
      ads = await searchAdsByBrandId([brandId], { limit: 1, order: "newest" });
    }

    // No ads found - save as no_ads lead
    if (!ads.length || !ads[0].creativeUrl) {
      const lead = await saveLead({
        domain: cleanDomain,
        brandName: brandName || contact.company || undefined,
        contactName: contact.name,
        contactTitle: contact.title,
        contactEmail: contact.email,
      });

      return {
        domain: cleanDomain,
        name: contact.name,
        email: contact.email,
        status: "no_ads",
        brand: brandName || contact.company || undefined,
        leadId: lead.id,
      };
    }

    // Check for recent report
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

    // Analyze ad if no cached report
    if (!reportUrl) {
      const analyzeUrl =
        process.env.NODE_ENV === "production"
          ? "https://www.getadscore.com/api/analyze-external"
          : "http://localhost:3000/api/analyze-external";

      try {
        const analyzeResponse = await fetch(analyzeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creativeUrl: ads[0].creativeUrl,
            brandName: brandName || contact.company || cleanDomain,
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
        } else {
          // Log the error but continue - we'll save as a lead without a score
          const errorData = await analyzeResponse.json().catch(() => ({}));
          console.error(`Analysis failed for ${cleanDomain}:`, errorData.error || analyzeResponse.status);
        }
      } catch (analyzeError) {
        console.error(`Analysis error for ${cleanDomain}:`, analyzeError);
        // Continue without score
      }
    }

    // Save qualified lead with contact info from Apollo
    const lead = await saveLead({
      domain: cleanDomain,
      brandName: brandName || contact.company || undefined,
      reportUrl: reportUrl || undefined,
      reportSlug: slug || undefined,
      score: score || undefined,
      verdict: verdict || undefined,
      topFix: topFix || undefined,
      contactName: contact.name,
      contactTitle: contact.title,
      contactEmail: contact.email,
    });

    return {
      domain: cleanDomain,
      name: contact.name,
      email: contact.email,
      status: "qualified",
      brand: brandName || contact.company || undefined,
      score: score || undefined,
      verdict: verdict || undefined,
      reportUrl: reportUrl || undefined,
      leadId: lead.id,
    };
  } catch (error) {
    return {
      domain: cleanDomain,
      name: contact.name,
      email: contact.email,
      status: "error",
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contacts } = body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "contacts array is required" },
        { status: 400 }
      );
    }

    // Validate contacts
    const validContacts: ApolloContact[] = [];
    for (const contact of contacts) {
      if (!contact.email || !contact.domain) {
        continue;
      }
      validContacts.push({
        name: contact.name || contact.email.split("@")[0],
        email: contact.email,
        title: contact.title,
        company: contact.company,
        domain: contact.domain,
      });
    }

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: "No valid contacts found. Each contact needs email and domain." },
        { status: 400 }
      );
    }

    // Limit batch size
    const limitedContacts = validContacts.slice(0, 50);

    // Process sequentially with delay to avoid rate limits
    const results: ProcessResult[] = [];
    for (let i = 0; i < limitedContacts.length; i++) {
      const result = await processContact(limitedContacts[i]);
      results.push(result);

      // 1.5 second delay between requests
      if (i < limitedContacts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // Summary stats
    const summary = {
      total: results.length,
      qualified: results.filter((r) => r.status === "qualified").length,
      no_ads: results.filter((r) => r.status === "no_ads").length,
      exists: results.filter((r) => r.status === "exists").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error("Apollo import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
