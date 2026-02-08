import { NextRequest, NextResponse } from "next/server";
import {
  fetchClimateData,
  estimateClimateDataFromLocation,
  getClimateRecommendations,
} from "@/lib/utils/climate-data";

/**
 * API route to lookup climate and storm data based on location
 * Uses location-based estimates and can integrate with weather APIs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city, state, zipCode } = body;

    if (!city || !state || !zipCode) {
      return NextResponse.json(
        { error: "City, state, and zipCode are required" },
        { status: 400 }
      );
    }

    // Check ZIP code cache first
    const { getCachedZipCodeData, setCachedZipCodeData } = await import("@/lib/utils/zipcode-cache");
    let climateData = null;
    let fromCache = false;

    const cached = await getCachedZipCodeData(zipCode);
    if (cached?.climateData) {
      console.log("Using cached climate data for ZIP code:", zipCode);
      climateData = cached.climateData;
      fromCache = true;
    } else {
      // Cache miss - fetch fresh data
      climateData = await fetchClimateData(city, state, zipCode);

      if (climateData) {
        // Cache the result for future use
        // If we have weather data too, include it
        const weatherData = cached?.weatherData;
        await setCachedZipCodeData(
          zipCode,
          city,
          state,
          weatherData || {} as any, // Will be updated when weather is fetched
          climateData,
          "climate-estimate"
        );
      }
    }

    if (!climateData) {
      return NextResponse.json(
        { error: "Failed to fetch climate data" },
        { status: 500 }
      );
    }

    // Get recommendations
    const recommendations = getClimateRecommendations(climateData);

    return NextResponse.json({
      success: true,
      data: climateData,
      recommendations,
    });
  } catch (error) {
    console.error("Error in climate lookup:", error);
    return NextResponse.json(
      { error: "Failed to lookup climate data" },
      { status: 500 }
    );
  }
}

