/**
 * Comprehensive Property Data Enrichment
 * 
 * This module combines multiple data sources to enrich property information:
 * 1. Public Property Records APIs (county assessor data)
 * 2. Census Data APIs (neighborhood demographics)
 * 3. USPS Address Validation (address standardization)
 * 4. Geocoding APIs (coordinates, FIPS codes)
 * 
 * Goal: Auto-fill as much property information as possible from public sources
 */

export interface EnrichedPropertyData {
  // Basic Property Info
  yearBuilt?: number;
  squareFootage?: number;
  lotSize?: number; // in acres
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  stories?: number;
  garageSpaces?: number;
  
  // Ownership & Tax Info
  assessedValue?: number;
  marketValue?: number;
  taxAmount?: number;
  taxYear?: number;
  ownerName?: string;
  lastSaleDate?: string;
  lastSalePrice?: number;
  
  // Building Details
  constructionType?: string; // e.g., "Frame", "Brick", "Stucco"
  roofType?: string; // e.g., "Asphalt Shingle", "Tile", "Metal"
  foundationType?: string; // e.g., "Slab", "Crawl Space", "Basement"
  heatingType?: string; // e.g., "Forced Air", "Radiant", "Heat Pump"
  heatingFuel?: string; // e.g., "Gas", "Electric", "Oil", "Propane"
  coolingType?: string; // e.g., "Central Air", "Window Units", "None"
  waterHeaterType?: string; // e.g., "Gas", "Electric", "Tankless"
  waterHeaterFuel?: string; // e.g., "Gas", "Electric"
  
  // Appliance Details
  stoveFuel?: string; // "Gas" or "Electric"
  dryerFuel?: string; // "Gas" or "Electric"
  washerType?: string; // "Top Load" or "Front Load"
  
  // Zoning & Permits
  zoningCode?: string;
  zoningDescription?: string;
  buildingPermits?: Array<{
    type: string;
    date: string;
    description: string;
  }>;
  
  // Neighborhood Data (from Census)
  medianHomeValue?: number;
  medianIncome?: number;
  populationDensity?: number;
  averageAge?: number;
  
  // Geographic Data
  latitude?: number;
  longitude?: number;
  fipsCode?: string; // Federal Information Processing Standards code
  censusTract?: string;
  county?: string;
  
  // Climate/Weather Data
  stormFrequency?: "low" | "moderate" | "high" | "severe";
  averageRainfall?: number;
  averageSnowfall?: number;
  
  // Additional Property Features
  units?: number; // For multi-unit properties
  parkingSpaces?: number; // Total parking (beyond garage)
  hasPool?: boolean;
  hasFireplace?: boolean;
  hasBasement?: boolean;
  basementType?: string;
  exteriorWallType?: string;
  interiorFeatures?: string[];
  exteriorFeatures?: string[];
  
  // School Information
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;
  
  // Walkability Scores
  walkScore?: number;
  transitScore?: number;
  bikeScore?: number;
  
  // Additional Metadata
  lastUpdated?: string;
  mlsNumber?: string;
  propertyStatus?: string;
  
  // Property Images & Links
  propertyImageUrl?: string;
  zillowUrl?: string;
  redfinUrl?: string;
  zpid?: string; // Zillow Property ID
  
  // Data Sources
  sources: string[];
}

/**
 * Main enrichment function - combines all data sources
 * Checks cache first to avoid unnecessary API calls
 */
export async function enrichPropertyData(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<EnrichedPropertyData> {
  // Check cache first
  const { getCachedPropertyData, setCachedPropertyData } = await import("./property-cache");
  
  const cached = await getCachedPropertyData(address, city, state, zipCode);
  if (cached) {
    console.log("Using cached property data");
    return cached;
  }

  console.log("Cache miss - fetching from APIs");
  
  const enriched: EnrichedPropertyData = {
    sources: [],
  };

  // Run all data fetches in parallel for speed
  const [
    propertyRecords,
    censusData,
    geocodingData,
    addressValidation,
  ] = await Promise.allSettled([
    fetchPropertyRecords(address, city, state, zipCode),
    fetchCensusData(address, city, state, zipCode),
    fetchGeocodingData(address, city, state, zipCode),
    validateAddress(address, city, state, zipCode),
  ]);

  // Merge property records data (most important)
  if (propertyRecords.status === "fulfilled" && propertyRecords.value) {
    Object.assign(enriched, propertyRecords.value);
    enriched.sources.push("property-records");
  }

  // Merge census data (neighborhood context)
  if (censusData.status === "fulfilled" && censusData.value) {
    Object.assign(enriched, censusData.value);
    enriched.sources.push("census");
  }

  // Merge geocoding data (coordinates, FIPS codes)
  if (geocodingData.status === "fulfilled" && geocodingData.value) {
    Object.assign(enriched, geocodingData.value);
    enriched.sources.push("geocoding");
    
    // If we have coordinates, fetch historical weather data
    // Check ZIP code cache first to avoid redundant API calls
    if (geocodingData.value.latitude && geocodingData.value.longitude) {
      // First check ZIP code cache
      const { getCachedZipCodeData } = await import("./zipcode-cache");
      const zipCodeCache = await getCachedZipCodeData(zipCode);
      
      if (zipCodeCache?.weatherData) {
        console.log("Using cached ZIP code weather data");
        enriched.averageRainfall = zipCodeCache.weatherData.averageRainfall;
        enriched.averageSnowfall = zipCodeCache.weatherData.averageSnowfall;
        
        // Calculate storm frequency from historical weather data
        const { calculateStormFrequencyFromWeather } = await import("./storm-frequency-calculator");
        const calculatedStormFrequency = calculateStormFrequencyFromWeather(zipCodeCache.weatherData);
        enriched.stormFrequency = calculatedStormFrequency;
        
        enriched.sources.push("zipcode-cache");
      } else {
        // Cache miss - fetch from API
        const { fetchHistoricalWeather } = await import("./historical-weather");
        const historicalWeather = await fetchHistoricalWeather(
          geocodingData.value.latitude!,
          geocodingData.value.longitude!,
          city,
          state,
          zipCode // Pass ZIP code for caching
        );
        
        if (historicalWeather) {
          enriched.averageRainfall = historicalWeather.averageRainfall;
          enriched.averageSnowfall = historicalWeather.averageSnowfall;
          
          // Calculate storm frequency from historical weather data
          const { calculateStormFrequencyFromWeather } = await import("./storm-frequency-calculator");
          const calculatedStormFrequency = calculateStormFrequencyFromWeather(historicalWeather);
          enriched.stormFrequency = calculatedStormFrequency;
          
          enriched.sources.push("historical-weather");
        }
      }
    }
  }

  // Use validated address if available
  if (addressValidation.status === "fulfilled" && addressValidation.value) {
    // Address validation provides standardized format
    // Could update address fields if needed
    enriched.sources.push("usps-validation");
  }

  // Cache the result if we got any useful data
  if (enriched.sources.length > 0 && (enriched.yearBuilt || enriched.squareFootage || enriched.bedrooms || enriched.latitude)) {
    const primarySource = enriched.sources[0] || "unknown";
    await setCachedPropertyData(address, city, state, zipCode, enriched, primarySource);
  }

  return enriched;
}

/**
 * Fetch property records from public assessor databases
 * This is the PRIMARY source for property-specific data
 */
async function fetchPropertyRecords(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<Partial<EnrichedPropertyData> | null> {
  try {
    // Try RentCast API (free tier: 100 requests/month)
    const rentcastData = await fetchFromRentCast(address, city, state, zipCode);
    if (rentcastData) return rentcastData;

    // Try county-specific APIs (varies by location)
    const countyData = await fetchFromCountyAssessor(address, city, state, zipCode);
    if (countyData) return countyData;

    return null;
  } catch (error) {
    console.error("Error fetching property records:", error);
    return null;
  }
}

/**
 * Fetch from RentCast API (comprehensive property data)
 * Free tier: 100 requests/month
 * Sign up at: https://developers.rentcast.io/
 */
async function fetchFromRentCast(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<Partial<EnrichedPropertyData> | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    console.log("RentCast API key not configured");
    return null; // API key not configured
  }

  try {
    // RentCast API supports multiple query formats
    // Clean address (remove extra commas, normalize)
    const cleanAddress = address.split(',')[0].trim();
    
    // Try multiple address formats for better matching
    const addressFormats = [
      `${cleanAddress}, ${city}, ${state} ${zipCode}`, // Full format
      `${cleanAddress}, ${city}, ${state}`, // Without zip
      `${cleanAddress}`, // Just street address
    ];
    
    console.log("Fetching from RentCast with address:", cleanAddress);
    console.log("City:", city, "State:", state, "Zip:", zipCode);
    console.log("API Key configured:", apiKey ? "Yes" : "No");
    
    // Try address parameter first (most specific)
    let url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(addressFormats[0])}`;
    
    console.log("RentCast URL:", url);
    
    let response = await fetch(url, {
      headers: {
        "X-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });

    console.log("RentCast response status:", response.status);

    // If address search fails, try alternative address formats
    if (!response.ok && response.status === 404) {
      console.log("Address format 1 failed, trying alternative formats...");
      
      // Try just street address + city + state
      url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(addressFormats[1])}`;
      response = await fetch(url, {
        headers: {
          "X-Api-Key": apiKey,
          "Accept": "application/json",
        },
      });
      console.log("RentCast response status (format 2):", response.status);
      
      // If still fails, try just street address
      if (!response.ok && response.status === 404) {
        url = `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(addressFormats[2])}`;
        response = await fetch(url, {
          headers: {
            "X-Api-Key": apiKey,
            "Accept": "application/json",
          },
        });
        console.log("RentCast response status (format 3):", response.status);
      }
      
      // If all address formats fail, try city/state search as fallback
      if (!response.ok && response.status === 404) {
        console.log("All address formats failed, trying city/state search...");
        url = `https://api.rentcast.io/v1/properties?city=${encodeURIComponent(city)}&state=${state}&limit=1`;
        response = await fetch(url, {
          headers: {
            "X-Api-Key": apiKey,
            "Accept": "application/json",
          },
        });
        console.log("RentCast response status (city/state):", response.status);
      }
    }

    // Read response body once - can only be called once per Response object
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`RentCast API error (${response.status}):`, responseText);
      
      if (response.status === 401) {
        console.warn("RentCast API key invalid or unauthorized");
      } else if (response.status === 404) {
        console.log("Property not found in RentCast database");
      } else if (response.status === 429) {
        console.warn("RentCast API rate limit exceeded");
      }
      return null;
    }

    // Parse response (responseText already read above)
    console.log("RentCast API raw response (first 500 chars):", responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse RentCast response as JSON:", parseError);
      console.error("Response text:", responseText);
      return null;
    }
    
    console.log("RentCast API response parsed successfully");
    console.log("RentCast API response type:", Array.isArray(data) ? `array (${data.length} items)` : typeof data);
    
    if (Array.isArray(data) && data.length > 0) {
      console.log("RentCast API response is array, first item keys:", Object.keys(data[0] || {}));
    } else if (data && typeof data === 'object') {
      console.log("RentCast API response is object, keys:", Object.keys(data));
    }

    // RentCast returns data in a specific format - check if we have property data
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log("No property data found in RentCast response");
      console.log("Response data:", data);
      return null;
    }

    // Handle both single object and array responses
    const property = Array.isArray(data) ? data[0] : data;

    if (!property || typeof property !== 'object') {
      console.log("No property object in RentCast response");
      console.log("Property value:", property);
      return null;
    }
    
    // Log all available fields for debugging
    const availableFields = Object.keys(property).filter(key => property[key] != null);
    console.log("Available RentCast fields:", availableFields);
    console.log("RentCast property sample data:", JSON.stringify(property, null, 2).substring(0, 1000));

    // Map RentCast fields to our format
    // Note: RentCast uses different field names, so we need to map them
    const enriched: Partial<EnrichedPropertyData> = {};

    // Basic property info
    // Parse yearBuilt from string to number (RentCast returns as string)
    if (property.yearBuilt != null && property.yearBuilt !== '') {
      const parsedYear = parseInt(String(property.yearBuilt), 10);
      if (!isNaN(parsedYear)) {
        enriched.yearBuilt = parsedYear;
      }
    }
    if (property.squareFootage || property.livingArea) {
      enriched.squareFootage = parseInt(property.squareFootage || property.livingArea);
    }
    if (property.lotSize) {
      // RentCast may return in sqft or acres - convert to acres if needed
      const lotSize = parseFloat(property.lotSize);
      enriched.lotSize = lotSize > 1 ? lotSize / 43560 : lotSize;
    }
    if (property.bedrooms) enriched.bedrooms = parseInt(property.bedrooms);
    if (property.bathrooms) enriched.bathrooms = parseFloat(property.bathrooms);
    if (property.propertyType || property.homeType) {
      enriched.propertyType = property.propertyType || property.homeType;
    }
    if (property.stories) enriched.stories = parseInt(property.stories);
    if (property.garageSpaces || property.garage) {
      enriched.garageSpaces = parseInt(property.garageSpaces || property.garage);
    }

    // Financial data
    if (property.assessedValue) enriched.assessedValue = parseFloat(property.assessedValue);
    if (property.marketValue || property.estimatedValue) {
      enriched.marketValue = parseFloat(property.marketValue || property.estimatedValue);
    }
    if (property.taxAmount || property.annualTaxAmount) {
      enriched.taxAmount = parseFloat(property.taxAmount || property.annualTaxAmount);
    }
    if (property.taxYear) enriched.taxYear = parseInt(property.taxYear);
    if (property.ownerName) enriched.ownerName = property.ownerName;
    if (property.lastSaleDate) enriched.lastSaleDate = property.lastSaleDate;
    if (property.lastSalePrice) enriched.lastSalePrice = parseFloat(property.lastSalePrice);

    // Building characteristics
    if (property.constructionType) enriched.constructionType = property.constructionType;
    if (property.roofType) enriched.roofType = property.roofType;
    if (property.foundationType) enriched.foundationType = property.foundationType;
    if (property.heatingType || property.heating) {
      enriched.heatingType = property.heatingType || property.heating;
    }
    if (property.heatingFuel || property.heatingFuelType) {
      enriched.heatingFuel = property.heatingFuel || property.heatingFuelType;
    }
    if (property.coolingType || property.cooling) {
      enriched.coolingType = property.coolingType || property.cooling;
    }
    if (property.waterHeaterType || property.waterHeater) {
      enriched.waterHeaterType = property.waterHeaterType || property.waterHeater;
    }
    if (property.waterHeaterFuel || property.waterHeaterFuelType) {
      enriched.waterHeaterFuel = property.waterHeaterFuel || property.waterHeaterFuelType;
    }
    
    // Appliance fuel types
    if (property.stoveFuel || property.rangeFuel || property.ovenFuel) {
      enriched.stoveFuel = property.stoveFuel || property.rangeFuel || property.ovenFuel;
    }
    if (property.dryerFuel || property.dryerFuelType) {
      enriched.dryerFuel = property.dryerFuel || property.dryerFuelType;
    }
    if (property.washerType) {
      enriched.washerType = property.washerType;
    }
    
    // Check interior features for appliance info
    if (property.interiorFeatures) {
      const features = Array.isArray(property.interiorFeatures) 
        ? property.interiorFeatures 
        : [property.interiorFeatures];
      
      // Look for gas/electric indicators in features
      const featuresStr = features.join(" ").toLowerCase();
      if (!enriched.stoveFuel && (featuresStr.includes("gas stove") || featuresStr.includes("gas range"))) {
        enriched.stoveFuel = "Gas";
      } else if (!enriched.stoveFuel && (featuresStr.includes("electric stove") || featuresStr.includes("electric range"))) {
        enriched.stoveFuel = "Electric";
      }
      if (!enriched.dryerFuel && featuresStr.includes("gas dryer")) {
        enriched.dryerFuel = "Gas";
      } else if (!enriched.dryerFuel && featuresStr.includes("electric dryer")) {
        enriched.dryerFuel = "Electric";
      }
    }
    if (property.zoningCode || property.zoning) {
      enriched.zoningCode = property.zoningCode || property.zoning;
    }

    // Geographic data
    if (property.latitude) enriched.latitude = parseFloat(property.latitude);
    if (property.longitude) enriched.longitude = parseFloat(property.longitude);
    if (property.county) enriched.county = property.county;
    
    // Additional property features that might be available
    if (property.units || property.numberOfUnits) {
      enriched.units = parseInt(property.units || property.numberOfUnits);
    }
    if (property.parkingSpaces || property.parking) {
      enriched.parkingSpaces = parseInt(property.parkingSpaces || property.parking);
    }
    if (property.hasPool !== undefined) {
      enriched.hasPool = Boolean(property.hasPool);
    }
    if (property.hasFireplace !== undefined) {
      enriched.hasFireplace = Boolean(property.hasFireplace);
    }
    if (property.hasBasement !== undefined) {
      enriched.hasBasement = Boolean(property.hasBasement);
    }
    if (property.basementType) {
      enriched.basementType = property.basementType;
    }
    if (property.exteriorWallType || property.exteriorMaterial) {
      enriched.exteriorWallType = property.exteriorWallType || property.exteriorMaterial;
    }
    if (property.interiorFeatures) {
      enriched.interiorFeatures = Array.isArray(property.interiorFeatures) 
        ? property.interiorFeatures 
        : [property.interiorFeatures];
    }
    if (property.exteriorFeatures) {
      enriched.exteriorFeatures = Array.isArray(property.exteriorFeatures)
        ? property.exteriorFeatures
        : [property.exteriorFeatures];
    }
    if (property.schoolDistrict) {
      enriched.schoolDistrict = property.schoolDistrict;
    }
    if (property.elementarySchool) {
      enriched.elementarySchool = property.elementarySchool;
    }
    if (property.middleSchool) {
      enriched.middleSchool = property.middleSchool;
    }
    if (property.highSchool) {
      enriched.highSchool = property.highSchool;
    }
    if (property.walkScore) {
      enriched.walkScore = parseInt(property.walkScore);
    }
    if (property.transitScore) {
      enriched.transitScore = parseInt(property.transitScore);
    }
    if (property.bikeScore) {
      enriched.bikeScore = parseInt(property.bikeScore);
    }
    if (property.lastUpdated) {
      enriched.lastUpdated = property.lastUpdated;
    }
    if (property.mlsNumber || property.mlsId) {
      enriched.mlsNumber = property.mlsNumber || property.mlsId;
    }
    if (property.status || property.propertyStatus) {
      enriched.propertyStatus = property.status || property.propertyStatus;
    }
    
    // Property images and links
    if (property.imageUrl || property.photoUrl || property.image) {
      enriched.propertyImageUrl = property.imageUrl || property.photoUrl || property.image;
    }
    if (property.zpid) {
      enriched.zpid = property.zpid;
      enriched.zillowUrl = `https://www.zillow.com/homedetails/${property.zpid}`;
    }
    if (property.zillowUrl) {
      enriched.zillowUrl = property.zillowUrl;
    }
    if (property.redfinUrl) {
      enriched.redfinUrl = property.redfinUrl;
    }

    console.log("RentCast data enriched:", Object.keys(enriched).length, "fields");

    return enriched;
  } catch (error) {
    console.error("Error fetching from RentCast:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return null;
  }
}

/**
 * Fetch from county assessor APIs
 * Many counties have public APIs - this is a generic implementation
 * You'll need to customize per county
 */
async function fetchFromCountyAssessor(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<Partial<EnrichedPropertyData> | null> {
  // Example: Los Angeles County Assessor API
  // Many counties have similar APIs
  // This is a placeholder - implement based on your target counties
  
  // Example implementation for LA County:
  // const laCountyApi = `https://assessor.lacounty.gov/api/property/${parcelId}`;
  
  return null; // Not implemented - customize per county
}

/**
 * Fetch Census data for neighborhood context
 * Provides area-level demographics and housing statistics
 */
async function fetchCensusData(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<Partial<EnrichedPropertyData> | null> {
  try {
    // First, get geocoding to get FIPS codes
    const geocode = await fetchGeocodingData(address, city, state, zipCode);
    if (!geocode || !geocode.fipsCode) {
      return null;
    }

    // Use Census Data API to get ACS (American Community Survey) data
    // This provides neighborhood-level statistics
    const censusTract = geocode.censusTract;
    if (!censusTract) {
      return null;
    }

    // Fetch median home value and income for the census tract
    // Census API endpoint: https://api.census.gov/data/{year}/acs/acs5
    const year = new Date().getFullYear() - 1; // Use most recent available year
    const apiKey = process.env.CENSUS_API_KEY || ""; // Optional but recommended
    
    const baseUrl = "https://api.census.gov/data";
    const dataset = "acs/acs5";
    
    // Get median home value (B25077_001E) and median income (B19013_001E)
    const variables = "B25077_001E,B19013_001E,B01001_001E"; // Home value, income, population
    const geo = `for=tract:${censusTract}&in=state:${geocode.fipsCode?.substring(0, 2)}`;
    
    const url = `${baseUrl}/${year}/${dataset}?get=${variables}&${geo}${apiKey ? `&key=${apiKey}` : ""}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Parse Census data (first row is headers)
    if (data.length > 1) {
      const row = data[1];
      return {
        medianHomeValue: row[0] ? parseInt(row[0]) : undefined,
        medianIncome: row[1] ? parseInt(row[1]) : undefined,
        populationDensity: row[2] ? parseInt(row[2]) : undefined,
        censusTract: censusTract,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching Census data:", error);
    return null;
  }
}

/**
 * Fetch geocoding data (coordinates, FIPS codes, census tract)
 * Uses US Census Geocoding API (free, no key required)
 */
async function fetchGeocodingData(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<Partial<EnrichedPropertyData> | null> {
  try {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
    
    // Use US Census Geocoding API (free, no API key required)
    const response = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/address?street=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}&state=${state}&zip=${zipCode}&benchmark=Public_AR_Current&format=json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.result?.addressMatches?.length > 0) {
      const match = data.result.addressMatches[0];
      const coordinates = match.coordinates;
      const geographies = match.geographies?.["Census Tracts"]?.[0];
      
      return {
        latitude: coordinates?.y,
        longitude: coordinates?.x,
        fipsCode: geographies?.STATE + geographies?.COUNTY,
        censusTract: geographies?.TRACT,
        county: geographies?.NAME,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching geocoding data:", error);
    return null;
  }
}

/**
 * Validate and standardize address using USPS API
 * Free tier available
 */
async function validateAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<{ standardized?: string } | null> {
  const apiKey = process.env.USPS_API_KEY;
  if (!apiKey) {
    return null; // API key not configured
  }

  try {
    // USPS Address Validation API
    const xml = `<?xml version="1.0"?>
      <AddressValidateRequest USERID="${apiKey}">
        <Address>
          <Address1>${address}</Address1>
          <City>${city}</City>
          <State>${state}</State>
          <Zip5>${zipCode}</Zip5>
        </Address>
      </AddressValidateRequest>`;

    const response = await fetch(
      `https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&XML=${encodeURIComponent(xml)}`
    );

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    // Parse XML response (simplified - use proper XML parser in production)
    // Returns standardized address format
    
    return {
      standardized: text, // Parse XML to extract standardized address
    };
  } catch (error) {
    console.error("Error validating address:", error);
    return null;
  }
}

/**
 * Map enriched data to our Home schema format
 */
export function mapToHomeSchema(
  enriched: EnrichedPropertyData
): Partial<{
  yearBuilt: number;
  squareFootage: number;
  lotSize: number;
  homeType: string;
  climateZone: string;
  latitude: number;
  longitude: number;
}> {
  return {
    yearBuilt: enriched.yearBuilt,
    squareFootage: enriched.squareFootage,
    lotSize: enriched.lotSize,
    homeType: mapPropertyTypeToHomeType(enriched.propertyType),
    // Could add more mappings as needed
  };
}

/**
 * Map property type from API to our homeType enum
 */
function mapPropertyTypeToHomeType(
  propertyType?: string
): string | undefined {
  if (!propertyType) return undefined;

  const type = propertyType.toLowerCase();
  // Check more specific types first
  if (type.includes("townhouse") || type.includes("town house")) {
    return "townhouse";
  }
  if (type.includes("single") && !type.includes("town")) {
    return "single-family";
  }
  if (type.includes("house") && !type.includes("town")) {
    return "single-family";
  }
  if (type.includes("condo") || type.includes("condominium")) {
    return "condo";
  }
  if (type.includes("apartment")) {
    return "apartment";
  }
  if (type.includes("mobile")) {
    return "mobile-home";
  }
  return "other";
}

