import { NextRequest, NextResponse } from "next/server";
import { logReportView } from "@/lib/db";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    // Get referrer from header or body
    const referrer = request.headers.get("referer") || body.referrer || null;
    const userAgent = request.headers.get("user-agent") || null;

    // Hash the IP for privacy (don't store raw IP)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex").substring(0, 16);

    await logReportView({
      slug,
      referrer: referrer || undefined,
      userAgent: userAgent || undefined,
      ipHash,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Log view error:", error);
    return NextResponse.json(
      { error: "Failed to log view" },
      { status: 500 }
    );
  }
}
