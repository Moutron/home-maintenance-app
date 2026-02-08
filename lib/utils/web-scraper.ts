/**
 * Web Scraper Utilities for Property Data
 * 
 * ⚠️ IMPORTANT LEGAL NOTICE:
 * - Web scraping may violate Terms of Service of target websites
 * - Always check robots.txt and Terms of Service before scraping
 * - Use rate limiting to avoid overloading servers
 * - Consider using official APIs or public data sources instead
 * - This implementation is for educational purposes and personal use only
 * 
 * Better Alternatives:
 * 1. Public property records APIs (county assessor databases)
 * 2. USPS Address Validation API (for address verification)
 * 3. Census data APIs (for demographic/area data)
 * 4. Official real estate APIs (if available)
 */

export interface ScrapedPropertyData {
  yearBuilt?: number;
  squareFootage?: number;
  lotSize?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  price?: number;
  lastSoldDate?: string;
  source: string;
}

/**
 * Rate limiting helper - prevents too many requests
 */
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number; // milliseconds

  constructor(maxRequests: number = 5, timeWindow: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    // Remove requests outside the time window
    this.requests = this.requests.filter(
      (time) => now - time < this.timeWindow
    );

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      if (waitTime > 0) {
        console.log(`Rate limiting: waiting ${waitTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(Date.now());
  }
}

// Global rate limiter (5 requests per minute)
const rateLimiter = new RateLimiter(5, 60000);

/**
 * Fetch HTML from a URL with proper headers
 */
async function fetchHTML(url: string): Promise<string | null> {
  try {
    await rateLimiter.waitIfNeeded();

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      // Add a timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`HTTP error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error("Error fetching HTML:", error);
    return null;
  }
}

/**
 * Parse property data from Zillow HTML
 * Note: This is a basic implementation. Zillow's HTML structure may change.
 */
function parseZillowHTML(html: string): ScrapedPropertyData | null {
  try {
    // Extract JSON-LD structured data if available
    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    );
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData["@type"] === "RealEstateAgent" || jsonData.address) {
          // Parse structured data
          return {
            yearBuilt: jsonData.yearBuilt
              ? parseInt(jsonData.yearBuilt)
              : undefined,
            squareFootage: jsonData.floorSize?.value
              ? parseInt(jsonData.floorSize.value)
              : undefined,
            propertyType: jsonData.propertyType || undefined,
            source: "zillow",
          };
        }
      } catch (e) {
        // JSON parsing failed, continue with regex parsing
      }
    }

    // Fallback: Regex parsing (less reliable)
    const yearBuiltMatch = html.match(
      /Built in (\d{4})|Year built[:\s]+(\d{4})/i
    );
    const sqftMatch = html.match(
      /(\d{1,3}(?:,\d{3})*)\s*(?:sq\.?\s*ft|square\s*feet)/i
    );
    const lotSizeMatch = html.match(
      /(\d+\.?\d*)\s*(?:acres?|sq\.?\s*ft)/i
    );
    const bedroomsMatch = html.match(/(\d+)\s*(?:bed|bedroom)/i);
    const bathroomsMatch = html.match(/(\d+\.?\d*)\s*(?:bath|bathroom)/i);

    const data: ScrapedPropertyData = {
      source: "zillow",
    };

    if (yearBuiltMatch) {
      data.yearBuilt = parseInt(yearBuiltMatch[1] || yearBuiltMatch[2]);
    }
    if (sqftMatch) {
      data.squareFootage = parseInt(sqftMatch[1].replace(/,/g, ""));
    }
    if (lotSizeMatch) {
      const lotValue = parseFloat(lotSizeMatch[1]);
      // Convert to acres if needed (assuming large numbers are sqft)
      data.lotSize = lotValue > 1000 ? lotValue / 43560 : lotValue;
    }
    if (bedroomsMatch) {
      data.bedrooms = parseInt(bedroomsMatch[1]);
    }
    if (bathroomsMatch) {
      data.bathrooms = parseFloat(bathroomsMatch[1]);
    }

    // Only return if we found at least one piece of data
    if (
      data.yearBuilt ||
      data.squareFootage ||
      data.lotSize ||
      data.bedrooms ||
      data.bathrooms
    ) {
      return data;
    }

    return null;
  } catch (error) {
    console.error("Error parsing Zillow HTML:", error);
    return null;
  }
}

/**
 * Scrape property data from Zillow
 * ⚠️ WARNING: This may violate Zillow's Terms of Service
 */
export async function scrapeZillow(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<ScrapedPropertyData | null> {
  try {
    // Construct Zillow search URL
    const searchQuery = `${address}, ${city}, ${state} ${zipCode}`;
    const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(
      searchQuery
    )}`;

    console.log(`Attempting to scrape Zillow: ${zillowUrl}`);

    const html = await fetchHTML(zillowUrl);
    if (!html) {
      return null;
    }

    // Check if we got blocked or redirected
    if (
      html.includes("captcha") ||
      html.includes("Access Denied") ||
      html.includes("blocked")
    ) {
      console.warn("Zillow may have blocked the request");
      return null;
    }

    return parseZillowHTML(html);
  } catch (error) {
    console.error("Error scraping Zillow:", error);
    return null;
  }
}

/**
 * Alternative: Use public property records APIs
 * Many counties have public APIs for property records
 */
export async function fetchFromPublicRecords(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<ScrapedPropertyData | null> {
  // This would integrate with county assessor APIs
  // Example: Some counties have REST APIs for property data
  // Implementation would vary by location
  
  // For now, return null - this is a placeholder for future implementation
  return null;
}

/**
 * Check robots.txt before scraping
 */
export async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", url).toString();
    const response = await fetch(robotsUrl);
    if (!response.ok) return true; // If robots.txt doesn't exist, assume allowed

    const robotsTxt = await response.text();
    // Basic check - in production, use a proper robots.txt parser
    if (robotsTxt.includes("User-agent: *") && robotsTxt.includes("Disallow: /")) {
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error checking robots.txt:", error);
    return true; // Default to allowing if check fails
  }
}

