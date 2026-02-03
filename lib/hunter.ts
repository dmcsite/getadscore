// Hunter.io API integration for contact enrichment
// Docs: https://hunter.io/api

const HUNTER_BASE_URL = "https://api.hunter.io/v2";

interface HunterEmail {
  value: string;
  type: string;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  seniority: string | null;
  department: string | null;
  linkedin: string | null;
  twitter: string | null;
  phone_number: string | null;
}

interface HunterDomainSearchResponse {
  data: {
    domain: string;
    disposable: boolean;
    webmail: boolean;
    accept_all: boolean;
    pattern: string | null;
    organization: string | null;
    emails: HunterEmail[];
  };
  meta: {
    results: number;
    limit: number;
    offset: number;
  };
}

export interface Contact {
  name: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string;
  linkedin: string | null;
  company: string | null;
  confidence: number;
}

function getApiKey(): string {
  const key = process.env.HUNTER_API_KEY;
  if (!key) {
    throw new Error("HUNTER_API_KEY environment variable is not set");
  }
  return key;
}

// Search for contacts at a domain
export async function searchDomain(
  domain: string,
  options?: {
    limit?: number;
    department?: string;
    seniority?: string;
  }
): Promise<HunterEmail[]> {
  const params = new URLSearchParams({
    domain,
    api_key: getApiKey(),
  });

  if (options?.limit) {
    params.append("limit", String(options.limit));
  }
  if (options?.department) {
    params.append("department", options.department);
  }
  if (options?.seniority) {
    params.append("seniority", options.seniority);
  }

  const response = await fetch(`${HUNTER_BASE_URL}/domain-search?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Hunter API error (${response.status}): ${errorData.errors?.[0]?.details || response.statusText}`
    );
  }

  const data: HunterDomainSearchResponse = await response.json();
  return data.data.emails || [];
}

// Find the best contact at a company (prioritize marketing/growth roles)
export async function findContact(
  domain: string,
  preferredTitles: string[] = [
    "head of growth",
    "vp growth",
    "growth",
    "performance marketing",
    "paid social",
    "paid media",
    "digital marketing",
    "marketing director",
    "marketing manager",
    "cmo",
    "founder",
    "ceo",
    "co-founder",
    "owner",
  ]
): Promise<Contact | null> {
  // Search for emails at the domain (free plan limited to 10)
  const emails = await searchDomain(domain, { limit: 10 });

  if (emails.length === 0) {
    return null;
  }

  // Filter to only emails with names
  const namedEmails = emails.filter(
    (e) => e.first_name && e.last_name && e.confidence >= 50
  );

  if (namedEmails.length === 0) {
    // Fall back to any email with decent confidence
    const bestEmail = emails
      .filter((e) => e.confidence >= 50)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (bestEmail) {
      return {
        name: bestEmail.value.split("@")[0].replace(/[._]/g, " "),
        firstName: null,
        lastName: null,
        title: bestEmail.position,
        email: bestEmail.value,
        linkedin: bestEmail.linkedin,
        company: null,
        confidence: bestEmail.confidence,
      };
    }
    return null;
  }

  // Sort by title priority
  const sortedEmails = [...namedEmails].sort((a, b) => {
    const aTitle = a.position?.toLowerCase() || "";
    const bTitle = b.position?.toLowerCase() || "";

    const aIndex = preferredTitles.findIndex((t) => aTitle.includes(t));
    const bIndex = preferredTitles.findIndex((t) => bTitle.includes(t));

    // If both found, lower index = higher priority
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    // If only one found, that one wins
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // Fall back to confidence score
    return b.confidence - a.confidence;
  });

  const best = sortedEmails[0];

  return {
    name: `${best.first_name} ${best.last_name}`.trim(),
    firstName: best.first_name,
    lastName: best.last_name,
    title: best.position,
    email: best.value,
    linkedin: best.linkedin,
    company: null,
    confidence: best.confidence,
  };
}
