/**
 * Historical Weather Data Utilities
 * 
 * Fetches historical weather/climate data to improve accuracy of:
 * - Average rainfall
 * - Average snowfall
 * - Storm frequency
 * - Wind patterns
 * 
 * Uses Visual Crossing Weather API (free tier: 1000 requests/day)
 * Falls back to estimates if API unavailable
 */

export interface HistoricalWeatherData {
  averageRainfall: number; // inches per year
  averageSnowfall: number; // inches per year
  averageTemperature: number; // Fahrenheit
  maxTemperature: number; // Fahrenheit
  minTemperature: number; // Fahrenheit
  stormDaysPerYear: number; // Days with significant storms
  windSpeedAverage: number; // mph
  windSpeedMax: number; // mph
  hurricaneEvents: number; // Count in last 10 years
  tornadoEvents: number; // Count in last 10 years
  hailEvents: number; // Count in last 10 years
  source: string;
  dataYears: string; // e.g., "2014-2024"
}

/**
 * Fetch historical weather data from Visual Crossing API
 * Free tier: 1000 requests/day
 * Sign up at: https://www.visualcrossing.com/weather-api
 * 
 * Checks ZIP code cache first to avoid redundant API calls
 */
export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  city: string,
  state: string,
  zipCode?: string
): Promise<HistoricalWeatherData | null> {
  // Check ZIP code cache first
  if (zipCode) {
    const { getCachedZipCodeData } = await import("./zipcode-cache");
    const cached = await getCachedZipCodeData(zipCode);
    
    if (cached?.weatherData) {
      console.log("Using cached weather data for ZIP code:", zipCode);
      return cached.weatherData;
    }
  }

  const apiKey = process.env.VISUAL_CROSSING_API_KEY;
  if (!apiKey) {
    console.log("Visual Crossing API key not configured");
    return null;
  }

  try {
    // Calculate date range: last 10 years
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 10);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Visual Crossing Historical Weather API
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${latitude},${longitude}/${startDateStr}/${endDateStr}?unitGroup=us&include=days&key=${apiKey}&elements=precip,snow,temp,maxTemp,minTemp,windspeed,windgust,conditions`;

    console.log("Fetching historical weather from Visual Crossing...");
    
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        console.warn("Visual Crossing API key invalid");
      } else if (response.status === 429) {
        console.warn("Visual Crossing API rate limit exceeded");
      }
      return null;
    }

    const data = await response.json();

    if (!data.days || data.days.length === 0) {
      return null;
    }

    // Calculate averages from historical data
    const days = data.days;
    let totalRainfall = 0;
    let totalSnowfall = 0;
    let totalTemp = 0;
    let maxTemp = -Infinity;
    let minTemp = Infinity;
    let totalWindSpeed = 0;
    let maxWindSpeed = 0;
    let stormDays = 0;
    let hurricaneCount = 0;
    let tornadoCount = 0;
    let hailCount = 0;

    type WeatherDay = { precip?: number; snow?: number; temp?: number; maxTemp?: number; minTemp?: number; windspeed?: number; windgust?: number; conditions?: string; [key: string]: unknown };
    days.forEach((day: WeatherDay) => {
      // Precipitation
      if (day.precip) totalRainfall += day.precip;
      if (day.snow) totalSnowfall += day.snow;

      // Temperature
      if (day.temp) {
        totalTemp += day.temp;
        if (day.maxTemp) maxTemp = Math.max(maxTemp, day.maxTemp);
        if (day.minTemp) minTemp = Math.min(minTemp, day.minTemp);
      }

      // Wind
      if (day.windspeed) {
        totalWindSpeed += day.windspeed;
        maxWindSpeed = Math.max(maxWindSpeed, day.windspeed);
      }
      if (day.windgust) {
        maxWindSpeed = Math.max(maxWindSpeed, day.windgust);
      }

      // Storm detection
      const conditions = (day.conditions || "").toLowerCase();
      if (
        conditions.includes("storm") ||
        conditions.includes("thunder") ||
        conditions.includes("rain") ||
        (day.precip ?? 0) > 0.5
      ) {
        stormDays++;
      }

      // Extreme weather events
      if (conditions.includes("hurricane")) hurricaneCount++;
      if (conditions.includes("tornado")) tornadoCount++;
      if (conditions.includes("hail")) hailCount++;
    });

    const years = days.length / 365.25; // Approximate years
    const avgRainfallPerYear = totalRainfall / years;
    const avgSnowfallPerYear = totalSnowfall / years;
    const avgTemp = totalTemp / days.length;
    const avgWindSpeed = totalWindSpeed / days.length;
    const stormDaysPerYear = stormDays / years;

    const weatherData: HistoricalWeatherData = {
      averageRainfall: Math.round(avgRainfallPerYear * 10) / 10,
      averageSnowfall: Math.round(avgSnowfallPerYear * 10) / 10,
      averageTemperature: Math.round(avgTemp),
      maxTemperature: Math.round(maxTemp),
      minTemperature: Math.round(minTemp),
      stormDaysPerYear: Math.round(stormDaysPerYear),
      windSpeedAverage: Math.round(avgWindSpeed * 10) / 10,
      windSpeedMax: Math.round(maxWindSpeed),
      hurricaneEvents: hurricaneCount,
      tornadoEvents: tornadoCount,
      hailEvents: hailCount,
      source: "visual-crossing",
      dataYears: `${startDate.getFullYear()}-${endDate.getFullYear()}`,
    };

    // Cache the result by ZIP code for future use
    if (zipCode) {
      const { setCachedZipCodeData } = await import("./zipcode-cache");
      await setCachedZipCodeData(
        zipCode,
        city,
        state,
        weatherData,
        undefined, // climateData can be added separately
        "visual-crossing"
      );
    }

    return weatherData;
  } catch (error) {
    console.error("Error fetching historical weather:", error);
    return null;
  }
}

/**
 * Fetch historical weather using NOAA API (free, but more complex)
 * Alternative to Visual Crossing
 */
export async function fetchHistoricalWeatherNOAA(
  latitude: number,
  longitude: number
): Promise<HistoricalWeatherData | null> {
  // NOAA API requires station lookup first, then data fetch
  // This is more complex but free
  // Implementation would require:
  // 1. Find nearest weather station
  // 2. Fetch historical data from station
  // 3. Parse and aggregate data
  
  // For now, return null - can be implemented later
  return null;
}

/**
 * Estimate historical weather based on location (fallback)
 * Uses known climate patterns
 */
export function estimateHistoricalWeather(
  state: string,
  city?: string
): Partial<HistoricalWeatherData> {
  // This is a simplified estimation
  // Real implementation would use climate zone data
  
  const stateUpper = state.toUpperCase();
  
  // Known climate patterns by state
  const climatePatterns: Record<string, { rainfall: number; snowfall: number }> = {
    CA: { rainfall: 20, snowfall: 0 },
    FL: { rainfall: 54, snowfall: 0 },
    TX: { rainfall: 30, snowfall: 0 },
    NY: { rainfall: 42, snowfall: 30 },
    IL: { rainfall: 38, snowfall: 25 },
    CO: { rainfall: 17, snowfall: 60 },
    WA: { rainfall: 38, snowfall: 15 },
    OR: { rainfall: 40, snowfall: 10 },
  };

  const pattern = climatePatterns[stateUpper] || { rainfall: 30, snowfall: 10 };

  return {
    averageRainfall: pattern.rainfall,
    averageSnowfall: pattern.snowfall,
    source: "estimated",
  };
}

