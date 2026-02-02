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
function normalizeAd(ad: ForeplayAd): NormalizedAd {
  const creativeUrl = ad.video || ad.image || "";
  const creativeType = ad.video ? "video" : "image";

  // Build ad copy from name and description
  const adCopy = [ad.name, ad.description].filter(Boolean).join("\n\n");

  // Get platform - Foreplay returns array, take first one
  const platform = Array.isArray(ad.publisher_platform)
    ? ad.publisher_platform[0] || "facebook"
    : "facebook";

  return {
    id: ad.id || ad.ad_id || "",
    brandName: ad.name?.split(" ").slice(0, 3).join(" ") || "Unknown Brand",
    creativeUrl,
    creativeType,
    platform,
    adCopy,
    transcript: ad.full_transcription,
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
