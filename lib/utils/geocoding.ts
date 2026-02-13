/**
 * Free geocoding API fallback using Nominatim (OpenStreetMap)
 * This provides address autocomplete without requiring a Google Places API key
 */

export interface GeocodeResult {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export async function searchAddresses(
  query: string,
  limit: number = 5
): Promise<GeocodeResult[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&countrycodes=us&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Home Maintenance App", // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding API request failed");
    }

    const data = await response.json();
    type NominatimItem = {
      display_name?: string;
      address?: {
        house_number?: string;
        road?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
        postcode?: string;
        country?: string;
      };
    };
    return (data as NominatimItem[]).map((item): GeocodeResult => ({
      display_name: item.display_name ?? "",
      address: {
        house_number: item.address?.house_number,
        road: item.address?.road,
        city:
          item.address?.city ||
          item.address?.town ||
          item.address?.village ||
          item.address?.municipality,
        state: item.address?.state,
        postcode: item.address?.postcode,
        country: item.address?.country,
      },
    }));
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return [];
  }
}

export function parseAddressComponents(result: GeocodeResult): {
  address: string;
  city: string;
  state: string;
  zipCode: string;
} {
  const addr = result.address;
  const streetNumber = addr.house_number || "";
  const road = addr.road || "";
  const fullAddress = `${streetNumber} ${road}`.trim() || result.display_name.split(",")[0];

  return {
    address: fullAddress,
    city: addr.city || "",
    state: getStateAbbreviation(addr.state || ""),
    zipCode: addr.postcode || "",
  };
}

function getStateAbbreviation(stateName: string): string {
  if (!stateName) return "";
  if (stateName.length === 2) return stateName.toUpperCase();

  const stateMap: Record<string, string> = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
    Wisconsin: "WI",
    Wyoming: "WY",
  };

  return stateMap[stateName] || stateName.substring(0, 2).toUpperCase();
}

