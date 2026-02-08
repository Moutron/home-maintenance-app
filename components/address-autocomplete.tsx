"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchAddresses, parseAddressComponents, type GeocodeResult } from "@/lib/utils/geocoding";

declare global {
  interface Window {
    google: any;
  }
}

interface AddressComponents {
  street_number?: string;
  route?: string;
  locality?: string; // city
  administrative_area_level_1?: string; // state
  postal_code?: string; // zip
  country?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, components: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing your address...",
  className,
  disabled,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [useGooglePlaces, setUseGooglePlaces] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load Google Places API only if API key is configured
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      // Use free geocoding API fallback
      setUseGooglePlaces(false);
      return;
    }

    setUseGooglePlaces(true);

    // Check if script already exists
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );
    if (existingScript) {
      // Script already loaded, initialize services
      if (window.google?.places) {
        autocompleteServiceRef.current =
          new window.google.maps.places.AutocompleteService();
        placesServiceRef.current = new window.google.maps.places.PlacesService(
          document.createElement("div")
        );
      }
      return;
    }

    if (typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.places) {
          autocompleteServiceRef.current =
            new window.google.maps.places.AutocompleteService();
          placesServiceRef.current = new window.google.maps.places.PlacesService(
            document.createElement("div")
          );
        }
      };
      script.onerror = () => {
        console.error("Failed to load Google Places API, falling back to free geocoding");
        setUseGooglePlaces(false);
      };
      document.head.appendChild(script);
    } else if (window.google?.places) {
      autocompleteServiceRef.current =
        new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
    }
  }, []);

  const handleInputChange = (inputValue: string) => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only show autocomplete if user has typed at least 3 characters
    if (!inputValue || inputValue.length < 3) {
      setSuggestions([]);
      setGeocodeSuggestions([]);
      setOpen(false);
      return;
    }

    // Debounce the API call
    debounceTimerRef.current = setTimeout(() => {
      if (useGooglePlaces && autocompleteServiceRef.current) {
        // Use Google Places API if available
        handleGooglePlacesSearch(inputValue);
      } else {
        // Use free geocoding API fallback
        handleGeocodingSearch(inputValue);
      }
    }, 300); // 300ms debounce
  };

  const handleGooglePlacesSearch = (inputValue: string) => {
    if (!autocompleteServiceRef.current) return;

    setLoading(true);
    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: inputValue,
          types: ["address"],
          componentRestrictions: { country: "us" },
        },
        (predictions: any[], status: string) => {
          setLoading(false);
          if (
            status === window.google?.maps?.places?.PlacesServiceStatus?.OK &&
            predictions &&
            predictions.length > 0
          ) {
            setSuggestions(predictions);
            setGeocodeSuggestions([]);
            setOpen(true);
          } else {
            setSuggestions([]);
            setGeocodeSuggestions([]);
            setOpen(false);
          }
        }
      );
    } catch (error) {
      console.error("Error fetching place predictions:", error);
      setLoading(false);
      setSuggestions([]);
      setGeocodeSuggestions([]);
      setOpen(false);
    }
  };

  const handleGeocodingSearch = async (inputValue: string) => {
    setLoading(true);
    try {
      const results = await searchAddresses(inputValue, 5);
      setLoading(false);
      if (results.length > 0) {
        setGeocodeSuggestions(results);
        setSuggestions([]);
        setOpen(true);
      } else {
        setGeocodeSuggestions([]);
        setSuggestions([]);
        setOpen(false);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      setLoading(false);
      setGeocodeSuggestions([]);
      setSuggestions([]);
      setOpen(false);
    }
  };

  const handleSelectPlace = (placeId: string, description: string) => {
    if (useGooglePlaces && placesServiceRef.current) {
      // Use Google Places API
      placesServiceRef.current.getDetails(
        {
          placeId,
          fields: [
            "address_components",
            "formatted_address",
            "geometry",
          ],
        },
        (place: any, status: string) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            const components: AddressComponents = {};
            place.address_components.forEach((component: any) => {
              const type = component.types[0];
              components[type as keyof AddressComponents] = component.long_name;
            });

            // Parse address components
            const streetNumber = components.street_number || "";
            const route = components.route || "";
            const fullAddress = `${streetNumber} ${route}`.trim();

            const city = components.locality || "";
            const state = components.administrative_area_level_1 || "";
            const zipCode = components.postal_code || "";

            // Use the parsed street address, not the full description
            const streetAddress = fullAddress || description.split(',')[0].trim();
            
            onChange(streetAddress, {
              address: streetAddress,
              city,
              state: state.length === 2 ? state : getStateAbbreviation(state),
              zipCode,
            });

            setOpen(false);
            setSuggestions([]);
          }
        }
      );
    }
  };

  const handleSelectGeocodeResult = (result: GeocodeResult) => {
    const components = parseAddressComponents(result);
    // Use the parsed street address from components, not the full display_name
    const streetAddress = components.address || result.display_name.split(',')[0].trim();
    onChange(streetAddress, components);
    setOpen(false);
    setGeocodeSuggestions([]);
  };

  const getStateAbbreviation = (stateName: string): string => {
    // Common state abbreviations mapping
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
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          // Update the field value immediately for typing
          onChange(newValue, {
            address: newValue,
            city: "",
            state: "",
            zipCode: "",
          });
          // Trigger autocomplete search
          handleInputChange(newValue);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
        onBlur={() => {
          // Delay closing to allow click on suggestions
          setTimeout(() => setOpen(false), 200);
        }}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && (suggestions.length > 0 || geocodeSuggestions.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-auto p-1">
            {/* Google Places suggestions */}
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.place_id}
                onClick={() => {
                  handleSelectPlace(suggestion.place_id, suggestion.description);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <span>{suggestion.description}</span>
              </div>
            ))}
            {/* Free geocoding API suggestions */}
            {geocodeSuggestions.map((result, index) => (
              <div
                key={`geocode-${index}`}
                onClick={() => {
                  handleSelectGeocodeResult(result);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              >
                <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <span>{result.display_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {open && suggestions.length === 0 && geocodeSuggestions.length === 0 && !loading && value.length > 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 text-sm text-muted-foreground">
          No addresses found. Continue typing or enter manually.
        </div>
      )}
    </div>
  );
}

