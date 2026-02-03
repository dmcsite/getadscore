// Foreplay API integration
// Docs: https://docs.foreplay.co

const FOREPLAY_BASE_URL = "https://public.api.foreplay.co";

interface ForeplayAd {
  id: string;
  ad_id?: string;
  brand_id?: string;
  name?: string;
  description?: string;
  video?: string;
  image?: string;
  thumbnail?: string;
  display_format?: string;
  publisher_platform?: string[];
  full_transcription?: string;
  started_running?: string;
  live?: boolean;
}

interface ForeplaySearchResponse {
  data: ForeplayAd[];
  metadata: {
    cursor?: number;
    count?: number;
    success?: boolean;
  };
}

interface ForeplayAdResponse {
  data: ForeplayAd;
  metadata: {
    success?: boolean;
  };
}

export interface NormalizedAd {
  id: string;
  brandName: string;
  creativeUrl: string;
  creativeType: "video" | "image";
  platform: string;
  adCopy: string;
  transcript?: string;
  thumbnail?: string;
}

function getApiKey(): string {
  const key = process.env.FOREPLAY_API_KEY;
  if (!key) {
    throw new Error("FOREPLAY_API_KEY environment variable is not set");
  }
  return key;
}

async function foreplayFetch<T>(endpoint: string, params?: Record<string, string | string[] | number | boolean>): Promise<T> {
  const url = new URL(`${FOREPLAY_BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, v));
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": getApiKey(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Foreplay API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Normalize a Foreplay ad to our standard format
function normalizeAd(ad: ForeplayAd & { cards?: Array<{ image?: string; video?: string; headline?: string; description?: string; full_transcription?: string }> }): NormalizedAd {
  // Try to get creative from cards first (for carousel/DCO ads), then fallback to top-level
  let creativeUrl = ad.video || ad.image || "";
  let creativeType: "video" | "image" = ad.video ? "video" : "image";
  let transcript = ad.full_transcription;

  // Check cards for creative if not found at top level
  if (!creativeUrl && ad.cards && ad.cards.length > 0) {
    const firstCard = ad.cards[0];
    creativeUrl = firstCard.video || firstCard.image || "";
    creativeType = firstCard.video ? "video" : "image";
    transcript = transcript || firstCard.full_transcription;
  }

  // Build ad copy from cards or top-level
  let adCopy = "";
  if (ad.cards && ad.cards.length > 0) {
    const firstCard = ad.cards[0];
    adCopy = [firstCard.headline, firstCard.description].filter(Boolean).join("\n\n");
  }
  if (!adCopy) {
    adCopy = [ad.name, ad.description].filter(Boolean).join("\n\n");
  }

  // Get platform - Foreplay returns array, take first one
  const platform = Array.isArray(ad.publisher_platform)
    ? ad.publisher_platform[0] || "facebook"
    : "facebook";

  return {
    id: ad.id || ad.ad_id || "",
    brandName: ad.name || "Unknown Brand",
    creativeUrl,
    creativeType,
    platform,
    adCopy,
    transcript,
    thumbnail: ad.thumbnail,
  };
}

// Search ads by brand ID
export async function searchAdsByBrandId(
  brandIds: string[],
  options?: {
    platform?: string[];
    displayFormat?: string[];
    limit?: number;
    order?: "newest" | "oldest" | "longest_running" | "most_relevant";
  }
): Promise<NormalizedAd[]> {
  const params: Record<string, string | string[] | number> = {
    brand_ids: brandIds,
    limit: options?.limit || 10,
    order: options?.order || "newest",
  };

  if (options?.platform) {
    params.publisher_platform = options.platform;
  }
  if (options?.displayFormat) {
    params.display_format = options.displayFormat;
  }

  const response = await foreplayFetch<ForeplaySearchResponse>("/api/brand/getAdsByBrandId", params);
  return response.data.map(normalizeAd);
}

// Get single ad by ID
export async function getAdById(adId: string): Promise<NormalizedAd | null> {
  try {
    const response = await foreplayFetch<ForeplayAdResponse>("/api/ad", { ad_id: adId });
    if (response.data) {
      return normalizeAd(response.data);
    }
    return null;
  } catch (error) {
    console.error("Failed to get ad by ID:", error);
    return null;
  }
}

// Search brands by domain
export async function searchBrandsByDomain(domain: string): Promise<{ id: string; name: string; avatar?: string }[]> {
  const response = await foreplayFetch<{
    data: Array<{
      id: string;
      name: string;
      avatar?: string;
    }>;
  }>("/api/brand/getBrandsByDomain", { domain, limit: 10 });

  return response.data || [];
}

// Get ads from swipefile (saved ads)
export async function getSwipefileAds(
  options?: {
    platform?: string[];
    displayFormat?: string[];
    niches?: string[];
    limit?: number;
    order?: "newest" | "oldest" | "saved_newest";
  }
): Promise<NormalizedAd[]> {
  const params: Record<string, string | string[] | number> = {
    limit: options?.limit || 10,
    order: options?.order || "newest",
  };

  if (options?.platform) {
    params.publisher_platform = options.platform;
  }
  if (options?.displayFormat) {
    params.display_format = options.displayFormat;
  }
  if (options?.niches) {
    params.niches = options.niches;
  }

  const response = await foreplayFetch<ForeplaySearchResponse>("/api/swipefile/ads", params);
  return response.data.map(normalizeAd);
}

// Download creative from URL and return as buffer
export async function downloadCreative(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download creative: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, contentType };
}

// Brand with metadata for prospecting
export interface ForeplayBrand {
  id: string;
  name: string;
  avatar?: string;
  websites?: string[];
  ad_count?: number;
  niches?: string[];
  category?: string;
}

// Discover brands via Discovery Ads API
// Returns real DTC brands with their ads and domains
export async function discoverBrands(
  options: {
    query?: string;
    niches?: string[];
    limit?: number;
  }
): Promise<ForeplayBrand[]> {
  // Use niche as query for better results
  const query = options.query || options.niches?.[0] || "ecommerce";

  const params: Record<string, string | string[] | number> = {
    query,
    limit: Math.min((options.limit || 10) * 2, 20), // Fetch more to get unique brands
    order: "newest",
  };

  // Discovery Ads API returns ads with brand info and link URLs
  const response = await foreplayFetch<{
    data: Array<{
      id: string;
      brand_id?: string;
      name?: string;
      avatar?: string;
      link_url?: string;
      niches?: string[];
    }>;
  }>("/api/discovery/ads", params);

  // Extract unique brands from ads, using link_url for domain
  const brandMap = new Map<string, ForeplayBrand>();

  for (const ad of response.data || []) {
    if (ad.brand_id && ad.name && !brandMap.has(ad.brand_id)) {
      // Extract domain from link_url
      let websites: string[] = [];
      if (ad.link_url) {
        try {
          const url = new URL(ad.link_url);
          websites = [url.origin];
        } catch {
          // Invalid URL, skip
        }
      }

      brandMap.set(ad.brand_id, {
        id: ad.brand_id,
        name: ad.name,
        avatar: ad.avatar,
        websites,
        niches: ad.niches,
      });
    }
  }

  return Array.from(brandMap.values()).slice(0, options.limit || 10);
}

// Get brand details including website/domain
export async function getBrandDetails(brandId: string): Promise<ForeplayBrand | null> {
  try {
    const response = await foreplayFetch<{
      data: ForeplayBrand;
    }>("/api/brand", { brand_id: brandId });

    return response.data || null;
  } catch {
    return null;
  }
}

// Extract domain from brand websites
export function extractDomainFromBrand(brand: ForeplayBrand): string | null {
  if (!brand.websites || brand.websites.length === 0) {
    return null;
  }

  try {
    const url = brand.websites[0];
    const domain = url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    return domain;
  } catch {
    return null;
  }
}
