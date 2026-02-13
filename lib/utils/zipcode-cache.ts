/**
 * ZIP Code Level Caching Utility
 * 
 * Caches weather/climate data by ZIP code since all properties
 * in the same ZIP code share the same weather/climate data.
 * 
 * This dramatically reduces API calls - one ZIP code lookup
 * serves all properties in that ZIP code.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { HistoricalWeatherData } from "./historical-weather";
import type { ClimateData } from "./climate-data";

const ZIPCODE_CACHE_EXPIRY_DAYS = 90; // Weather data changes slowly, cache longer

/**
 * Normalize ZIP code (remove spaces, ensure format)
 */
function normalizeZipCode(zipCode: string): string {
  return zipCode.trim().replace(/\s+/g, "").substring(0, 5); // Use first 5 digits
}

/**
 * Get cached weather/climate data for a ZIP code
 */
export async function getCachedZipCodeData(
  zipCode: string
): Promise<{
  weatherData?: HistoricalWeatherData;
  climateData?: ClimateData;
} | null> {
  try {
    const normalizedZip = normalizeZipCode(zipCode);

    const cached = await prisma.zipCodeCache.findUnique({
      where: { zipCode: normalizedZip },
    });

    if (!cached) {
      console.log("No ZIP code cache found for:", normalizedZip);
      return null;
    }

    // Check if cache has expired
    if (cached.expiresAt < new Date()) {
      console.log("ZIP code cache expired for:", normalizedZip);
      // Delete expired cache
      await prisma.zipCodeCache.delete({
        where: { id: cached.id },
      });
      return null;
    }

    console.log("ZIP code cache hit for:", normalizedZip, "Source:", cached.source);

    return {
      weatherData: cached.weatherData as unknown as HistoricalWeatherData,
      climateData: cached.climateData as unknown as ClimateData | undefined,
    };
  } catch (error) {
    console.error("Error reading ZIP code cache:", error);
    return null; // Fail gracefully
  }
}

/**
 * Store weather/climate data for a ZIP code
 */
export async function setCachedZipCodeData(
  zipCode: string,
  city: string,
  state: string,
  weatherData: HistoricalWeatherData,
  climateData?: ClimateData,
  source: string = "visual-crossing"
): Promise<void> {
  try {
    const normalizedZip = normalizeZipCode(zipCode);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ZIPCODE_CACHE_EXPIRY_DAYS);

    // Use upsert to update if exists, create if not
    await prisma.zipCodeCache.upsert({
      where: { zipCode: normalizedZip },
      create: {
        zipCode: normalizedZip,
        city: city.trim(),
        state: state.trim().toUpperCase(),
        weatherData: weatherData as unknown as Prisma.InputJsonValue,
        climateData: climateData as unknown as Prisma.InputJsonValue,
        source,
        expiresAt,
      },
      update: {
        weatherData: weatherData as unknown as Prisma.InputJsonValue,
        climateData: climateData as unknown as Prisma.InputJsonValue,
        source,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    console.log(
      "Cached ZIP code data for:",
      normalizedZip,
      "Expires:",
      expiresAt.toISOString().split("T")[0]
    );
  } catch (error) {
    console.error("Error writing ZIP code cache:", error);
    // Don't throw - caching failure shouldn't break the flow
  }
}

/**
 * Clear expired ZIP code cache entries
 */
export async function clearExpiredZipCodeCache(): Promise<number> {
  try {
    const result = await prisma.zipCodeCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`Cleared ${result.count} expired ZIP code cache entries`);
    return result.count;
  } catch (error) {
    console.error("Error clearing expired ZIP code cache:", error);
    return 0;
  }
}

/**
 * Get ZIP code cache statistics
 */
export async function getZipCodeCacheStats(): Promise<{
  totalEntries: number;
  expiredEntries: number;
  validEntries: number;
}> {
  try {
    const total = await prisma.zipCodeCache.count();
    const expired = await prisma.zipCodeCache.count({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return {
      totalEntries: total,
      expiredEntries: expired,
      validEntries: total - expired,
    };
  } catch (error) {
    console.error("Error getting ZIP code cache stats:", error);
    return {
      totalEntries: 0,
      expiredEntries: 0,
      validEntries: 0,
    };
  }
}

/**
 * Check if ZIP code cache exists and is valid
 */
export async function hasValidZipCodeCache(zipCode: string): Promise<boolean> {
  try {
    const normalizedZip = normalizeZipCode(zipCode);
    const cached = await prisma.zipCodeCache.findUnique({
      where: { zipCode: normalizedZip },
    });

    if (!cached) return false;
    if (cached.expiresAt < new Date()) return false;

    return true;
  } catch (error) {
    return false;
  }
}

