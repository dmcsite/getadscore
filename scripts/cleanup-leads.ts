import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local manually
const envPath = join(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const sql = neon(process.env.DATABASE_URL!);

// Generic email prefixes to filter out
const GENERIC_EMAIL_PREFIXES = [
  "support",
  "info",
  "hello",
  "contact",
  "collabs",
  "collab",
  "collaborations",
  "partnerships",
  "partner",
  "help",
  "sales",
  "team",
  "admin",
  "office",
  "mail",
  "enquiries",
  "inquiries",
  "hr",
  "careers",
  "jobs",
  "press",
  "media",
];

// Relevant titles for decision makers
const RELEVANT_TITLE_KEYWORDS = [
  "founder",
  "ceo",
  "chief",
  "owner",
  "marketing",
  "growth",
  "paid",
  "media",
  "advertising",
  "acquisition",
  "performance",
  "digital",
  "ecommerce",
  "e-commerce",
  "director",
  "head of",
  "vp",
  "president",
  "cmo",
  "coo",
  "cto",
];

function isGenericEmail(email: string | null): boolean {
  if (!email) return true;
  const localPart = email.split("@")[0].toLowerCase();
  return GENERIC_EMAIL_PREFIXES.some(
    (prefix) => localPart === prefix || localPart.startsWith(prefix + ".") || localPart.startsWith(prefix + "_")
  );
}

function hasRelevantTitle(title: string | null): boolean {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();
  return RELEVANT_TITLE_KEYWORDS.some((keyword) => lowerTitle.includes(keyword));
}

async function cleanup() {
  console.log("Fetching all leads...\n");

  const leads = await sql`
    SELECT id, domain, brand_name, contact_name, contact_email, contact_title, score
    FROM leads
    ORDER BY created_at DESC
  `;

  console.log(`Total leads: ${leads.length}\n`);

  const toDelete: typeof leads = [];
  const toKeep: typeof leads = [];

  for (const lead of leads) {
    const reasons: string[] = [];

    // Check for deletion criteria
    if (!lead.contact_email) {
      reasons.push("No contact email");
    } else if (isGenericEmail(lead.contact_email)) {
      reasons.push(`Generic email: ${lead.contact_email}`);
    }

    if (!lead.contact_title) {
      reasons.push("No title");
    } else if (!hasRelevantTitle(lead.contact_title)) {
      reasons.push(`Irrelevant title: ${lead.contact_title}`);
    }

    if (lead.score === null) {
      reasons.push("No score");
    }

    if (reasons.length > 0) {
      toDelete.push({ ...lead, _reasons: reasons });
    } else {
      toKeep.push(lead);
    }
  }

  console.log("=== LEADS TO DELETE ===\n");
  for (const lead of toDelete) {
    console.log(`❌ ${lead.brand_name || lead.domain}`);
    console.log(`   Email: ${lead.contact_email || "none"}`);
    console.log(`   Title: ${lead.contact_title || "none"}`);
    console.log(`   Score: ${lead.score ?? "none"}`);
    console.log(`   Reasons: ${(lead as any)._reasons.join(", ")}`);
    console.log();
  }

  console.log("\n=== LEADS TO KEEP ===\n");
  for (const lead of toKeep) {
    console.log(`✅ ${lead.brand_name || lead.domain}`);
    console.log(`   Contact: ${lead.contact_name} (${lead.contact_title})`);
    console.log(`   Email: ${lead.contact_email}`);
    console.log(`   Score: ${lead.score}`);
    console.log();
  }

  console.log("\n=== SUMMARY ===");
  console.log(`To delete: ${toDelete.length}`);
  console.log(`To keep: ${toKeep.length}`);

  if (toDelete.length > 0) {
    console.log("\nDeleting leads...");
    const idsToDelete = toDelete.map((l) => l.id);

    await sql`
      DELETE FROM leads
      WHERE id = ANY(${idsToDelete}::uuid[])
    `;

    console.log(`✅ Deleted ${toDelete.length} leads`);
  }

  console.log("\nDone!");
}

cleanup().catch(console.error);
