import { NextRequest, NextResponse } from "next/server";
import { lookupProperty } from "@/lib/utils/property-lookup";
import { enrichPropertyData, mapToHomeSchema } from "@/lib/utils/property-enrichment";

/**
 * API route to lookup property information from multiple sources
 * This endpoint attempts to fetch property details from:
 * 1. Public Property Records APIs (RentCast, County Assessors)
 * 2. Census Data APIs (neighborhood demographics)
 * 3. Geocoding APIs (coordinates, FIPS codes)
 * 4. Zillow/Redfin (via RapidAPI or web scraping)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, city, state, zipCode } = body;

    if (!address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: "Address, city, state, and zipCode are required" },
        { status: 400 }
      );
    }

    // Try comprehensive enrichment first (property records + census + geocoding)
    console.log("Starting property enrichment for:", { address, city, state, zipCode });
    const enrichedData = await enrichPropertyData(address, city, state, zipCode);
    console.log("Enrichment result:", {
      hasData: !!enrichedData,
      sources: enrichedData?.sources || [],
      yearBuilt: enrichedData?.yearBuilt,
      squareFootage: enrichedData?.squareFootage,
      bedrooms: enrichedData?.bedrooms,
    });
    
    // If we got good data from enrichment, use it
    if (enrichedData && (enrichedData.yearBuilt || enrichedData.squareFootage || enrichedData.bedrooms)) {
      console.log("Using enriched data from:", enrichedData.sources);
      const mappedData = mapToHomeSchema(enrichedData);
      
      return NextResponse.json({
        found: true,
        data: {
          yearBuilt: enrichedData.yearBuilt,
          squareFootage: enrichedData.squareFootage,
          lotSize: enrichedData.lotSize,
          bedrooms: enrichedData.bedrooms,
          bathrooms: enrichedData.bathrooms,
          propertyType: enrichedData.propertyType,
          // Additional enriched data
          stories: enrichedData.stories,
          garageSpaces: enrichedData.garageSpaces,
          assessedValue: enrichedData.assessedValue,
          marketValue: enrichedData.marketValue,
          taxAmount: enrichedData.taxAmount,
          constructionType: enrichedData.constructionType,
          roofType: enrichedData.roofType,
          foundationType: enrichedData.foundationType,
          heatingType: enrichedData.heatingType,
          coolingType: enrichedData.coolingType,
          latitude: enrichedData.latitude,
          longitude: enrichedData.longitude,
          county: enrichedData.county,
          // Property images and links
          propertyImageUrl: enrichedData.propertyImageUrl,
          zillowUrl: enrichedData.zillowUrl,
          redfinUrl: enrichedData.redfinUrl,
          sources: enrichedData.sources,
        },
        sources: enrichedData.sources,
      });
    }

    // Fallback: Try Zillow/Redfin lookup (RapidAPI or web scraping)
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const enableScraping = process.env.ENABLE_WEB_SCRAPING === "true";
    
    if (!rapidApiKey && !enableScraping) {
      return NextResponse.json(
        { 
          found: false,
          requiresApiKey: true,
          message: "Property lookup APIs are not configured. Please enter property details manually.\n\nTo enable automatic lookup:\n- Add RENTCAST_API_KEY for comprehensive property data (recommended)\n- Add RAPIDAPI_KEY for Zillow/Redfin data\n- Set ENABLE_WEB_SCRAPING=true for web scraping (use at own risk)\n\nSee PROPERTY_ENRICHMENT_GUIDE.md for setup instructions." 
        },
        { status: 200 }
      );
    }

    // Attempt to lookup property data from Zillow/Redfin
    const propertyData = await lookupProperty(address, city, state, zipCode);

    if (!propertyData) {
      return NextResponse.json(
        { 
          found: false,
          requiresApiKey: false,
          message: "Property information not found for this address. Please enter details manually." 
        },
        { status: 200 }
      );
    }

    // Build Zillow/Redfin URLs if we have the data
    const zillowUrl = propertyData.zillowUrl || 
      (propertyData.source === "zillow" 
        ? `https://www.zillow.com/homes/${encodeURIComponent(`${address}, ${city}, ${state} ${zipCode}`)}`
        : undefined);
    
    const redfinUrl = propertyData.redfinUrl || 
      (propertyData.source === "redfin"
        ? `https://www.redfin.com/state/${state.toUpperCase()}/city/${city}/${address.replace(/\s+/g, "-")}`
        : undefined);

    return NextResponse.json({
      found: true,
      data: {
        ...propertyData,
        zillowUrl,
        redfinUrl,
      },
      sources: propertyData.source ? [propertyData.source] : [],
    });
  } catch (error) {
    console.error("Error in property lookup:", error);
    return NextResponse.json(
      { 
        found: false,
        error: "Failed to lookup property information",
        message: "Please enter details manually." 
      },
      { status: 500 }
    );
  }
}

