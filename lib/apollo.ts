// Apollo API integration for contact enrichment
// Docs: https://docs.apollo.io

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";

interface ApolloSearchPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  linkedin_url: string;
  organization_id: string;
  organization?: {
    name: string;
    website_url: string;
  };
}

interface ApolloEnrichedPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string;
  linkedin_url: string;
  organization?: {
    name: string;
    website_url: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
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

// Search for people at a company by domain and job titles
export async function searchPeopleByDomain(
  domain: string,
  titles: string[],
  limit: number = 5
): Promise<ApolloSearchPerson[]> {
  const response = await fetch(`${APOLLO_BASE_URL}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      q_organization_domains: domain,
      person_titles: titles,
      per_page: limit,
      page: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apollo search error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.people || [];
}

// Enrich a person to get their email
export async function enrichPerson(
  firstName: string,
  lastName: string,
  domain: string
): Promise<ApolloEnrichedPerson | null> {
  const response = await fetch(`${APOLLO_BASE_URL}/people/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      domain: domain,
      reveal_personal_emails: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Apollo enrich error (${response.status}): ${errorText}`);
    return null;
  }

  const data = await response.json();
  return data.person || null;
}

// Find the best contact at a company
export async function findContact(
  domain: string,
  preferredTitles: string[] = [
    "Head of Growth",
    "VP Growth",
    "Growth Marketing",
    "Performance Marketing Manager",
    "Paid Social Manager",
    "Digital Marketing Manager",
    "Marketing Director",
    "CMO",
    "Founder",
    "CEO",
    "Co-founder",
  ]
): Promise<Contact | null> {
  // Search for people with matching titles
  const searchResults = await searchPeopleByDomain(domain, preferredTitles, 10);

  if (searchResults.length === 0) {
    return null;
  }

  // Sort by title priority (first match in preferredTitles is highest priority)
  const sortedResults = [...searchResults].sort((a, b) => {
    const aIndex = preferredTitles.findIndex(t =>
      a.title?.toLowerCase().includes(t.toLowerCase())
    );
    const bIndex = preferredTitles.findIndex(t =>
      b.title?.toLowerCase().includes(t.toLowerCase())
    );

    // If both found, lower index = higher priority
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    // If only one found, that one wins
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  // Try to enrich the top candidate to get email
  for (const person of sortedResults.slice(0, 3)) {
    const enriched = await enrichPerson(
      person.first_name,
      person.last_name,
      domain
    );

    if (enriched?.email) {
      return {
        id: enriched.id,
        name: enriched.name || `${enriched.first_name} ${enriched.last_name}`,
        firstName: enriched.first_name,
        lastName: enriched.last_name,
        title: enriched.title,
        email: enriched.email,
        linkedin: enriched.linkedin_url || null,
        company: enriched.organization?.name || null,
      };
    }
  }

  // Return best match without email if enrichment failed
  const best = sortedResults[0];
  return {
    id: best.id,
    name: best.name || `${best.first_name} ${best.last_name}`,
    firstName: best.first_name,
    lastName: best.last_name,
    title: best.title,
    email: null,
    linkedin: best.linkedin_url || null,
    company: best.organization?.name || null,
  };
}
