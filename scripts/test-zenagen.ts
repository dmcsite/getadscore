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

import { searchBrandsByDomain, searchAdsByBrandId, downloadCreative } from "../lib/foreplay";

async function test() {
  console.log("Searching for zenagen.com...");
  
  const brands = await searchBrandsByDomain("zenagen.com");
  console.log("Brands found:", JSON.stringify(brands, null, 2));
  
  if (brands.length > 0) {
    console.log("\nSearching for ads...");
    const ads = await searchAdsByBrandId([brands[0].id], { limit: 1, order: "newest" });
    console.log("Ads found:", JSON.stringify(ads, null, 2));
    
    if (ads.length > 0 && ads[0].creativeUrl) {
      console.log("\nCreative URL:", ads[0].creativeUrl);
      
      // Try to download the creative
      console.log("\nDownloading creative...");
      try {
        const { buffer, contentType } = await downloadCreative(ads[0].creativeUrl);
        console.log("Download success! Size:", buffer.length, "bytes, Type:", contentType);
      } catch (e) {
        console.log("Download FAILED:", e);
      }
    } else {
      console.log("\nNo creative URL found!");
    }
  }
}

test().catch(console.error);
