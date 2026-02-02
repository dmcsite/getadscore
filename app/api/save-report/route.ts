import { NextRequest, NextResponse } from "next/server";
import { savePublicReport, updatePublicReportPdfUrl } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, adName, overallScore, verdict, reportData, pdfUrl } = body;

    if (!adName || overallScore === undefined || !verdict || !reportData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const report = await savePublicReport({
      userEmail,
      adName,
      overallScore,
      verdict,
      reportData,
      pdfUrl,
    });

    return NextResponse.json({
      success: true,
      slug: report.slug,
      reportUrl: `https://getadscore.com/r/${report.slug}`,
    });
  } catch (error) {
    console.error("Save report error:", error);
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, pdfUrl } = body;

    if (!slug || !pdfUrl) {
      return NextResponse.json(
        { error: "Missing slug or pdfUrl" },
        { status: 400 }
      );
    }

    await updatePublicReportPdfUrl(slug, pdfUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update report error:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}
