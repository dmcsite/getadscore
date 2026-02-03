import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env.local
const envPath = join(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Running migration...\n");

  // Create report_views table
  await sql`
    CREATE TABLE IF NOT EXISTS report_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_slug VARCHAR(100) NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip_hash VARCHAR(16),
      viewed_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("✓ Created report_views table");

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_report_views_slug ON report_views(report_slug)`;
  console.log("✓ Created index on report_slug");

  await sql`CREATE INDEX IF NOT EXISTS idx_report_views_viewed_at ON report_views(viewed_at)`;
  console.log("✓ Created index on viewed_at");

  console.log("\n✅ Migration complete!");
}

migrate().catch(console.error);
