import { NextRequest, NextResponse } from "next/server";
import { searchBrandsByDomain, searchAdsByBrandId } from "@/lib/foreplay";
import { getLeadByDomain } from "@/lib/db";
import { getDomainsForNiche, getAvailableNiches } from "@/lib/domain-sources";

export const maxDuration = 300; // 5 minutes for batch processing

interface Prospect {
  domain: string;
  brandName: string | null;
  hasAds: boolean;
  score: number | null;
  verdict: string | null;
  reportUrl: string | null;
  contact: {
    name: string;
    title: string | null;
    email: string | null;
    linkedin: string | null;
  } | null;
  alreadyLead: boolean;
  qualified: boolean;
  disqualifyReason: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, limit = 10 } = body;

    if (!niche) {
      return NextResponse.json(
        {
          error: "niche is required",
          availableNiches: getAvailableNiches(),
        },
        { status: 400 }
      );
    }

    // Step 1: Get domains from curated list for this niche
    // First, get existing lead domains to exclude
    const existingLeadDomains: string[] = [];

    // Get more domains than needed to account for filtering
    const domains = getDomainsForNiche(niche, existingLeadDomains, limit * 3);

    if (domains.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No domains found for niche: ${niche}`,
        availableNiches: getAvailableNiches(),
      });
    }

    const prospects: Prospect[] = [];
    let qualifiedCount = 0;

    // Step 2: Process each domain
    for (const domain of domains) {
      // Stop if we have enough qualified prospects
      if (qualifiedCount >= limit) break;

      console.log(`[Discover] Processing ${domain}...`);

      const prospect: Prospect = {
        domain,
        brandName: null,
        hasAds: false,
        score: null,
        verdict: null,
        reportUrl: null,
        contact: null,
        alreadyLead: false,
        qualified: false,
        disqualifyReason: null,
      };

      // Check if already a lead
      try {
        const existingLead = await getLeadByDomain(domain);
        if (existingLead) {
          prospect.alreadyLead = true;
          prospect.disqualifyReason = "Already a lead";
          prospects.push(prospect);
          continue;
        }
      } catch {
        // Continue if check fails
      }

      // Step 3: Check Foreplay for ads
      try {
        // First, find the brand by domain
        const brands = await searchBrandsByDomain(domain);

        if (!brands || brands.length === 0) {
          prospect.hasAds = false;
          prospect.disqualifyReason = "No active ads found";
          prospects.push(prospect);
          continue;
        }

        // Get ads for this brand
        const ads = await searchAdsByBrandId([brands[0].id], { limit: 1 });

        if (!ads || ads.length === 0) {
          prospect.hasAds = false;
          prospect.disqualifyReason = "No active ads found";
          prospects.push(prospect);
          continue;
        }

        prospect.hasAds = true;
        prospect.brandName = brands[0].name || domain;

        // Step 4: Score the ad via pipeline
        const pipelineUrl = process.env.NODE_ENV === "production"
          ? "https://www.getadscore.com/api/pipeline/run"
          : "http://localhost:3000/api/pipeline/run";

        const pipelineResponse = await fetch(pipelineUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });

        if (pipelineResponse.ok) {
          const pipelineData = await pipelineResponse.json();

          prospect.brandName = pipelineData.brand || prospect.brandName;
          prospect.score = pipelineData.score;
          prospect.verdict = pipelineData.verdict;
          prospect.reportUrl = pipelineData.reportUrl;

          if (pipelineData.contact) {
            prospect.contact = {
              name: pipelineData.contact.name,
              title: pipelineData.contact.title,
              email: pipelineData.contact.email || null,
              linkedin: pipelineData.contact.linkedin || null,
            };
          }

          // Qualified if has score and contact with email
          if (prospect.score && prospect.contact?.email) {
            prospect.qualified = true;
            qualifiedCount++;
          } else if (prospect.score && !prospect.contact?.email) {
            prospect.disqualifyReason = "No contact email found";
          } else {
            prospect.disqualifyReason = "Scoring failed";
          }
        } else {
          prospect.disqualifyReason = "Pipeline processing failed";
        }
      } catch (error) {
        console.error(`[Discover] Error processing ${domain}:`, error);
        prospect.disqualifyReason = "Processing error";
      }

      prospects.push(prospect);

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Separate qualified and disqualified
    const qualified = prospects.filter((p) => p.qualified);
    const disqualified = prospects.filter((p) => !p.qualified);

    return NextResponse.json({
      success: true,
      niche,
      counts: {
        processed: prospects.length,
        qualified: qualified.length,
        disqualified: disqualified.length,
        withAds: prospects.filter((p) => p.hasAds).length,
      },
      qualified,
      disqualified,
      availableNiches: getAvailableNiches(),
    });
  } catch (error) {
    console.error("Discover error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}

// GET endpoint to return available niches
export async function GET() {
  return NextResponse.json({
    niches: getAvailableNiches(),
  });
}
