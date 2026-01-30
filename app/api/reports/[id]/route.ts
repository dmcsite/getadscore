import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, getReport } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer gads_your_api_key" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7);

    // Verify API key
    const keyRecord = await verifyApiKey(apiKey);
    if (!keyRecord) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Get report ID from params
    const { id: reportId } = await params;

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId)) {
      return NextResponse.json(
        { error: "Invalid report ID format" },
        { status: 400 }
      );
    }

    // Fetch report - only if it belongs to this API key
    const report = await getReport(reportId, keyRecord.id);

    if (!report) {
      return NextResponse.json(
        { error: "Report not found or expired" },
        { status: 404 }
      );
    }

    // Build response
    const response = {
      success: true,
      report_id: report.id,
      brand_name: report.brand_name,
      media_url: report.media_url,
      media_type: report.media_type,
      score: report.score,
      verdict: report.verdict,
      summary: report.summary,
      scores: report.scores,
      top_fixes: report.top_fixes,
      full_result: report.full_result,
      pdf_url: report.pdf_url,
      created_at: report.created_at,
      expires_at: report.expires_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
