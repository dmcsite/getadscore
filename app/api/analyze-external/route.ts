import { NextRequest, NextResponse } from "next/server";
import { getAdById, downloadCreative } from "@/lib/foreplay";
import { savePublicReport } from "@/lib/db";

// Reuse the scoring logic from the main score endpoint
async function scoreCreative(
  buffer: Buffer,
  contentType: string,
  adCopy?: { primaryText?: string; headline?: string; description?: string }
) {
  // Create a FormData-like structure to pass to the score endpoint
  const formData = new FormData();

  // Determine file extension from content type
  let ext = "jpg";
  if (contentType.includes("video")) {
    ext = contentType.includes("mp4") ? "mp4" : "mov";
  } else if (contentType.includes("png")) {
    ext = "png";
  } else if (contentType.includes("gif")) {
    ext = "gif";
  } else if (contentType.includes("webp")) {
    ext = "webp";
  }

  const blob = new Blob([buffer], { type: contentType });
  const file = new File([blob], `creative.${ext}`, { type: contentType });
  formData.append("file", file);

  if (adCopy?.primaryText) {
    formData.append("primaryText", adCopy.primaryText);
  }
  if (adCopy?.headline) {
    formData.append("headline", adCopy.headline);
  }
  if (adCopy?.description) {
    formData.append("description", adCopy.description);
  }

  // Call the score API
  const scoreUrl = process.env.NODE_ENV === "production"
    ? "https://getadscore.com/api/score"
    : "http://localhost:3000/api/score";

  const response = await fetch(scoreUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to score creative");
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { foreplayAdId, creativeUrl, brandName, adCopy, userEmail } = body;

    let finalCreativeUrl = creativeUrl;
    let finalBrandName = brandName;
    let finalAdCopy = adCopy;
    let transcript: string | undefined;

    // If foreplayAdId is provided, fetch ad details from Foreplay
    if (foreplayAdId) {
      const ad = await getAdById(foreplayAdId);
      if (!ad) {
        return NextResponse.json(
          { error: "Ad not found in Foreplay" },
          { status: 404 }
        );
      }

      finalCreativeUrl = ad.creativeUrl;
      finalBrandName = brandName || ad.brandName;
      finalAdCopy = adCopy || ad.adCopy;
      transcript = ad.transcript;
    }

    // Validate we have a creative URL
    if (!finalCreativeUrl) {
      return NextResponse.json(
        { error: "creativeUrl is required (or provide foreplayAdId)" },
        { status: 400 }
      );
    }

    // Download the creative
    const { buffer, contentType } = await downloadCreative(finalCreativeUrl);

    // Score the creative
    const scoreResult = await scoreCreative(buffer, contentType, {
      primaryText: finalAdCopy,
    });

    // Compute verdict from score
    let verdict = "NEEDS WORK";
    if (scoreResult.overallScore >= 85) verdict = "SCALE CANDIDATE";
    else if (scoreResult.overallScore >= 75) verdict = "READY TO TEST";
    else if (scoreResult.overallScore >= 60) verdict = "NEEDS WORK";
    else verdict = "MAJOR ISSUES";

    // Generate ad name
    const adName = finalBrandName || `${scoreResult.mediaType === "video" ? "Video" : "Image"} Ad Analysis`;

    // Save the report
    const report = await savePublicReport({
      userEmail: userEmail || null,
      adName,
      overallScore: scoreResult.overallScore,
      verdict,
      reportData: {
        summary: {
          strength: scoreResult.executiveSummary?.biggestStrength || "",
          risk: scoreResult.executiveSummary?.biggestRisk || "",
          quick_win: scoreResult.executiveSummary?.quickWin || "",
        },
        scores: scoreResult.categories?.reduce(
          (acc: Record<string, { score: number; reason: string }>, cat: { name: string; score: number; reason: string }) => {
            const key = cat.name.toLowerCase().replace(/[^a-z]+/g, "_");
            acc[key] = { score: cat.score, reason: cat.reason };
            return acc;
          },
          {}
        ) || {},
        top_fixes: scoreResult.topFixes || [],
        media_type: scoreResult.mediaType || "image",
        transcript: transcript || scoreResult.transcript,
      },
    });

    return NextResponse.json({
      success: true,
      reportUrl: `https://getadscore.com/r/${report.slug}`,
      slug: report.slug,
      score: scoreResult.overallScore,
      verdict,
      brandName: adName,
    });
  } catch (error) {
    console.error("Analyze external error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze creative" },
      { status: 500 }
    );
  }
}
