/**
 * Storm Frequency Calculator
 * 
 * Calculates storm frequency level based on historical weather data
 * Uses hurricane events, tornado events, storm days, and other factors
 */

import type { HistoricalWeatherData } from "./historical-weather";

/**
 * Calculate storm frequency from historical weather data
 */
export function calculateStormFrequencyFromWeather(
  weatherData: HistoricalWeatherData
): "low" | "moderate" | "high" | "severe" {
  const {
    hurricaneEvents,
    tornadoEvents,
    stormDaysPerYear,
    windSpeedMax,
    hailEvents,
  } = weatherData;

  // Severe: Multiple hurricanes or very high storm activity
  if (hurricaneEvents >= 2 || (hurricaneEvents >= 1 && stormDaysPerYear > 60)) {
    return "severe";
  }

  // High: Significant tornado activity or high storm days
  if (
    tornadoEvents >= 3 ||
    stormDaysPerYear > 50 ||
    (tornadoEvents >= 1 && stormDaysPerYear > 40) ||
    (hurricaneEvents >= 1 && stormDaysPerYear > 30)
  ) {
    return "high";
  }

  // Moderate: Some storm activity but not extreme
  if (
    stormDaysPerYear > 30 ||
    tornadoEvents >= 1 ||
    hailEvents >= 5 ||
    windSpeedMax > 60
  ) {
    return "moderate";
  }

  // Low: Minimal storm activity
  return "low";
}

/**
 * Calculate storm frequency from multiple data sources
 * Prioritizes historical weather data if available
 */
export function determineStormFrequency(
  weatherData?: HistoricalWeatherData,
  climateData?: { stormFrequency?: "low" | "moderate" | "high" | "severe" }
): "low" | "moderate" | "high" | "severe" {
  // Prefer calculated value from historical weather data
  if (weatherData) {
    return calculateStormFrequencyFromWeather(weatherData);
  }

  // Fall back to climate data estimate
  if (climateData?.stormFrequency) {
    return climateData.stormFrequency;
  }

  // Default to moderate if no data
  return "moderate";
}

