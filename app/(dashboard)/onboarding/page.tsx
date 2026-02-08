"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createHomeSchema, SystemTypeEnum } from "@/lib/validations/home";
import type { CreateHomeInput } from "@/lib/validations/home";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Search, Loader2, CheckCircle2, XCircle, Info, Sparkles } from "lucide-react";
import { SystemPhotoUpload } from "@/components/system-photo-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PropertySummaryCard } from "@/components/property-summary-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  generateSystemsFromPropertyData, 
  generateAppliancesFromPropertyData 
} from "@/lib/utils/auto-populate-systems";

const SYSTEM_TYPES = [
  "HVAC",
  "ROOF",
  "WATER_HEATER",
  "PLUMBING",
  "ELECTRICAL",
  "APPLIANCE",
  "EXTERIOR",
  "LANDSCAPING",
  "POOL",
  "DECK",
  "FENCE",
  "OTHER",
] as const;

const HOME_TYPES = [
  "single-family",
  "townhouse",
  "condo",
  "apartment",
  "mobile-home",
  "other",
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Basic info, Step 2: System selection, Step 3: System details
  const [selectedSystemTypes, setSelectedSystemTypes] = useState<string[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null); // Store created home ID
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingSystems, setIsAddingSystems] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLookingUpClimate, setIsLookingUpClimate] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "success" | "not-found" | "error">("idle");
  const [climateData, setClimateData] = useState<any>(null);
  const [enrichedPropertyData, setEnrichedPropertyData] = useState<any>(null);
  const form = useForm<CreateHomeInput>({
    resolver: zodResolver(createHomeSchema),
    defaultValues: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
      yearBuilt: new Date().getFullYear(),
      squareFootage: undefined,
      lotSize: undefined,
      homeType: "single-family",
      systems: [],
      climateZone: "",
      stormFrequency: undefined,
      averageRainfall: undefined,
      averageSnowfall: undefined,
      windZone: "",
    },
  });

  const systems = form.watch("systems");
  const address = form.watch("address");
  const city = form.watch("city");
  const state = form.watch("state");
  const zipCode = form.watch("zipCode");

  const canLookup = address && city && state && zipCode && zipCode.length >= 5;

  // Step 1: Submit basic home info (without systems)
  const onSubmitStep1 = async (data: CreateHomeInput) => {
    console.log("=== STEP 1 FORM SUBMISSION START ===");
    console.log("[1] Raw form data received:", JSON.stringify(data, null, 2));
    console.log("[2] Data types:", {
      address: typeof data.address,
      city: typeof data.city,
      state: typeof data.state,
      zipCode: typeof data.zipCode,
      yearBuilt: typeof data.yearBuilt,
      homeType: typeof data.homeType,
    });
    console.log("[3] Raw values:", {
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      stateLength: data.state?.length,
      zipCodeLength: data.zipCode?.length,
    });
    
    setIsSubmitting(true);
    try {
      // Normalize address - extract just the street address (before first comma)
      let normalizedAddress = data.address;
      console.log("[4] Address normalization:", {
        original: data.address,
        type: typeof data.address,
        includesComma: typeof data.address === 'string' && data.address.includes(','),
      });
      if (normalizedAddress && typeof normalizedAddress === 'string' && normalizedAddress.includes(',')) {
        normalizedAddress = normalizedAddress.split(',')[0].trim();
        console.log("[5] Address after normalization:", normalizedAddress);
      }
      
      // Normalize state: extract only letters, uppercase, take first 2 chars
      let normalizedState = data.state;
      console.log("[6] State normalization start:", {
        original: data.state,
        type: typeof data.state,
        isString: typeof data.state === 'string',
      });
      if (normalizedState && typeof normalizedState === 'string') {
        const beforeNormalize = normalizedState;
        normalizedState = normalizedState.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
        console.log("[7] State normalization:", {
          before: beforeNormalize,
          after: normalizedState,
          length: normalizedState.length,
        });
      } else {
        console.warn("[7] State is not a string:", normalizedState, typeof normalizedState);
      }
      
      // Normalize ZIP code: remove all non-digits except dash
      let normalizedZipCode = data.zipCode;
      console.log("[8] ZIP code normalization start:", {
        original: data.zipCode,
        type: typeof data.zipCode,
        isString: typeof data.zipCode === 'string',
      });
      if (normalizedZipCode && typeof normalizedZipCode === 'string') {
        const beforeNormalize = normalizedZipCode;
        normalizedZipCode = normalizedZipCode.trim().replace(/[^\d-]/g, '');
        console.log("[9] ZIP code after trim/replace:", normalizedZipCode);
        
        // If 9 digits without dash, format as 12345-6789
        if (normalizedZipCode.length === 9 && !normalizedZipCode.includes('-')) {
          normalizedZipCode = `${normalizedZipCode.slice(0, 5)}-${normalizedZipCode.slice(5)}`;
          console.log("[10] ZIP code formatted to extended:", normalizedZipCode);
        }
        // If longer than 5 digits without dash, take first 5
        if (normalizedZipCode.length > 5 && !normalizedZipCode.includes('-')) {
          normalizedZipCode = normalizedZipCode.slice(0, 5);
          console.log("[11] ZIP code truncated to 5 digits:", normalizedZipCode);
        }
        console.log("[12] ZIP code normalization complete:", {
          before: beforeNormalize,
          after: normalizedZipCode,
          length: normalizedZipCode.length,
          matchesPattern: /^\d{5}(-\d{4})?$/.test(normalizedZipCode),
        });
      } else {
        console.warn("[9] ZIP code is not a string:", normalizedZipCode, typeof normalizedZipCode);
      }
      
      // Normalize ZIP code and state before sending
      const normalizedData = {
        ...data,
        address: normalizedAddress,
        zipCode: normalizedZipCode,
        state: normalizedState,
        systems: [], // Don't include systems in step 1
      };
      
      console.log("[13] Final normalized data object:", JSON.stringify(normalizedData, null, 2));
      console.log("[14] Normalized values check:", {
        state: normalizedState,
        stateLength: normalizedState?.length,
        stateIsValid: normalizedState && normalizedState.length === 2,
        zipCode: normalizedZipCode,
        zipCodeLength: normalizedZipCode?.length,
        zipCodeMatchesPattern: normalizedZipCode && /^\d{5}(-\d{4})?$/.test(normalizedZipCode),
      });
      
      // Validate normalized data one more time before sending
      if (!normalizedState || normalizedState.length !== 2) {
        console.error("[ERROR] State validation failed:", {
          normalizedState,
          length: normalizedState?.length,
        });
        throw new Error(`State must be exactly 2 characters. Received: "${normalizedState}" (length: ${normalizedState?.length})`);
      }
      if (!normalizedZipCode || !/^\d{5}(-\d{4})?$/.test(normalizedZipCode)) {
        console.error("[ERROR] ZIP code validation failed:", {
          normalizedZipCode,
          length: normalizedZipCode?.length,
          patternTest: normalizedZipCode ? /^\d{5}(-\d{4})?$/.test(normalizedZipCode) : false,
        });
        throw new Error(`Invalid ZIP code format. Expected: 12345 or 12345-6789. Received: "${normalizedZipCode}" (length: ${normalizedZipCode?.length})`);
      }
      
      console.log("[15] Pre-flight validation passed, sending to API...");
      
      console.log("[16] Sending normalized data to API:", JSON.stringify(normalizedData, null, 2));
      
      const response = await fetch("/api/homes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedData),
      });

      console.log("[17] API response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[18] API error response:", JSON.stringify(errorData, null, 2));
        
        const errorMessage = errorData.message || errorData.error || "Failed to create home";
        const errorDetails = errorData.details 
          ? (Array.isArray(errorData.details) 
              ? errorData.details.map((d: any) => {
                  console.error(`[19] Error detail - ${d.field}:`, {
                    message: d.message,
                    code: d.code,
                    received: d.received,
                    receivedType: typeof d.received,
                  });
                  return `${d.field}: ${d.message}${d.received !== undefined ? ` (received: "${d.received}" [${typeof d.received}])` : ""}`;
                }).join("\n")
              : errorData.details)
          : "";
        
        // Log debug info if available
        if (errorData.debug) {
          console.error("[20] Debug info from server:", JSON.stringify(errorData.debug, null, 2));
        }
        
        throw new Error(errorDetails ? `${errorMessage}\n\nDetails:\n${errorDetails}` : errorMessage);
      }
      
      console.log("[21] ✅ API request successful");

      const result = await response.json();
      setHomeId(result.home.id);
      
      // Show success message
      if (result.isUpdate) {
        console.log("Home updated successfully");
      } else {
        console.log("Home created successfully");
      }
      
      // Move to step 2 (system selection)
      setStep(2);
    } catch (error) {
      console.error("Error creating home:", error);
      alert(error instanceof Error ? error.message : "Failed to create home");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Add systems (optional, can skip)
  const onSubmitStep2 = async () => {
    if (!homeId) {
      alert("Home ID not found. Please go back and complete step 1.");
      return;
    }

    const systems = form.getValues("systems") || [];
    
    // If no systems, skip to tasks
    if (systems.length === 0) {
      await generateTasksAndRedirect();
      return;
    }

    setIsAddingSystems(true);
    try {
      const response = await fetch(`/api/homes/${homeId}/systems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ systems }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add systems");
      }

      await generateTasksAndRedirect();
    } catch (error) {
      console.error("Error adding systems:", error);
      alert(error instanceof Error ? error.message : "Failed to add systems");
    } finally {
      setIsAddingSystems(false);
    }
  };

  // Generate tasks and redirect
  const generateTasksAndRedirect = async () => {
    if (!homeId) return;
    
    try {
      await fetch("/api/tasks/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ homeId }),
      });
    } catch (taskError) {
      console.warn("Failed to generate tasks:", taskError);
      // Don't block navigation if task generation fails
    }

    router.push("/tasks");
  };

  const addSystem = (systemType: string) => {
    const currentSystems = form.getValues("systems") || [];
    form.setValue("systems", [
      ...currentSystems,
      {
        systemType: systemType as any,
        brand: undefined,
        model: undefined,
        installDate: undefined,
        expectedLifespan: undefined,
        material: undefined,
        capacity: undefined,
        condition: undefined,
        stormResistance: undefined,
        notes: undefined,
      },
    ]);
  };

  const removeSystem = (index: number) => {
    const currentSystems = form.getValues("systems") || [];
    form.setValue(
      "systems",
      currentSystems.filter((_, i) => i !== index)
    );
  };

  const handleSystemSelection = (systemType: string, checked: boolean) => {
    if (checked) {
      setSelectedSystemTypes([...selectedSystemTypes, systemType]);
      addSystem(systemType);
    } else {
      setSelectedSystemTypes(selectedSystemTypes.filter(t => t !== systemType));
      const currentSystems = form.getValues("systems") || [];
      // Find and remove the last occurrence of this system type
      const indices: number[] = [];
      currentSystems.forEach((sys, i) => {
        if (sys.systemType === systemType) {
          indices.push(i);
        }
      });
      if (indices.length > 0) {
        removeSystem(indices[indices.length - 1]);
      }
    }
  };

  const handlePhotoAnalysis = (index: number, analysis: any) => {
    const currentSystems = form.getValues("systems") || [];
    const system = currentSystems[index];
    if (!system) return;

    const updatedSystem = { ...system };
    
    if (analysis.systemType) {
      updatedSystem.systemType = analysis.systemType as any;
    }
    if (analysis.brand) {
      updatedSystem.brand = analysis.brand;
    }
    if (analysis.model) {
      updatedSystem.model = analysis.model;
    }
    if (analysis.installDate) {
      updatedSystem.installDate = new Date(analysis.installDate);
    }
    if (analysis.condition) {
      updatedSystem.condition = analysis.condition as any;
    }
    if (analysis.material) {
      updatedSystem.material = analysis.material;
    }
    if (analysis.capacity) {
      updatedSystem.capacity = analysis.capacity;
    }
    if (analysis.additionalDetails) {
      updatedSystem.notes = analysis.additionalDetails;
    }

    const updatedSystems = [...currentSystems];
    updatedSystems[index] = updatedSystem;
    form.setValue("systems", updatedSystems);
  };

  const lookupProperty = async () => {
    if (!canLookup) return;

    setIsLookingUp(true);
    setLookupStatus("idle");
    setEnrichedPropertyData(null); // Clear previous data

    try {
      const response = await fetch("/api/property/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          city,
          state,
          zipCode,
        }),
      });

      const result = await response.json();

      if (result.found && result.data) {
        const data = result.data;
        
        // Auto-fill form fields with found data
        if (data.yearBuilt) {
          form.setValue("yearBuilt", data.yearBuilt);
        }
        if (data.squareFootage) {
          form.setValue("squareFootage", data.squareFootage);
        }
        if (data.lotSize) {
          // Round to 2 decimal places
          const roundedLotSize = Math.round(data.lotSize * 100) / 100;
          form.setValue("lotSize", roundedLotSize);
        }
        if (data.propertyType) {
          // Map property type to our homeType enum
          const homeTypeMap: Record<string, string> = {
            "Single Family": "single-family",
            "Townhouse": "townhouse",
            "Condo": "condo",
            "Apartment": "apartment",
            "Mobile Home": "mobile-home",
            "single-family": "single-family",
            "townhouse": "townhouse",
            "condo": "condo",
            "apartment": "apartment",
            "mobile-home": "mobile-home",
          };
          const mappedType = homeTypeMap[data.propertyType] || "single-family";
          form.setValue("homeType", mappedType as any);
        }
        
        // Auto-fill storm frequency if available from enriched data
        if (data.stormFrequency) {
          form.setValue("stormFrequency", data.stormFrequency as any);
        }
        
        // Auto-fill rainfall/snowfall if available
        if (data.averageRainfall) {
          form.setValue("averageRainfall", data.averageRainfall);
        }
        if (data.averageSnowfall !== undefined) {
          form.setValue("averageSnowfall", data.averageSnowfall);
        }

        // Auto-populate systems from property data
        const yearBuilt = data.yearBuilt || form.getValues("yearBuilt");
        const autoSystems = generateSystemsFromPropertyData(data, yearBuilt);
        
        if (autoSystems.length > 0) {
          const currentSystems = form.getValues("systems") || [];
          // Only add systems that don't already exist (by type)
          const existingSystemTypes = new Set(currentSystems.map((s: any) => s.systemType));
          const newSystems = autoSystems.filter(s => !existingSystemTypes.has(s.systemType));
          
          if (newSystems.length > 0) {
            const merged = [...currentSystems, ...newSystems] as CreateHomeInput["systems"];
            form.setValue("systems", merged);
            console.log(`Auto-populated ${newSystems.length} system(s):`, newSystems.map(s => s.systemType).join(", "));
          }
        }

        // Show success message with data sources
        const sources = result.sources || [];
        const sourceText = sources.length > 0 
          ? `\n\nData sources: ${sources.join(", ")}`
          : "";
        
        setLookupStatus("success");
        
        // Store enriched data for display
        setEnrichedPropertyData(data);
        
        // Log additional enriched data if available
        if (data.stories || data.garageSpaces || data.constructionType) {
          console.log("Additional property data found:", {
            stories: data.stories,
            garageSpaces: data.garageSpaces,
            constructionType: data.constructionType,
            roofType: data.roofType,
            foundationType: data.foundationType,
            heatingType: data.heatingType,
            coolingType: data.coolingType,
            assessedValue: data.assessedValue,
            marketValue: data.marketValue,
          });
        }
      } else {
        // Clear enriched data on lookup failure
        setEnrichedPropertyData(null);
        
        // Check if API key is required
        if (result.requiresApiKey) {
          setLookupStatus("error");
          alert("Property lookup API is not configured. Please enter property details manually.\n\nTo enable automatic lookup, add RAPIDAPI_KEY to your .env file. See README.md for setup instructions.");
        } else {
          setLookupStatus("not-found");
        }
      }
    } catch (error) {
      console.error("Error looking up property:", error);
      setLookupStatus("error");
    } finally {
      setIsLookingUp(false);
    }
  };

  const lookupClimateData = async () => {
    if (!canLookup) return;

    setIsLookingUpClimate(true);
    try {
      const response = await fetch("/api/climate/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city,
          state,
          zipCode,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        
        // Auto-fill climate fields
        if (data.stormFrequency) {
          form.setValue("stormFrequency", data.stormFrequency);
        }
        if (data.averageRainfall) {
          form.setValue("averageRainfall", data.averageRainfall);
        }
        if (data.averageSnowfall !== undefined) {
          form.setValue("averageSnowfall", data.averageSnowfall);
        }
        if (data.windZone) {
          form.setValue("windZone", data.windZone);
        }

        setClimateData({
          data: result.data,
          recommendations: result.recommendations || [],
        });
      }
    } catch (error) {
      console.error("Error looking up climate data:", error);
    } finally {
      setIsLookingUpClimate(false);
    }
  };

  // Auto-fetch climate data when address is complete
  useEffect(() => {
    if (canLookup && !climateData && !isLookingUpClimate) {
      lookupClimateData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLookup]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Welcome! Let's set up your home</CardTitle>
          <CardDescription>
            {step === 1 
              ? "Tell us about your home so we can create a personalized maintenance schedule."
              : "Add your home systems (optional). You can skip this step and add systems later."}
          </CardDescription>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1
              </div>
              <span className="text-sm font-medium">Basic Info</span>
            </div>
            <div className="h-0.5 w-8 bg-muted" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <span className="text-sm font-medium">Systems (Optional)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            {step === 1 ? (
              <form onSubmit={form.handleSubmit(onSubmitStep1)} className="space-y-6">
              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Home Address</h3>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={(address, components) => {
                            // Use the parsed street address from components, not the full formatted address
                            const streetAddress = components.address || address.split(',')[0].trim();
                            field.onChange(streetAddress);
                            // Auto-fill city, state, and zipCode when address is selected
                            form.setValue("city", components.city);
                            form.setValue("state", components.state);
                            form.setValue("zipCode", components.zipCode);
                          }}
                          placeholder="Start typing your address..."
                        />
                      </FormControl>
                      <FormDescription>
                        Start typing your address and select from suggestions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="CA"
                            maxLength={2}
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Property Lookup Button */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={lookupProperty}
                    disabled={!canLookup || isLookingUp}
                    className="w-full"
                  >
                    {isLookingUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Looking up property...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Auto-fill from Zillow/Redfin
                      </>
                    )}
                  </Button>
                </div>

                {/* Lookup Status Messages */}
                {lookupStatus === "success" && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Property information found and auto-filled! Please review and adjust as needed.
                    </AlertDescription>
                  </Alert>
                )}
                {lookupStatus === "not-found" && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <XCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Property information not found online. Please enter the details manually below.
                    </AlertDescription>
                  </Alert>
                )}
                {lookupStatus === "error" && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Error looking up property. Please enter the details manually below.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Property Summary Card - Show enriched data */}
              {enrichedPropertyData && lookupStatus === "success" && (
                <PropertySummaryCard data={enrichedPropertyData} />
              )}

              {/* Home Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Home Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="yearBuilt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Built</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="homeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select home type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HOME_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type
                                  .split("-")
                                  .map(
                                    (word) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1)
                                  )
                                  .join(" ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="squareFootage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Footage (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lotSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lot Size in Acres (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Climate & Storm Information (Auto-filled) */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Climate & Storm Information</h3>
                    {isLookingUpClimate && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {climateData && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Auto-filled
                      </Badge>
                    )}
                  </div>
                  <FormDescription>
                    Climate data is automatically fetched based on your location. You can adjust these values if needed.
                  </FormDescription>
                  
                  {climateData?.recommendations && climateData.recommendations.length > 0 && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <AlertDescription className="text-blue-800">
                        <strong>Climate Recommendations:</strong>
                        <ul className="mt-2 list-disc list-inside space-y-1">
                          {climateData.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stormFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Storm Frequency</FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-full border border-transparent bg-transparent text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                  >
                                    <Info className="h-4 w-4" />
                                    <span className="sr-only">Learn more about storm frequency</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm p-4" side="right">
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-sm">Understanding Storm Frequency</h4>
                                    <p className="text-xs text-muted-foreground mb-3">
                                      This helps us recommend the right maintenance schedule for your home based on historical weather patterns.
                                    </p>
                                    <div className="space-y-2 text-xs">
                                      <div>
                                        <span className="font-semibold text-green-600">Low:</span>
                                        <p className="text-muted-foreground">Minimal storm activity. Standard maintenance schedules apply.</p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-blue-600">Moderate:</span>
                                        <p className="text-muted-foreground">Some storms (30+ days/year). Slightly more frequent exterior inspections recommended.</p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-orange-600">High:</span>
                                        <p className="text-muted-foreground">Frequent storms (50+ days/year) or tornado activity. More frequent roof and exterior maintenance needed.</p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-red-600">Severe:</span>
                                        <p className="text-muted-foreground">Hurricane-prone or extreme storm activity. Quarterly roof inspections and storm preparation tasks recommended.</p>
                                      </div>
                                    </div>
                                    <div className="pt-2 border-t text-xs text-muted-foreground">
                                      <p className="font-semibold mb-1">Why it matters:</p>
                                      <ul className="list-disc list-inside space-y-1">
                                        <li>More frequent roof inspections in storm-prone areas</li>
                                        <li>Earlier gutter cleaning before storm seasons</li>
                                        <li>Wind-rated equipment recommendations</li>
                                        <li>Storm preparation task reminders</li>
                                      </ul>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select storm frequency">
                                  {field.value ? (
                                    field.value === "low" ? "Low" :
                                    field.value === "moderate" ? "Moderate" :
                                    field.value === "high" ? "High" :
                                    field.value === "severe" ? "Severe (Hurricane/Tornado prone)" :
                                    field.value
                                  ) : "Select storm frequency"}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low - Minimal storm activity</SelectItem>
                              <SelectItem value="moderate">Moderate - Some storms (30+ days/year)</SelectItem>
                              <SelectItem value="high">High - Frequent storms (50+ days/year)</SelectItem>
                              <SelectItem value="severe">Severe - Hurricane/Tornado prone</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {climateData?.data?.hurricaneRisk && "🌀 Hurricane-prone area"}
                            {climateData?.data?.tornadoRisk && " 🌪️ Tornado-prone area"}
                            {climateData?.data?.hailRisk && " ⚡ Hail-prone area"}
                            {field.value && (
                              <span className="ml-2">
                                {field.value === "low" && "✓ Standard maintenance schedule"}
                                {field.value === "moderate" && "✓ Slightly increased exterior maintenance"}
                                {field.value === "high" && "✓ More frequent roof/exterior inspections"}
                                {field.value === "severe" && "✓ Quarterly inspections recommended"}
                              </span>
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="windZone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wind Zone (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Zone 1, Zone 2" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="averageRainfall"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average Rainfall (inches/year)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.1"
                              placeholder="e.g., 40"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          {climateData?.data && (
                            <FormDescription>
                              Based on {city}, {state} location
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="averageSnowfall"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average Snowfall (inches/year)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              step="0.1"
                              placeholder="e.g., 30"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          {climateData?.data && (
                            <FormDescription>
                              Based on {city}, {state} location
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Step 1 Submit Button */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Continue to Systems (Optional)"}
              </Button>
            </form>
            ) : step === 2 ? (
              /* Step 2: System Selection */
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Select Systems to Add</h3>
                    <FormDescription>
                      Choose which systems and appliances you'd like to track in your home. 
                      You can add details in the next step, or skip and add them later.
                    </FormDescription>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    {SYSTEM_TYPES.map((type) => {
                      const displayName = type
                        .split("_")
                        .map(
                          (word) =>
                            word.charAt(0) + word.slice(1).toLowerCase()
                        )
                        .join(" ");
                      const isSelected = selectedSystemTypes.includes(type);
                      
                      return (
                        <Card
                          key={type}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? "ring-2 ring-primary border-primary"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => handleSystemSelection(type, !isSelected)}
                        >
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  handleSystemSelection(type, checked as boolean)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                              <label className="text-sm font-medium cursor-pointer flex-1">
                                {displayName}
                              </label>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSubmitStep2}
                    disabled={isAddingSystems}
                    className="flex-1"
                  >
                    Skip
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (selectedSystemTypes.length > 0) {
                        setStep(3);
                      } else {
                        onSubmitStep2();
                      }
                    }}
                    disabled={selectedSystemTypes.length === 0}
                    className="flex-1"
                  >
                    Continue to Details
                  </Button>
                </div>
              </div>
            ) : (
              /* Step 3: System Details */
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">System Details</h3>
                    <Badge variant="secondary">
                      {systems?.length || 0} {systems?.length === 1 ? "system" : "systems"}
                    </Badge>
                  </div>
                  <FormDescription>
                    Add details for each system. You can use AI photo analysis to automatically fill in information, or enter it manually.
                  </FormDescription>

                {systems?.map((system, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid gap-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">
                              {systems[index]?.systemType
                                ?.split("_")
                                .map(
                                  (word) =>
                                    word.charAt(0) + word.slice(1).toLowerCase()
                                )
                                .join(" ") || `System ${index + 1}`}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              System {index + 1} of {systems?.length || 0}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              removeSystem(index);
                              const systemType = systems[index]?.systemType;
                              if (systemType) {
                                setSelectedSystemTypes(
                                  selectedSystemTypes.filter(t => t !== systemType)
                                );
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Photo Upload with AI Analysis */}
                        <div className="border rounded-lg p-4 bg-muted/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <FormLabel className="text-sm font-medium">
                              AI Photo Analysis (Optional)
                            </FormLabel>
                          </div>
                          <FormDescription className="mb-3">
                            Take or upload a photo to automatically identify the system type, brand, model, age, and condition.
                          </FormDescription>
                          <SystemPhotoUpload
                            onAnalysisComplete={(analysis) => handlePhotoAnalysis(index, analysis)}
                            systemTypeHint={systems[index]?.systemType}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`systems.${index}.systemType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>System Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SYSTEM_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type
                                        .split("_")
                                        .map(
                                          (word) =>
                                            word.charAt(0) +
                                            word.slice(1).toLowerCase()
                                        )
                                        .join(" ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`systems.${index}.brand`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Brand (optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`systems.${index}.model`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Model (optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {/* Material field - show for specific system types */}
                        {(systems[index]?.systemType === "PLUMBING" || 
                          systems[index]?.systemType === "ROOF" || 
                          systems[index]?.systemType === "ELECTRICAL") && (
                          <FormField
                            control={form.control}
                            name={`systems.${index}.material`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Material
                                  {systems[index]?.systemType === "PLUMBING" && " (e.g., Copper, PVC, PEX)"}
                                  {systems[index]?.systemType === "ROOF" && " (e.g., Asphalt Shingle, Metal, Tile)"}
                                  {systems[index]?.systemType === "ELECTRICAL" && " (e.g., Aluminum, Copper)"}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={
                                      systems[index]?.systemType === "PLUMBING" ? "Copper, PVC, or PEX" :
                                      systems[index]?.systemType === "ROOF" ? "Asphalt, Metal, Tile, etc." :
                                      "Aluminum, Copper, etc."
                                    }
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  {systems[index]?.systemType === "PLUMBING" && "Copper pipes need different maintenance than PVC/PEX"}
                                  {systems[index]?.systemType === "ROOF" && "Material affects inspection frequency and lifespan"}
                                  {systems[index]?.systemType === "ELECTRICAL" && "Material type affects maintenance needs"}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {/* Capacity field - show for electrical and water heater */}
                        {(systems[index]?.systemType === "ELECTRICAL" || 
                          systems[index]?.systemType === "WATER_HEATER") && (
                          <FormField
                            control={form.control}
                            name={`systems.${index}.capacity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Capacity
                                  {systems[index]?.systemType === "ELECTRICAL" && " (e.g., 200A, 100A)"}
                                  {systems[index]?.systemType === "WATER_HEATER" && " (e.g., 50 gal, 75 gal)"}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder={
                                      systems[index]?.systemType === "ELECTRICAL" ? "200A" :
                                      "50 gal"
                                    }
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {/* Condition field */}
                        <FormField
                          control={form.control}
                          name={`systems.${index}.condition`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Condition (optional)</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select condition" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="excellent">Excellent</SelectItem>
                                  <SelectItem value="good">Good</SelectItem>
                                  <SelectItem value="fair">Fair</SelectItem>
                                  <SelectItem value="poor">Poor</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Poor/fair condition systems need more frequent maintenance
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Storm resistance - show for roof */}
                        {systems[index]?.systemType === "ROOF" && (
                          <FormField
                            control={form.control}
                            name={`systems.${index}.stormResistance`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Storm Resistance (optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., Wind-rated, Hail-resistant"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Important for homes in storm-prone areas
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`systems.${index}.installDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Install Date (optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={
                                      field.value
                                        ? new Date(field.value)
                                            .toISOString()
                                            .split("T")[0]
                                        : ""
                                    }
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? new Date(e.target.value)
                                          : undefined
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`systems.${index}.expectedLifespan`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Expected Lifespan (years, optional)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? parseInt(e.target.value)
                                          : undefined
                                      )
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`systems.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>

                {/* Step 3 Actions */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSubmitStep2}
                    disabled={isAddingSystems}
                    className="flex-1"
                  >
                    Skip
                  </Button>
                  <Button
                    type="button"
                    onClick={onSubmitStep2}
                    disabled={isAddingSystems || (systems?.length || 0) === 0}
                    className="flex-1"
                  >
                    {isAddingSystems ? "Adding..." : "Add Systems & Finish"}
                  </Button>
                </div>
              </div>
            )}
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

