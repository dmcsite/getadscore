import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// DELETE /api/leads/cleanup - Remove leads without scores (not running ads)
export async function DELETE() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Delete leads without scores
    const result = await sql`
      DELETE FROM leads
      WHERE score IS NULL
      RETURNING id, domain
    `;

    return NextResponse.json({
      success: true,
      deleted: result.length,
      domains: result.map((r) => (r as { domain: string }).domain),
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      { status: 500 }
    );
  }
}
