import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { searchContactByDomain } from "@/lib/apollo";

// POST /api/leads/enrich - Enrich leads with Apollo contact data
export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Get leads with scores but no email
    const leads = await sql`
      SELECT id, domain, brand_name, contact_name
      FROM leads
      WHERE score IS NOT NULL
      AND (contact_email IS NULL OR contact_email = '')
      ORDER BY created_at DESC
    `;

    console.log(`Enriching ${leads.length} leads...`);

    const results: Array<{
      domain: string;
      success: boolean;
      email?: string;
      contact?: string;
      error?: string;
    }> = [];

    for (const lead of leads) {
      const domain = lead.domain as string;
      console.log(`Enriching ${domain}...`);

      try {
        const contact = await searchContactByDomain(domain);

        if (contact?.email) {
          // Update lead with contact info
          await sql`
            UPDATE leads
            SET
              contact_name = ${contact.name},
              contact_title = ${contact.title},
              contact_email = ${contact.email},
              contact_linkedin = ${contact.linkedin}
            WHERE id = ${lead.id}::uuid
          `;

          results.push({
            domain,
            success: true,
            email: contact.email,
            contact: `${contact.name} (${contact.title})`,
          });
          console.log(`  -> ${contact.name}: ${contact.email}`);
        } else if (contact) {
          // Update with contact info even without email
          await sql`
            UPDATE leads
            SET
              contact_name = ${contact.name},
              contact_title = ${contact.title},
              contact_linkedin = ${contact.linkedin}
            WHERE id = ${lead.id}::uuid
          `;

          results.push({
            domain,
            success: false,
            contact: `${contact.name} (${contact.title})`,
            error: "No email available",
          });
          console.log(`  -> ${contact.name}: no email`);
        } else {
          results.push({
            domain,
            success: false,
            error: "No contact found",
          });
          console.log(`  -> No contact found`);
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          domain,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.log(`  -> Error: ${error}`);
      }
    }

    const enriched = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      total: leads.length,
      enriched,
      failed,
      results,
    });
  } catch (error) {
    console.error("Enrich error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enrichment failed" },
      { status: 500 }
    );
  }
}
