import { NextRequest, NextResponse } from "next/server";
import { getAllLeadsForExport, LeadStatus } from "@/lib/db";

// GET /api/leads/export - Export leads as CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get("status") as LeadStatus | undefined,
      minScore: searchParams.get("minScore") ? parseInt(searchParams.get("minScore")!) : undefined,
      maxScore: searchParams.get("maxScore") ? parseInt(searchParams.get("maxScore")!) : undefined,
    };

    const leads = await getAllLeadsForExport(filters);

    // Build CSV
    const headers = [
      "Domain",
      "Brand Name",
      "Score",
      "Verdict",
      "Contact Name",
      "Contact Title",
      "Contact Email",
      "Contact LinkedIn",
      "Report URL",
      "Top Fix",
      "Status",
      "Created At",
      "Contacted At",
      "Notes",
    ];

    const rows = leads.map((lead) => [
      lead.domain,
      lead.brand_name || "",
      lead.score?.toString() || "",
      lead.verdict || "",
      lead.contact_name || "",
      lead.contact_title || "",
      lead.contact_email || "",
      lead.contact_linkedin || "",
      lead.report_url || "",
      lead.top_fix || "",
      lead.status,
      lead.created_at,
      lead.contacted_at || "",
      lead.notes || "",
    ]);

    // Escape CSV values
    const escapeCSV = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) {
        return "";
      }
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export leads error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export leads" },
      { status: 500 }
    );
  }
}
