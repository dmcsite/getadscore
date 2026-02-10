import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { createHash, randomBytes } from 'crypto';

// Lazy database connection initialization
let _sql: NeonQueryFunction<false, false> | null = null;

function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Rate limits by tier
const RATE_LIMITS: Record<string, number> = {
  free: 10,
  individual: 100,
  agency: 500,
};

// Types
export interface ApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  user_email: string;
  tier: string;
  requests_today: number;
  last_request_date: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface Report {
  id: string;
  api_key_id: string;
  brand_name: string;
  media_url: string;
  media_type: string;
  score: number;
  verdict: string;
  summary: {
    strength: string;
    risk: string;
    quick_win: string;
  };
  scores: Record<string, number>;
  top_fixes: string[];
  full_result: Record<string, unknown>;
  pdf_url: string | null;
  created_at: string;
  expires_at: string;
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Generate a new API key
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = randomBytes(24).toString('base64url');
  const key = `gads_${randomPart}`;
  const prefix = key.substring(0, 12);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

// Verify API key and return record
export async function verifyApiKey(key: string): Promise<ApiKey | null> {
  if (!key || !key.startsWith('gads_')) {
    return null;
  }

  const hash = hashApiKey(key);

  const result = await getDb()`
    SELECT * FROM api_keys
    WHERE key_hash = ${hash}
    AND revoked_at IS NULL
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as ApiKey;
}

// Check rate limit for API key
export async function checkRateLimit(apiKey: ApiKey): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = RATE_LIMITS[apiKey.tier] || RATE_LIMITS.free;
  const today = new Date().toISOString().split('T')[0];

  // Reset counter if it's a new day
  if (apiKey.last_request_date !== today) {
    return { allowed: true, remaining: limit - 1, limit };
  }

  const remaining = limit - apiKey.requests_today;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining - 1), limit };
}

// Increment request count
export async function incrementRequestCount(keyId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  await getDb()`
    UPDATE api_keys
    SET
      requests_today = CASE
        WHEN last_request_date = ${today}::date THEN requests_today + 1
        ELSE 1
      END,
      last_request_date = ${today}::date
    WHERE id = ${keyId}::uuid
  `;
}

// Create new API key
export async function createApiKey(email: string, name?: string, tier: string = 'free'): Promise<{ key: string; record: ApiKey }> {
  const { key, prefix, hash } = generateApiKey();

  const result = await getDb()`
    INSERT INTO api_keys (key_hash, key_prefix, name, user_email, tier)
    VALUES (${hash}, ${prefix}, ${name || null}, ${email}, ${tier})
    RETURNING *
  `;

  return { key, record: result[0] as ApiKey };
}

// Get API keys by email
export async function getApiKeysByEmail(email: string): Promise<ApiKey[]> {
  const result = await getDb()`
    SELECT id, key_prefix, name, user_email, tier, requests_today, last_request_date, created_at, revoked_at
    FROM api_keys
    WHERE user_email = ${email}
    ORDER BY created_at DESC
  `;

  return result as ApiKey[];
}

// Revoke API key
export async function revokeApiKey(keyId: string, email: string): Promise<boolean> {
  const result = await getDb()`
    UPDATE api_keys
    SET revoked_at = NOW()
    WHERE id = ${keyId}::uuid AND user_email = ${email}
    RETURNING id
  `;

  return result.length > 0;
}

// Save report
export async function saveReport(data: {
  apiKeyId: string;
  brandName: string;
  mediaUrl: string;
  mediaType: string;
  score: number;
  verdict: string;
  summary: Report['summary'];
  scores: Record<string, number>;
  topFixes: string[];
  fullResult: Record<string, unknown>;
  pdfUrl?: string;
}): Promise<Report> {
  const result = await getDb()`
    INSERT INTO reports (
      api_key_id, brand_name, media_url, media_type, score, verdict,
      summary, scores, top_fixes, full_result, pdf_url
    )
    VALUES (
      ${data.apiKeyId}::uuid,
      ${data.brandName},
      ${data.mediaUrl},
      ${data.mediaType},
      ${data.score},
      ${data.verdict},
      ${JSON.stringify(data.summary)}::jsonb,
      ${JSON.stringify(data.scores)}::jsonb,
      ${JSON.stringify(data.topFixes)}::jsonb,
      ${JSON.stringify(data.fullResult)}::jsonb,
      ${data.pdfUrl || null}
    )
    RETURNING *
  `;

  return result[0] as Report;
}

// Get report by ID
export async function getReport(reportId: string, apiKeyId: string): Promise<Report | null> {
  const result = await getDb()`
    SELECT * FROM reports
    WHERE id = ${reportId}::uuid
    AND api_key_id = ${apiKeyId}::uuid
    AND expires_at > NOW()
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as Report;
}

// Get reports by API key
export async function getReportsByApiKey(apiKeyId: string, limit: number = 50): Promise<Report[]> {
  const result = await getDb()`
    SELECT * FROM reports
    WHERE api_key_id = ${apiKeyId}::uuid
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return result as Report[];
}

// Update report with PDF URL
export async function updateReportPdfUrl(reportId: string, pdfUrl: string): Promise<void> {
  await getDb()`
    UPDATE reports
    SET pdf_url = ${pdfUrl}
    WHERE id = ${reportId}::uuid
  `;
}

// Clean up expired reports (call periodically)
export async function cleanupExpiredReports(): Promise<number> {
  const result = await getDb()`
    DELETE FROM reports
    WHERE expires_at < NOW()
    RETURNING id
  `;

  return result.length;
}

// Free tier tracking
export interface FreeUser {
  id: string;
  email: string;
  used_free_at: string;
  subscribed_at: string | null;
  plan_type: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

// Check if email has used free tier
export async function checkFreeUsage(email: string): Promise<{ hasUsedFree: boolean; isSubscribed: boolean; planType: string | null }> {
  const normalizedEmail = email.toLowerCase().trim();

  const result = await getDb()`
    SELECT used_free_at, subscribed_at, plan_type FROM free_users
    WHERE email = ${normalizedEmail}
  `;

  if (result.length === 0) {
    return { hasUsedFree: false, isSubscribed: false, planType: null };
  }

  const user = result[0] as { used_free_at: string | null; subscribed_at: string | null; plan_type: string | null };
  return {
    hasUsedFree: user.used_free_at !== null,
    isSubscribed: user.subscribed_at !== null,
    planType: user.plan_type,
  };
}

// Record free usage for email
export async function recordFreeUsage(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  await getDb()`
    INSERT INTO free_users (email, used_free_at)
    VALUES (${normalizedEmail}, NOW())
    ON CONFLICT (email) DO UPDATE SET used_free_at = NOW()
  `;
}

// Mark email as subscribed
export async function markSubscribed(email: string, planType?: string, stripeCustomerId?: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  await getDb()`
    INSERT INTO free_users (email, subscribed_at, plan_type, stripe_customer_id)
    VALUES (${normalizedEmail}, NOW(), ${planType || null}, ${stripeCustomerId || null})
    ON CONFLICT (email) DO UPDATE SET
      subscribed_at = NOW(),
      plan_type = COALESCE(${planType || null}, free_users.plan_type),
      stripe_customer_id = COALESCE(${stripeCustomerId || null}, free_users.stripe_customer_id)
  `;
}

// Get Stripe customer ID for email
export async function getStripeCustomerId(email: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim();

  const result = await getDb()`
    SELECT stripe_customer_id FROM free_users
    WHERE email = ${normalizedEmail}
  `;

  if (result.length === 0) {
    return null;
  }

  return (result[0] as { stripe_customer_id: string | null }).stripe_customer_id;
}

// ==========================================
// Public Reports
// ==========================================

export interface PublicReport {
  id: string;
  slug: string;
  user_email: string | null;
  ad_name: string;
  overall_score: number;
  verdict: string;
  report_data: {
    summary: {
      strength: string;
      risk: string;
      quick_win: string;
    };
    scores: Record<string, { score: number; reason: string }>;
    top_fixes: string[];
    media_type: string;
    transcript?: string;
    ad_copy?: string;
  };
  pdf_url: string | null;
  creative_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

// Generate a URL-friendly slug
function generateSlug(adName: string): string {
  const cleanName = adName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  const randomSuffix = randomBytes(3).toString('hex');
  return `${cleanName}-${randomSuffix}`;
}

// Save a public report
export async function savePublicReport(data: {
  userEmail?: string;
  adName: string;
  overallScore: number;
  verdict: string;
  reportData: PublicReport['report_data'];
  pdfUrl?: string;
  creativeUrl?: string;
  thumbnailUrl?: string;
}): Promise<PublicReport> {
  const slug = generateSlug(data.adName);

  const result = await getDb()`
    INSERT INTO public_reports (
      slug, user_email, ad_name, overall_score, verdict, report_data, pdf_url, creative_url, thumbnail_url
    )
    VALUES (
      ${slug},
      ${data.userEmail || null},
      ${data.adName},
      ${data.overallScore},
      ${data.verdict},
      ${JSON.stringify(data.reportData)}::jsonb,
      ${data.pdfUrl || null},
      ${data.creativeUrl || null},
      ${data.thumbnailUrl || null}
    )
    RETURNING *
  `;

  return result[0] as PublicReport;
}

// Get a public report by slug
export async function getPublicReportBySlug(slug: string): Promise<PublicReport | null> {
  const result = await getDb()`
    SELECT * FROM public_reports
    WHERE slug = ${slug}
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as PublicReport;
}

// Update public report with PDF URL
export async function updatePublicReportPdfUrl(slug: string, pdfUrl: string): Promise<void> {
  await getDb()`
    UPDATE public_reports
    SET pdf_url = ${pdfUrl}
    WHERE slug = ${slug}
  `;
}

// ==========================================
// Brand Cache (for Foreplay optimization)
// ==========================================

export interface CachedBrand {
  id: string;
  domain: string;
  brand_id: string;
  brand_name: string;
  cached_at: string;
}

// Get cached brand by domain
export async function getCachedBrand(domain: string): Promise<CachedBrand | null> {
  const result = await getDb()`
    SELECT * FROM brand_cache
    WHERE domain = ${domain.toLowerCase()}
    AND cached_at > NOW() - INTERVAL '30 days'
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as CachedBrand;
}

// Cache a brand lookup
export async function cacheBrand(domain: string, brandId: string, brandName: string): Promise<void> {
  await getDb()`
    INSERT INTO brand_cache (domain, brand_id, brand_name)
    VALUES (${domain.toLowerCase()}, ${brandId}, ${brandName})
    ON CONFLICT (domain) DO UPDATE SET
      brand_id = ${brandId},
      brand_name = ${brandName},
      cached_at = NOW()
  `;
}

// Get recent report for a brand (within last N days)
export async function getRecentReportForBrand(brandName: string, daysAgo: number = 14): Promise<PublicReport | null> {
  const result = await getDb()`
    SELECT * FROM public_reports
    WHERE LOWER(ad_name) LIKE ${`%${brandName.toLowerCase()}%`}
    AND created_at > NOW() - INTERVAL '1 day' * ${daysAgo}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as PublicReport;
}

// ==========================================
// Leads Tracking
// ==========================================

export type LeadStatus = 'new' | 'contacted' | 'replied' | 'converted' | 'not_interested';

export interface Lead {
  id: string;
  domain: string;
  brand_name: string | null;
  report_url: string | null;
  report_slug: string | null;
  score: number | null;
  verdict: string | null;
  top_fix: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_linkedin: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  contacted_at: string | null;
}

// Save a new lead
export async function saveLead(data: {
  domain: string;
  brandName?: string;
  reportUrl?: string;
  reportSlug?: string;
  score?: number;
  verdict?: string;
  topFix?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactLinkedin?: string;
}): Promise<Lead> {
  const result = await getDb()`
    INSERT INTO leads (
      domain, brand_name, report_url, report_slug, score, verdict, top_fix,
      contact_name, contact_title, contact_email, contact_linkedin
    )
    VALUES (
      ${data.domain.toLowerCase()},
      ${data.brandName || null},
      ${data.reportUrl || null},
      ${data.reportSlug || null},
      ${data.score || null},
      ${data.verdict || null},
      ${data.topFix || null},
      ${data.contactName || null},
      ${data.contactTitle || null},
      ${data.contactEmail || null},
      ${data.contactLinkedin || null}
    )
    RETURNING *
  `;

  return result[0] as Lead;
}

// Get lead by domain (to avoid duplicates)
export async function getLeadByDomain(domain: string): Promise<Lead | null> {
  const result = await getDb()`
    SELECT * FROM leads
    WHERE domain = ${domain.toLowerCase()}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as Lead;
}

// Get all leads with optional filters
export async function getLeads(filters?: {
  status?: LeadStatus;
  minScore?: number;
  maxScore?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ leads: Lead[]; total: number }> {
  const conditions: string[] = [];

  // Build dynamic query based on filters
  let query = getDb()`
    SELECT * FROM leads
    WHERE 1=1
    ${filters?.status ? getDb()`AND status = ${filters.status}` : getDb()``}
    ${filters?.minScore ? getDb()`AND score >= ${filters.minScore}` : getDb()``}
    ${filters?.maxScore ? getDb()`AND score <= ${filters.maxScore}` : getDb()``}
    ${filters?.startDate ? getDb()`AND created_at >= ${filters.startDate}::timestamp` : getDb()``}
    ${filters?.endDate ? getDb()`AND created_at <= ${filters.endDate}::timestamp` : getDb()``}
    ORDER BY created_at DESC
    LIMIT ${filters?.limit || 100}
    OFFSET ${filters?.offset || 0}
  `;

  const countQuery = getDb()`
    SELECT COUNT(*) as count FROM leads
    WHERE 1=1
    ${filters?.status ? getDb()`AND status = ${filters.status}` : getDb()``}
    ${filters?.minScore ? getDb()`AND score >= ${filters.minScore}` : getDb()``}
    ${filters?.maxScore ? getDb()`AND score <= ${filters.maxScore}` : getDb()``}
    ${filters?.startDate ? getDb()`AND created_at >= ${filters.startDate}::timestamp` : getDb()``}
    ${filters?.endDate ? getDb()`AND created_at <= ${filters.endDate}::timestamp` : getDb()``}
  `;

  const [leads, countResult] = await Promise.all([query, countQuery]);

  return {
    leads: leads as Lead[],
    total: parseInt((countResult[0] as { count: string }).count, 10),
  };
}

// Update lead status
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  notes?: string
): Promise<Lead | null> {
  const result = await getDb()`
    UPDATE leads
    SET
      status = ${status},
      notes = COALESCE(${notes || null}, notes),
      contacted_at = ${status === 'contacted' ? getDb()`NOW()` : getDb()`contacted_at`}
    WHERE id = ${leadId}::uuid
    RETURNING *
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as Lead;
}

// Get all leads for CSV export (no pagination)
export async function getAllLeadsForExport(filters?: {
  status?: LeadStatus;
  minScore?: number;
  maxScore?: number;
}): Promise<Lead[]> {
  const result = await getDb()`
    SELECT * FROM leads
    WHERE 1=1
    ${filters?.status ? getDb()`AND status = ${filters.status}` : getDb()``}
    ${filters?.minScore ? getDb()`AND score >= ${filters.minScore}` : getDb()``}
    ${filters?.maxScore ? getDb()`AND score <= ${filters.maxScore}` : getDb()``}
    ORDER BY created_at DESC
  `;

  return result as Lead[];
}

// Delete a single lead
export async function deleteLead(leadId: string): Promise<boolean> {
  const result = await getDb()`
    DELETE FROM leads
    WHERE id = ${leadId}
    RETURNING id
  `;
  return result.length > 0;
}

// Delete multiple leads
export async function deleteLeads(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0;

  await getDb()`
    DELETE FROM leads
    WHERE id = ANY(${leadIds}::uuid[])
  `;
  return leadIds.length;
}

// ==========================================
// Report Views Analytics
// ==========================================

export interface ReportView {
  id: string;
  report_slug: string;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  viewed_at: string;
}

// Log a report view
export async function logReportView(data: {
  slug: string;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
}): Promise<void> {
  await getDb()`
    INSERT INTO report_views (report_slug, referrer, user_agent, ip_hash)
    VALUES (${data.slug}, ${data.referrer || null}, ${data.userAgent || null}, ${data.ipHash || null})
  `;
}

// Get view count for a single report
export async function getReportViewCount(slug: string): Promise<number> {
  const result = await getDb()`
    SELECT COUNT(*) as count FROM report_views
    WHERE report_slug = ${slug}
  `;
  return parseInt((result[0] as { count: string }).count, 10);
}

// Get view counts for multiple reports (by slug)
export async function getReportViewCounts(slugs: string[]): Promise<Record<string, number>> {
  if (slugs.length === 0) return {};

  const result = await getDb()`
    SELECT report_slug, COUNT(*) as count
    FROM report_views
    WHERE report_slug = ANY(${slugs})
    GROUP BY report_slug
  `;

  const counts: Record<string, number> = {};
  for (const row of result as { report_slug: string; count: string }[]) {
    counts[row.report_slug] = parseInt(row.count, 10);
  }
  return counts;
}

// Get view counts for leads (by report_slug from leads table)
export async function getViewCountsForLeads(): Promise<Record<string, number>> {
  const result = await getDb()`
    SELECT l.report_slug, COUNT(rv.id) as count
    FROM leads l
    LEFT JOIN report_views rv ON rv.report_slug = l.report_slug
    WHERE l.report_slug IS NOT NULL
    GROUP BY l.report_slug
  `;

  const counts: Record<string, number> = {};
  for (const row of result as { report_slug: string; count: string }[]) {
    if (row.report_slug) {
      counts[row.report_slug] = parseInt(row.count, 10);
    }
  }
  return counts;
}
