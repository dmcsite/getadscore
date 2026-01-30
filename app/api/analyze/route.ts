import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, checkRateLimit, incrementRequestCount, saveReport } from "@/lib/db";
import { analyzeMedia, isImageType, isVideoType, checkFfmpegAvailable } from "@/lib/analysis";
import { put } from "@vercel/blob";

// Detect media type from Content-Type header or URL extension
function detectMediaType(contentType: string | null, url: string): string | null {
  // Try Content-Type header first
  if (contentType) {
    const type = contentType.split(";")[0].trim().toLowerCase();
    if (isImageType(type) || isVideoType(type)) {
      return type;
    }
  }

  // Fall back to URL extension
  const urlPath = new URL(url).pathname.toLowerCase();
  const extensionMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
  };

  for (const [ext, mimeType] of Object.entries(extensionMap)) {
    if (urlPath.endsWith(ext)) {
      return mimeType;
    }
  }

  return null;
}

// Calculate verdict from score
function getVerdict(score: number): string {
  if (score >= 80) return "READY TO SCALE";
  if (score >= 60) return "READY TO TEST";
  if (score >= 40) return "NEEDS WORK";
  return "FIX BEFORE TESTING";
}

export async function POST(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer gads_your_api_key" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify API key
    const keyRecord = await verifyApiKey(apiKey);
    if (!keyRecord) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(keyRecord);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          limit: rateLimit.limit,
          remaining: 0,
          resets_at: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Parse request body
    let body: { media_url?: string; brand_name?: string; include_pdf?: boolean; ad_copy?: { primary_text?: string; headline?: string; description?: string } };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { media_url, brand_name, include_pdf = false, ad_copy } = body;

    if (!media_url) {
      return NextResponse.json(
        { error: "media_url is required" },
        { status: 400 }
      );
    }

    if (!brand_name) {
      return NextResponse.json(
        { error: "brand_name is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(media_url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid media_url. Must be a valid HTTP/HTTPS URL." },
        { status: 400 }
      );
    }

    // Fetch media from URL
    let mediaResponse: Response;
    try {
      mediaResponse = await fetch(media_url, {
        headers: {
          "User-Agent": "GetAdScore/1.0",
        },
      });

      if (!mediaResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch media: HTTP ${mediaResponse.status}` },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to fetch media from URL: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 400 }
      );
    }

    // Detect media type
    const contentType = mediaResponse.headers.get("content-type");
    const mimeType = detectMediaType(contentType, media_url);

    if (!mimeType) {
      return NextResponse.json(
        { error: "Unable to determine media type. Ensure URL points to an image (JPG, PNG, WebP, GIF) or video (MP4, MOV, WebM)." },
        { status: 400 }
      );
    }

    const isVideo = isVideoType(mimeType);

    // Check ffmpeg availability for videos
    if (isVideo) {
      const ffmpegAvailable = await checkFfmpegAvailable();
      if (!ffmpegAvailable) {
        return NextResponse.json(
          { error: "Video processing is temporarily unavailable. Please submit an image URL instead." },
          { status: 400 }
        );
      }
    }

    // Check file size
    const contentLength = mediaResponse.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = isVideo ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
      if (size > maxSize) {
        return NextResponse.json(
          { error: `Media too large. Maximum size is ${isVideo ? "50MB" : "20MB"}.` },
          { status: 400 }
        );
      }
    }

    // Download media
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Double-check size after download
    const maxSize = isVideo ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: `Media too large. Maximum size is ${isVideo ? "50MB" : "20MB"}.` },
        { status: 400 }
      );
    }

    // Prepare ad copy if provided
    const adCopy = ad_copy ? {
      primaryText: ad_copy.primary_text,
      headline: ad_copy.headline,
      description: ad_copy.description,
    } : null;

    // Run analysis
    let analysisResult;
    try {
      analysisResult = await analyzeMedia(buffer, mimeType, adCopy);
    } catch (error) {
      console.error("Analysis error:", error);
      return NextResponse.json(
        { error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}` },
        { status: 500 }
      );
    }

    // Increment request count
    await incrementRequestCount(keyRecord.id);

    const score = analysisResult.overallScore;
    const verdict = getVerdict(score);

    // Generate PDF if requested
    let pdfUrl: string | null = null;
    if (include_pdf) {
      // PDF generation would go here - for now, we skip it
      // Server-side PDF generation requires additional setup with canvas
      // This can be added in a future iteration
      pdfUrl = null;
    }

    // Save report to database
    const report = await saveReport({
      apiKeyId: keyRecord.id,
      brandName: brand_name,
      mediaUrl: media_url,
      mediaType: isVideo ? "video" : "image",
      score,
      verdict,
      summary: {
        strength: analysisResult.executiveSummary.biggestStrength,
        risk: analysisResult.executiveSummary.biggestRisk,
        quick_win: analysisResult.executiveSummary.quickWin,
      },
      scores: Object.fromEntries(
        analysisResult.categories.map((c) => [c.name.toLowerCase().replace(/\s+/g, "_"), c.score])
      ),
      topFixes: analysisResult.topFixes,
      fullResult: analysisResult as unknown as Record<string, unknown>,
      pdfUrl: pdfUrl || undefined,
    });

    // Build response
    const response = {
      success: true,
      report_id: report.id,
      score,
      verdict,
      summary: analysisResult.executiveSummary,
      scores: Object.fromEntries(
        analysisResult.categories.map((c) => [c.name.toLowerCase().replace(/\s+/g, "_"), c.score])
      ),
      top_fixes: analysisResult.topFixes,
      whats_working: analysisResult.whatsWorking,
      verdict_reason: analysisResult.verdictReason,
      policy_flags: analysisResult.policyFlags,
      quick_audit: analysisResult.quickAudit,
      ...(analysisResult.hookAnalysis && { hook_analysis: analysisResult.hookAnalysis }),
      ...(analysisResult.videoNotes && { video_notes: analysisResult.videoNotes }),
      ...(analysisResult.copyAnalysis && { copy_analysis: analysisResult.copyAnalysis }),
      ...(analysisResult.audioAnalysis && { audio_analysis: analysisResult.audioAnalysis }),
      pdf_url: pdfUrl,
      created_at: report.created_at,
      expires_at: report.expires_at,
    };

    return NextResponse.json(response, {
      headers: {
        "X-RateLimit-Limit": rateLimit.limit.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
