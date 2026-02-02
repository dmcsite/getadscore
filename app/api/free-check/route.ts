import { NextRequest, NextResponse } from "next/server";
import { checkFreeUsage, recordFreeUsage } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, action } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check free usage status
    if (action === "check") {
      const status = await checkFreeUsage(email);
      return NextResponse.json({
        canUseFreeTier: !status.hasUsedFree || status.isSubscribed,
        hasUsedFree: status.hasUsedFree,
        isSubscribed: status.isSubscribed,
      });
    }

    // Record free usage
    if (action === "record") {
      await recordFreeUsage(email);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'check' or 'record'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Free check error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
