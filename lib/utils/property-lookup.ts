/**
 * Property lookup utilities
 * Attempts to fetch property information from Zillow/Redfin APIs or web scraping
 * Note: Web scraping should be done responsibly and in compliance with terms of service
 */

export interface PropertyData {
  yearBuilt?: number;
  squareFootage?: number;
  lotSize?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  propertyImageUrl?: string;
  zillowUrl?: string;
  redfinUrl?: string;
  source?: "zillow" | "redfin" | "manual";
}

/**
 * Fetch property data from Zillow API (if available) or web scraping
 */
export async function lookupProperty(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<PropertyData | null> {
  try {
    // Try third-party API first (RapidAPI)
    const thirdPartyData = await fetchFromThirdPartyAPI(address, city, state, zipCode);
    if (thirdPartyData) {
      return thirdPartyData;
    }

    // Try Zillow API (if configured)
    const zillowData = await fetchFromZillow(address, city, state, zipCode);
    if (zillowData) {
      return { ...zillowData, source: "zillow" };
    }

    // Fallback to Redfin
    const redfinData = await fetchFromRedfin(address, city, state, zipCode);
    if (redfinData) {
      return { ...redfinData, source: "redfin" };
    }

    return null;
  } catch (error) {
    console.error("Error looking up property:", error);
    return null;
  }
}

/**
 * Fetch property data from Zillow using web scraping
 * ⚠️ WARNING: Web scraping may violate Zillow's Terms of Service
 * Use responsibly and consider using official APIs instead
 */
async function fetchFromZillow(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<PropertyData | null> {
  try {
    // Check if web scraping is enabled
    const enableScraping = process.env.ENABLE_WEB_SCRAPING === "true";
    if (!enableScraping) {
      console.log("Web scraping is disabled. Set ENABLE_WEB_SCRAPING=true to enable.");
      return null;
    }

    // Import scraper dynamically to avoid loading it if not needed
    const { scrapeZillow, checkRobotsTxt } = await import("./web-scraper");
    
    const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(
      `${address}, ${city}, ${state} ${zipCode}`
    )}`;

    // Check robots.txt first
    const allowed = await checkRobotsTxt(zillowUrl);
    if (!allowed) {
      console.warn("Zillow robots.txt may disallow scraping");
      return null;
    }

    // Attempt to scrape
    const scrapedData = await scrapeZillow(address, city, state, zipCode);
    
    if (scrapedData) {
      return {
        yearBuilt: scrapedData.yearBuilt,
        squareFootage: scrapedData.squareFootage,
        lotSize: scrapedData.lotSize,
        bedrooms: scrapedData.bedrooms,
        bathrooms: scrapedData.bathrooms,
        propertyType: scrapedData.propertyType,
        zillowUrl: zillowUrl,
        source: "zillow",
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching from Zillow:", error);
    return null;
  }
}

/**
 * Fetch property data from Redfin using web scraping
 * ⚠️ WARNING: Web scraping may violate Redfin's Terms of Service
 * Use responsibly and consider using official APIs instead
 */
async function fetchFromRedfin(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<PropertyData | null> {
  try {
    // Check if web scraping is enabled
    const enableScraping = process.env.ENABLE_WEB_SCRAPING === "true";
    if (!enableScraping) {
      return null;
    }

    // Redfin scraping would be similar to Zillow
    // For now, return null as Redfin has stricter anti-scraping measures
    // In production, you'd implement similar scraping logic here
    
    return null;
  } catch (error) {
    console.error("Error fetching from Redfin:", error);
    return null;
  }
}

/**
 * Parse property data from HTML (for web scraping fallback)
 * This function is now implemented in web-scraper.ts
 * Keeping this for backwards compatibility
 */
export function parsePropertyData(html: string, source: "zillow" | "redfin"): PropertyData | null {
  // Parsing logic has been moved to web-scraper.ts
  // This function is kept for backwards compatibility
  return null;
}

/**
 * Use a third-party API service for property data
 * Services like RapidAPI offer Zillow/Redfin data APIs
 * 
 * To use this feature:
 * 1. Sign up for RapidAPI: https://rapidapi.com/
 * 2. Subscribe to a Zillow API (e.g., "Zillow API" or "Real Estate API")
 * 3. Add RAPIDAPI_KEY to your .env file
 */
export async function fetchFromThirdPartyAPI(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<PropertyData | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    // API key not configured - return null to allow fallback or manual entry
    return null;
  }

  try {
    // Using RapidAPI's Zillow API endpoint
    // Note: You'll need to subscribe to the specific API on RapidAPI
    const location = `${address}, ${city}, ${state} ${zipCode}`;
    const response = await fetch(
      `https://zillow-com1.p.rapidapi.com/propertyExtendedSearch?location=${encodeURIComponent(location)}`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "zillow-com1.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      console.error(`RapidAPI error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Parse the response based on RapidAPI's Zillow API format
    if (data.results && data.results.length > 0) {
      const property = data.results[0];
      
      return {
        yearBuilt: property.yearBuilt,
        squareFootage: property.livingArea,
        lotSize: property.lotSizeValue,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        propertyType: property.homeType,
        zillowUrl: property.zpid ? `https://www.zillow.com/homedetails/${property.zpid}` : undefined,
        propertyImageUrl: property.imgSrc || property.imageUrl || property.photos?.[0],
        source: "zillow",
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching from third-party API:", error);
    return null;
  }
}

