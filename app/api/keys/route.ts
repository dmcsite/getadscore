import { NextRequest, NextResponse } from "next/server";
import { createApiKey, getApiKeysByEmail, revokeApiKey } from "@/lib/db";

// Create a new API key
export async function POST(request: NextRequest) {
  try {
    let body: { email?: string; name?: string; tier?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { email, name, tier = "free" } = body;

    if (!email) {
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

    // Validate tier
    const validTiers = ["free", "individual", "agency"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be: free, individual, or agency" },
        { status: 400 }
      );
    }

    // Check if user already has too many keys
    const existingKeys = await getApiKeysByEmail(email);
    const activeKeys = existingKeys.filter((k) => !k.revoked_at);
    if (activeKeys.length >= 5) {
      return NextResponse.json(
        { error: "Maximum of 5 active API keys allowed per email" },
        { status: 400 }
      );
    }

    // Create the key
    const { key, record } = await createApiKey(email, name, tier);

    return NextResponse.json({
      success: true,
      api_key: key, // Only shown once!
      key_prefix: record.key_prefix,
      name: record.name,
      tier: record.tier,
      created_at: record.created_at,
      message: "Save this API key securely - it will not be shown again!",
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

// Get API keys by email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email query parameter is required" },
        { status: 400 }
      );
    }

    const keys = await getApiKeysByEmail(email);

    // Return keys without the hash
    const safeKeys = keys.map((k) => ({
      id: k.id,
      key_prefix: k.key_prefix,
      name: k.name,
      tier: k.tier,
      requests_today: k.requests_today,
      last_request_date: k.last_request_date,
      created_at: k.created_at,
      revoked_at: k.revoked_at,
      is_active: !k.revoked_at,
    }));

    return NextResponse.json({
      success: true,
      keys: safeKeys,
    });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    let body: { key_id?: string; email?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { key_id, email } = body;

    if (!key_id || !email) {
      return NextResponse.json(
        { error: "key_id and email are required" },
        { status: 400 }
      );
    }

    const success = await revokeApiKey(key_id, email);

    if (!success) {
      return NextResponse.json(
        { error: "API key not found or already revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
