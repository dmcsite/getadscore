import { NextRequest, NextResponse } from "next/server";
import { discoverBrands, extractDomainFromBrand } from "@/lib/foreplay";
import { getLeadByDomain } from "@/lib/db";
import { findContact } from "@/lib/hunter";

export const maxDuration = 120; // Allow more time for Hunter lookups

// Domains to exclude (social media, landing page builders, etc.)
const EXCLUDED_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "twitter.com",
  "youtube.com",
  "linkedin.com",
  "pinterest.com",
  "pagedeck.app",
  "linktree.com",
  "linktr.ee",
  "bio.link",
  "carrd.co",
  "fb.me",
  "bit.ly",
  "goo.gl",
  "shopify.com",
  "myshopify.com",
];

// Generic email prefixes to filter out
const GENERIC_EMAIL_PREFIXES = [
  "support",
  "info",
  "hello",
  "contact",
  "collabs",
  "collab",
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
];

function isGenericEmail(email: string): boolean {
  const localPart = email.split("@")[0].toLowerCase();
  return GENERIC_EMAIL_PREFIXES.some(
    (prefix) => localPart === prefix || localPart.startsWith(prefix + ".")
  );
}

function hasRelevantTitle(title: string | null): boolean {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();
  return RELEVANT_TITLE_KEYWORDS.some((keyword) => lowerTitle.includes(keyword));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      niche,
      niches,
      limit = 10,
      usUkOnly = false,
      includeContact = true,
    } = body;

    // Support both single niche and array of niches
    const nicheList = niches || (niche ? [niche] : []);

    if (nicheList.length === 0) {
      return NextResponse.json(
        { error: "niche or niches is required" },
        { status: 400 }
      );
    }

    // Build country filter
    const countries = usUkOnly ? ["US", "GB", "UK"] : undefined;

    // Discover brands from Foreplay Discovery Ads API (images only)
    const brands = await discoverBrands({
      query: nicheList[0],
      niches: nicheList,
      limit: Math.min(limit * 3, 30), // Fetch more to account for filtering
      imageOnly: true,
      countries,
    });

    // Extract domains and filter out brands without websites
    const prospects: Array<{
      brandId: string;
      brandName: string;
      domain: string;
      avatar?: string;
      alreadyLead: boolean;
      contact?: {
        name: string;
        firstName: string | null;
        title: string | null;
        email: string;
        linkedin: string | null;
      };
      qualified: boolean;
      disqualifyReason?: string;
    }> = [];

    let processedCount = 0;
    const maxToProcess = limit * 3; // Process up to 3x to find enough qualified

    for (const brand of brands) {
      // Stop if we have enough qualified prospects or processed too many
      const qualifiedCount = prospects.filter((p) => p.qualified).length;
      if (qualifiedCount >= limit || processedCount >= maxToProcess) break;

      processedCount++;

      const domain = extractDomainFromBrand(brand);
      if (!domain) continue;

      // Skip excluded domains (social media, etc.)
      if (EXCLUDED_DOMAINS.some((excluded) => domain.includes(excluded))) continue;

      // Check if already a lead
      const existingLead = await getLeadByDomain(domain);

      const prospect: {
        brandId: string;
        brandName: string;
        domain: string;
        avatar?: string;
        alreadyLead: boolean;
        contact?: {
          name: string;
          firstName: string | null;
          title: string | null;
          email: string;
          linkedin: string | null;
        };
        qualified: boolean;
        disqualifyReason?: string;
      } = {
        brandId: brand.id,
        brandName: brand.name,
        domain,
        avatar: brand.avatar,
        alreadyLead: !!existingLead,
        qualified: false,
      };

      // Skip if already a lead
      if (existingLead) {
        prospect.disqualifyReason = "Already a lead";
        prospects.push(prospect);
        continue;
      }

      // Do Hunter.io lookup if requested
      if (includeContact) {
        try {
          const contact = await findContact(domain);

          if (!contact) {
            prospect.disqualifyReason = "No contact found";
            prospects.push(prospect);
            continue;
          }

          // Check for generic email
          if (isGenericEmail(contact.email)) {
            prospect.contact = {
              name: contact.name,
              firstName: contact.firstName,
              title: contact.title,
              email: contact.email,
              linkedin: contact.linkedin,
            };
            prospect.disqualifyReason = "Generic email";
            prospects.push(prospect);
            continue;
          }

          // Check for relevant title
          if (!hasRelevantTitle(contact.title)) {
            prospect.contact = {
              name: contact.name,
              firstName: contact.firstName,
              title: contact.title,
              email: contact.email,
              linkedin: contact.linkedin,
            };
            prospect.disqualifyReason = "Title not relevant";
            prospects.push(prospect);
            continue;
          }

          // Qualified prospect!
          prospect.contact = {
            name: contact.name,
            firstName: contact.firstName,
            title: contact.title,
            email: contact.email,
            linkedin: contact.linkedin,
          };
          prospect.qualified = true;
        } catch (error) {
          console.error(`Hunter lookup failed for ${domain}:`, error);
          prospect.disqualifyReason = "Contact lookup failed";
        }
      } else {
        // If not doing contact lookup, mark as qualified for further processing
        prospect.qualified = true;
      }

      prospects.push(prospect);

      // Small delay between Hunter requests to avoid rate limits
      if (includeContact) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Separate qualified and disqualified
    const qualified = prospects.filter((p) => p.qualified);
    const disqualified = prospects.filter((p) => !p.qualified);

    return NextResponse.json({
      success: true,
      counts: {
        qualified: qualified.length,
        disqualified: disqualified.length,
        total: prospects.length,
      },
      qualified,
      disqualified,
      filters: {
        niches: nicheList,
        usUkOnly,
        imageOnly: true,
      },
    });
  } catch (error) {
    console.error("Prospect discover error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to discover prospects" },
      { status: 500 }
    );
  }
}
