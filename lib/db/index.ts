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
  created_at: string;
}

// Check if email has used free tier
export async function checkFreeUsage(email: string): Promise<{ hasUsedFree: boolean; isSubscribed: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  const result = await getDb()`
    SELECT used_free_at, subscribed_at FROM free_users
    WHERE email = ${normalizedEmail}
  `;

  if (result.length === 0) {
    return { hasUsedFree: false, isSubscribed: false };
  }

  const user = result[0] as { used_free_at: string | null; subscribed_at: string | null };
  return {
    hasUsedFree: user.used_free_at !== null,
    isSubscribed: user.subscribed_at !== null,
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
export async function markSubscribed(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  await getDb()`
    INSERT INTO free_users (email, subscribed_at)
    VALUES (${normalizedEmail}, NOW())
    ON CONFLICT (email) DO UPDATE SET subscribed_at = NOW()
  `;
}
