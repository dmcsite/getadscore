import { NextRequest, NextResponse } from "next/server";
import { getAdById, downloadCreative } from "@/lib/foreplay";
import { savePublicReport } from "@/lib/db";

// Score creative by calling the score API with multipart form data
async function scoreCreative(
  buffer: Buffer,
  contentType: string,
  adCopy?: { primaryText?: string; headline?: string; description?: string }
) {
  // Determine file extension from content type
  let ext = "jpg";
  let isVideo = false;
  if (contentType.includes("video")) {
    ext = contentType.includes("mp4") ? "mp4" : "mov";
    isVideo = true;
  } else if (contentType.includes("png")) {
    ext = "png";
  } else if (contentType.includes("gif")) {
    ext = "gif";
  } else if (contentType.includes("webp")) {
    ext = "webp";
  }

  // Build multipart form data manually for Node.js
  const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);
  const filename = `creative.${ext}`;

  // Build parts
  const parts: Buffer[] = [];

  // File part
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  ));
  parts.push(buffer);
  parts.push(Buffer.from("\r\n"));

  // Text fields
  if (adCopy?.primaryText) {
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="primaryText"\r\n\r\n` +
      `${adCopy.primaryText}\r\n`
    ));
  }
  if (adCopy?.headline) {
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="headline"\r\n\r\n` +
      `${adCopy.headline}\r\n`
    ));
  }
  if (adCopy?.description) {
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="description"\r\n\r\n` +
      `${adCopy.description}\r\n`
    ));
  }

  // End boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const fullBody = Buffer.concat(parts);

  // Call the score API - use www to avoid redirect issues
  const scoreUrl = process.env.NODE_ENV === "production"
    ? "https://www.getadscore.com/api/score"
    : "http://localhost:3000/api/score";

  const response = await fetch(scoreUrl, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: fullBody,
  });

  if (!response.ok) {
    let errorMsg = "Failed to score creative";
    try {
      const error = await response.json();
      errorMsg = error.error || errorMsg;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMsg);
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
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze creative";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: errorMessage,
        details: errorStack,
      },
      { status: 500 }
    );
  }
}
