/**
 * Property Data Caching Utility
 * 
 * Caches property data from APIs to reduce costs and improve performance.
 * Cache expires after 30 days (configurable).
 */

import { prisma } from "@/lib/prisma";
import type { EnrichedPropertyData } from "./property-enrichment";

const CACHE_EXPIRY_DAYS = 30; // Cache expires after 30 days

/**
 * Generate a normalized cache key from address components
 */
function generateCacheKey(
  address: string,
  city: string,
  state: string,
  zipCode: string
): string {
  // Normalize: lowercase, trim, remove extra spaces
  const normalized = `${address.trim().toLowerCase()}|${city.trim().toLowerCase()}|${state.trim().toUpperCase()}|${zipCode.trim()}`;
  return normalized.replace(/\s+/g, " ");
}

/**
 * Check if cached property data exists and is still valid
 */
export async function getCachedPropertyData(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<EnrichedPropertyData | null> {
  try {
    const cacheKey = generateCacheKey(address, city, state, zipCode);

    const cached = await prisma.propertyCache.findUnique({
      where: { cacheKey },
    });

    if (!cached) {
      console.log("No cache found for:", cacheKey);
      return null;
    }

    // Check if cache has expired
    if (cached.expiresAt < new Date()) {
      console.log("Cache expired for:", cacheKey);
      // Delete expired cache
      await prisma.propertyCache.delete({
        where: { id: cached.id },
      });
      return null;
    }

    console.log("Cache hit for:", cacheKey, "Source:", cached.source);
    
    // Return cached data
    return cached.propertyData as unknown as EnrichedPropertyData;
  } catch (error) {
    console.error("Error reading from cache:", error);
    return null; // Fail gracefully - return null to allow API call
  }
}

/**
 * Store property data in cache
 */
export async function setCachedPropertyData(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  propertyData: EnrichedPropertyData,
  source: string = "unknown"
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(address, city, state, zipCode);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_EXPIRY_DAYS);

    // Use upsert to update if exists, create if not
    await prisma.propertyCache.upsert({
      where: { cacheKey },
      create: {
        address: address.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zipCode: zipCode.trim(),
        cacheKey,
        propertyData: propertyData as any, // Prisma Json type
        source,
        expiresAt,
      },
      update: {
        propertyData: propertyData as any,
        source,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    console.log("Cached property data for:", cacheKey, "Expires:", expiresAt);
  } catch (error) {
    console.error("Error writing to cache:", error);
    // Don't throw - caching failure shouldn't break the flow
  }
}

/**
 * Clear expired cache entries (useful for cleanup jobs)
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const result = await prisma.propertyCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`Cleared ${result.count} expired cache entries`);
    return result.count;
  } catch (error) {
    console.error("Error clearing expired cache:", error);
    return 0;
  }
}

/**
 * Clear cache for a specific address
 */
export async function clearCacheForAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<boolean> {
  try {
    const cacheKey = generateCacheKey(address, city, state, zipCode);
    
    await prisma.propertyCache.delete({
      where: { cacheKey },
    });

    console.log("Cleared cache for:", cacheKey);
    return true;
  } catch (error) {
    console.error("Error clearing cache:", error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  expiredEntries: number;
  validEntries: number;
}> {
  try {
    const total = await prisma.propertyCache.count();
    const expired = await prisma.propertyCache.count({
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
    console.error("Error getting cache stats:", error);
    return {
      totalEntries: 0,
      expiredEntries: 0,
      validEntries: 0,
    };
  }
}

