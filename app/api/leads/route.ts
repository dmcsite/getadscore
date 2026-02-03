import { NextRequest, NextResponse } from "next/server";
import { getLeads, updateLeadStatus, getAllLeadsForExport, LeadStatus } from "@/lib/db";

// GET /api/leads - List leads with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      status: searchParams.get("status") as LeadStatus | undefined,
      minScore: searchParams.get("minScore") ? parseInt(searchParams.get("minScore")!) : undefined,
      maxScore: searchParams.get("maxScore") ? parseInt(searchParams.get("maxScore")!) : undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 100,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0,
    };

    const { leads, total } = await getLeads(filters);

    return NextResponse.json({
      success: true,
      leads,
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 100)) + 1,
      totalPages: Math.ceil(total / (filters.limit || 100)),
    });
  } catch (error) {
    console.error("Get leads error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get leads" },
      { status: 500 }
    );
  }
}

// PATCH /api/leads - Update lead status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, status, notes } = body;

    if (!leadId || !status) {
      return NextResponse.json(
        { error: "leadId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses: LeadStatus[] = ['new', 'contacted', 'replied', 'converted', 'not_interested'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const lead = await updateLeadStatus(leadId, status, notes);

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update lead" },
      { status: 500 }
    );
  }
}
