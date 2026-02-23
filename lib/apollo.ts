// Apollo API integration for contact enrichment
// Docs: https://docs.apollo.io
// Note: Hunter email lookup disabled due to rate limits

// Hunter import disabled - rate limited
// import { findEmail as hunterFindEmail } from "./hunter";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";

// Marketing titles in priority order - we want the person managing ad creative
const MARKETING_TITLES = [
  "Senior Digital Marketing Manager",
  "Head of Growth",
  "VP Marketing",
  "VP of Growth",
  "Performance Marketing Manager",
  "Growth Marketing Manager",
  "Director of Growth",
  "Director of Ecommerce",
  "Marketing Director",
  "CMO",
  "Chief Marketing Officer",
  "Director of Marketing",
  "VP of Marketing",
  "Head of Marketing",
  "Digital Marketing Manager",
  "Paid Media Manager",
  "Paid Acquisition Manager",
  "Ecommerce Manager",
  "Growth Manager",
  "Brand Manager",
  "Content Manager",
  "Social Media Manager",
  "Community Manager",
];

// Fallback titles (founder/CEO) - only use if no marketing titles found
const FALLBACK_TITLES = [
  "Founder",
  "Co-Founder",
  "CEO",
  "Chief Executive Officer",
  "Owner",
];

// Search results have obfuscated last names
interface ApolloSearchPerson {
  id: string;
  first_name: string | null;
  last_name_obfuscated?: string | null;
  title: string | null;
  has_email: boolean;
  organization?: {
    name: string | null;
  } | null;
}

interface PeopleSearchResponse {
  people: ApolloSearchPerson[];
  total_entries: number;
}

// Full person details from match/enrich
interface ApolloFullPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  email_status: string | null;
  linkedin_url: string | null;
  organization?: {
    name: string | null;
    website_url: string | null;
  } | null;
}

interface EnrichmentResponse {
  person: ApolloFullPerson | null;
}

export interface Contact {
  name: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  linkedin: string | null;
  company: string | null;
}

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) {
    throw new Error("APOLLO_API_KEY environment variable is not set");
  }
  return key;
}

// Parse a full name into first and last name
function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

// Convert Apollo full person to our Contact type
function personToContact(person: ApolloFullPerson): Contact {
  return {
    name: person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim() || "Unknown",
    firstName: person.first_name || null,
    lastName: person.last_name || null,
    title: person.title || null,
    email: person.email || null,
    linkedin: person.linkedin_url || null,
    company: person.organization?.name || null,
  };
}

// Score a person based on title match priority
function scoreTitleMatch(title: string | null): number {
  if (!title) return -1;
  const lowerTitle = title.toLowerCase();

  // Check marketing titles first (higher priority = lower index = higher score)
  for (let i = 0; i < MARKETING_TITLES.length; i++) {
    if (lowerTitle.includes(MARKETING_TITLES[i].toLowerCase())) {
      return 1000 - i; // Higher score for earlier titles
    }
  }

  // Check fallback titles (founder/CEO)
  for (let i = 0; i < FALLBACK_TITLES.length; i++) {
    if (lowerTitle.includes(FALLBACK_TITLES[i].toLowerCase())) {
      return 100 - i; // Lower score than marketing titles
    }
  }

  return -1; // No match
}

// Search for contacts at a domain by title priority
// Two-step process: search returns partial data, then match to try to get full details
export async function searchContactByDomain(domain: string): Promise<Contact | null> {
  // Step 1: Search for people at this domain
  const searchResponse = await fetch(`${APOLLO_BASE_URL}/mixed_people/api_search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      q_organization_domains: domain,
      page: 1,
      per_page: 50,
    }),
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    if (searchResponse.status === 404) {
      return null;
    }
    throw new Error(`Apollo search error (${searchResponse.status}): ${errorText}`);
  }

  const searchData: PeopleSearchResponse = await searchResponse.json();
  const people = searchData.people || [];

  if (people.length === 0) {
    return null;
  }

  // Score and sort by title priority
  const scored = people
    .map((person) => ({
      person,
      score: scoreTitleMatch(person.title),
    }))
    .filter((item) => item.score > 0 && item.person.first_name)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return null;
  }

  // Step 2: Try to get full details via people/match for top candidates
  // Use person ID from search to reveal email
  for (let i = 0; i < Math.min(scored.length, 5); i++) {
    const candidate = scored[i].person;

    // Only try to reveal if the person has an email available
    if (!candidate.has_email) {
      continue;
    }

    try {
      const matchResponse = await fetch(`${APOLLO_BASE_URL}/people/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": getApiKey(),
        },
        body: JSON.stringify({
          id: candidate.id, // Use person ID to reveal email
        }),
      });

      if (matchResponse.ok) {
        const matchData: EnrichmentResponse = await matchResponse.json();
        if (matchData.person?.email) {
          console.log(`Apollo: Found email for ${matchData.person.name} (${matchData.person.title}): ${matchData.person.email}`);
          return personToContact(matchData.person);
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  // Return best candidate from Apollo (email lookup disabled - Hunter rate-limited)
  const bestCandidate = scored[0].person;
  console.log(`Apollo: Found contact: ${bestCandidate.first_name} (${bestCandidate.title})`);

  // Hunter email lookup disabled due to rate limits
  // TODO: Re-enable when Hunter billing resets or upgrade plan
  /*
  try {
    const hunterResult = await hunterFindEmail({
      domain,
      firstName: bestCandidate.first_name || undefined,
    });
    if (hunterResult?.email) {
      console.log(`Hunter: Found email for ${bestCandidate.first_name}: ${hunterResult.email}`);
      return { ...contact, email: hunterResult.email, linkedin: hunterResult.linkedin };
    }
  } catch (error) {
    console.log(`Hunter email lookup failed:`, error);
  }
  */

  return {
    name: bestCandidate.first_name || "Unknown",
    firstName: bestCandidate.first_name || null,
    lastName: null,
    title: bestCandidate.title || null,
    email: null,
    linkedin: null,
    company: bestCandidate.organization?.name || null,
  };
}

// Enrich a person to get their email using name + domain or LinkedIn URL
export async function enrichContact(options: {
  name?: string;
  firstName?: string;
  lastName?: string;
  domain?: string;
  linkedinUrl?: string;
}): Promise<Contact | null> {
  const { name, firstName, lastName, domain, linkedinUrl } = options;

  // Need either LinkedIn URL or (name + domain)
  if (!linkedinUrl && !((firstName || name) && domain)) {
    console.error("Apollo enrichment requires linkedinUrl OR (name + domain)");
    return null;
  }

  // Build request body
  const body: Record<string, unknown> = {};

  if (linkedinUrl) {
    body.linkedin_url = linkedinUrl;
  }

  if (domain) {
    body.domain = domain;
  }

  // Parse name if only full name provided
  if (name && !firstName && !lastName) {
    const parsed = parseName(name);
    body.first_name = parsed.firstName;
    body.last_name = parsed.lastName;
  } else {
    if (firstName) body.first_name = firstName;
    if (lastName) body.last_name = lastName;
  }

  const response = await fetch(`${APOLLO_BASE_URL}/people/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Don't throw on 404 - just means no match
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Apollo enrichment error (${response.status}): ${errorText}`);
  }

  const data: EnrichmentResponse = await response.json();
  const person = data.person;

  if (!person) {
    return null;
  }

  return personToContact(person);
}

// Main function: Find the best contact at a domain
// Strategy:
// 1. Search domain for people with marketing titles (priority order)
// 2. If marketing contact found (with or without email), return them
// 3. Only fall back to provided contact_name if NO marketing contact found
// Goal: Always find the ad creative manager, not the founder
export async function findContact(
  domain: string,
  options?: {
    contactName?: string;
    linkedinUrl?: string;
  }
): Promise<Contact | null> {
  const { contactName, linkedinUrl } = options || {};

  // Step 1: Search domain for marketing-titled contacts
  try {
    const searchResult = await searchContactByDomain(domain);
    if (searchResult) {
      // Found a marketing contact - return them even without email
      console.log(`Apollo: Found marketing contact at ${domain}: ${searchResult.name} (${searchResult.title}) - email: ${searchResult.email || "none"}`);
      return searchResult;
    }
  } catch (error) {
    console.log(`Apollo search failed for ${domain}:`, error instanceof Error ? error.message : error);
  }

  // Step 2: No marketing contact found - fall back to provided contact info
  if (contactName || linkedinUrl) {
    try {
      const enrichResult = await enrichContact({
        name: contactName,
        domain,
        linkedinUrl,
      });
      if (enrichResult) {
        console.log(`Apollo: No marketing contact, using provided: ${enrichResult.name} (${enrichResult.title}) - email: ${enrichResult.email || "none"}`);
        return enrichResult;
      }
    } catch (error) {
      console.log(`Apollo enrichment failed for ${domain}:`, error instanceof Error ? error.message : error);
    }
  }

  return null;
}
