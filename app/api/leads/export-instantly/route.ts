import { NextRequest, NextResponse } from "next/server";
import { neon, NeonQueryFunction } from "@neondatabase/serverless";

interface LeadRow {
  contact_name: string | null;
  contact_email: string;
  brand_name: string | null;
  domain: string;
  score: number;
  verdict: string | null;
  report_url: string;
}

let _sql: NeonQueryFunction<false, false> | null = null;

function getDbConnection(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Get qualified leads (those with scores and emails)
    const sql = getDbConnection();

    let leads: LeadRow[];
    if (status) {
      leads = await sql`
        SELECT contact_name, contact_email, brand_name, domain, score, verdict, report_url FROM leads
        WHERE contact_email IS NOT NULL
        AND score IS NOT NULL
        AND report_url IS NOT NULL
        AND status = ${status}
        ORDER BY created_at DESC
      ` as LeadRow[];
    } else {
      leads = await sql`
        SELECT contact_name, contact_email, brand_name, domain, score, verdict, report_url FROM leads
        WHERE contact_email IS NOT NULL
        AND score IS NOT NULL
        AND report_url IS NOT NULL
        ORDER BY created_at DESC
      ` as LeadRow[];
    }

    // Build CSV for Instantly
    const headers = [
      "first_name",
      "last_name",
      "email",
      "company",
      "domain",
      "score",
      "verdict",
      "report_url",
      "custom_line",
    ];

    const rows = leads.map((lead) => {
      // Split name into first/last
      const nameParts = (lead.contact_name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Build custom personalization line
      const company = lead.brand_name || lead.domain;
      const customLine = `Your ${company} ad scored ${lead.score}/100 - ${lead.verdict || "see report"}`;

      return [
        firstName,
        lastName,
        lead.contact_email,
        lead.brand_name || "",
        lead.domain,
        lead.score.toString(),
        lead.verdict || "",
        lead.report_url,
        customLine,
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const escaped = cell.replace(/"/g, '""');
          return escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")
            ? `"${escaped}"`
            : escaped;
        }).join(",")
      ),
    ].join("\n");

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="instantly-leads-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Instantly export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
