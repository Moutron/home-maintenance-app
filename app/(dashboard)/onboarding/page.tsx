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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Basic info, Step 2: Weather & climate, Step 3: Systems (optional)
  const [inStep3Wizard, setInStep3Wizard] = useState(false); // When step 3: true = wizard, false = selection grid
  const [currentSystemIndex, setCurrentSystemIndex] = useState(0); // Wizard: which system we're editing in Step 3
  const [selectedSystemTypes, setSelectedSystemTypes] = useState<string[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null); // Store created home ID
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingSystems, setIsAddingSystems] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isLookingUpClimate, setIsLookingUpClimate] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "success" | "not-found" | "error">("idle");
  const [step1AccordionOpen, setStep1AccordionOpen] = useState<string | undefined>(undefined);
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

  // Reset system-detail wizard when entering Step 3 (show grid first)
  useEffect(() => {
    if (step === 3) {
      setCurrentSystemIndex(0);
      setInStep3Wizard(false);
    }
  }, [step]);

  // Keep wizard index in bounds when systems are removed
  const systemCount = systems?.length ?? 0;
  useEffect(() => {
    if (systemCount > 0 && currentSystemIndex >= systemCount) {
      setCurrentSystemIndex(Math.max(0, systemCount - 1));
    }
  }, [systemCount, currentSystemIndex]);
  const city = form.watch("city");
  const state = form.watch("state");
  const zipCode = form.watch("zipCode");

  const canLookup = address && city && state && zipCode && zipCode.length >= 5;

  // Step 1: Save home so progress isn't lost after login, then advance to Weather & Climate
  const onSubmitStep1 = async (data: CreateHomeInput) => {
    setIsSubmitting(true);
    try {
      await createHomeWithClimate(data);
      setStep(2);
    } catch (error) {
      console.error("Error saving home:", error);
      alert(error instanceof Error ? error.message : "Failed to save home");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Normalize and create home (used after Step 2 - Weather & Climate)
  const createHomeWithClimate = async (data: CreateHomeInput) => {
    let normalizedAddress = data.address;
    if (normalizedAddress && typeof normalizedAddress === "string" && normalizedAddress.includes(",")) {
      normalizedAddress = normalizedAddress.split(",")[0].trim();
    }
    let normalizedState = data.state;
    if (normalizedState && typeof normalizedState === "string") {
      normalizedState = normalizedState.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    }
    let normalizedZipCode = data.zipCode;
    if (normalizedZipCode && typeof normalizedZipCode === "string") {
      normalizedZipCode = normalizedZipCode.trim().replace(/[^\d-]/g, "");
      if (normalizedZipCode.length === 9 && !normalizedZipCode.includes("-")) {
        normalizedZipCode = `${normalizedZipCode.slice(0, 5)}-${normalizedZipCode.slice(5)}`;
      }
      if (normalizedZipCode.length > 5 && !normalizedZipCode.includes("-")) {
        normalizedZipCode = normalizedZipCode.slice(0, 5);
      }
    }
    const normalizedData = {
      ...data,
      address: normalizedAddress,
      zipCode: normalizedZipCode,
      state: normalizedState,
      systems: [],
    };
    if (!normalizedState || normalizedState.length !== 2) {
      throw new Error(`State must be exactly 2 characters. Received: "${normalizedState}"`);
    }
    if (!normalizedZipCode || !/^\d{5}(-\d{4})?$/.test(normalizedZipCode)) {
      throw new Error(`Invalid ZIP code format. Expected: 12345 or 12345-6789. Received: "${normalizedZipCode}"`);
    }
    const response = await fetch("/api/homes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizedData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || errorData.error || "Failed to create home";
      const errorDetails = errorData.details
        ? Array.isArray(errorData.details)
          ? errorData.details.map((d: { field?: string; message?: string; received?: unknown }) => `${d.field}: ${d.message}`).join("\n")
          : errorData.details
        : "";
      throw new Error(errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage);
    }
    const result = await response.json();
    setHomeId(result.home.id);
  };

  // Step 2: Submit weather/climate and create home, then go to Systems (optional)
  const onSubmitStep2Weather = async (data: CreateHomeInput) => {
    setIsSubmitting(true);
    try {
      await createHomeWithClimate(data);
      setStep(3);
    } catch (error) {
      console.error("Error creating home:", error);
      alert(error instanceof Error ? error.message : "Failed to create home");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Add systems (optional, can skip)
  const onSubmitStep3Systems = async () => {
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

        // Auto-populate systems from property data (when enrichment returns heatingType, coolingType, roofType, etc.)
        const yearBuilt = data.yearBuilt || form.getValues("yearBuilt");
        const autoSystems = generateSystemsFromPropertyData(data, yearBuilt);
        
        if (autoSystems.length > 0) {
          const currentSystems = form.getValues("systems") || [];
          const existingSystemTypes = new Set(currentSystems.map((s: any) => s.systemType));
          const newSystems = autoSystems.filter(s => !existingSystemTypes.has(s.systemType));
          
          if (newSystems.length > 0) {
            const merged = [...currentSystems, ...newSystems] as CreateHomeInput["systems"];
            form.setValue("systems", merged);
            setSelectedSystemTypes(merged.map((s: { systemType: string }) => s.systemType));
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
          alert("Property lookup API is not configured. Please enter property details manually.\n\nTo enable automatic lookup:\n• Local: add RAPIDAPI_KEY to .env\n• Vercel: add RAPIDAPI_KEY in Project → Settings → Environment Variables (Production + Preview), then redeploy.");
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

  // Auto-fetch climate data when address is complete (step 1) or when entering step 2
  useEffect(() => {
    if (canLookup && !climateData && !isLookingUpClimate) {
      lookupClimateData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLookup, step]);

  // When Zillow lookup succeeds, open "More options" so the user sees results without scrolling
  useEffect(() => {
    if (lookupStatus === "success") setStep1AccordionOpen("more");
  }, [lookupStatus]);

  // Reset lookup status when address changes so we can auto re-fetch if they edit (stable deps to avoid array-size warning)
  const addressKey = `${address ?? ""}|${city ?? ""}|${state ?? ""}|${zipCode ?? ""}`;
  useEffect(() => {
    setLookupStatus((prev) => (prev !== "idle" ? "idle" : prev));
  }, [addressKey]);

  // Auto-run property lookup when address is complete (no button click required) (stable deps)
  const propertyLookupTrigger = `${step}-${!!canLookup}-${lookupStatus}-${isLookingUp}`;
  useEffect(() => {
    if (step !== 1 || !canLookup || isLookingUp) return;
    if (lookupStatus !== "idle" && lookupStatus !== "not-found" && lookupStatus !== "error") return;
    const t = setTimeout(() => {
      lookupProperty();
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyLookupTrigger]);

  const step1HasResults = step === 1 && lookupStatus === "success";
  const step3WizardActive = step === 3 && inStep3Wizard;
  return (
    <div
      className={
        step3WizardActive
          ? "mx-auto flex h-[calc(100vh-14rem)] max-h-[calc(100vh-14rem)] max-w-2xl flex-col"
          : step === 1 && !step1HasResults
            ? "mx-auto flex h-[calc(100vh-14rem)] max-h-[calc(100vh-14rem)] max-w-2xl flex-col"
            : "mx-auto max-w-2xl"
      }
    >
      <Card
        className={
          step3WizardActive
            ? "flex flex-1 flex-col min-h-0"
            : step === 1 && !step1HasResults
              ? "flex flex-1 flex-col min-h-0"
              : undefined
        }
      >
        <CardHeader className={step === 1 || step === 3 ? "shrink-0" : undefined}>
          <CardTitle>Welcome! Let's set up your home</CardTitle>
          <CardDescription>
            {step === 1
              ? "Tell us about your home so we can create a personalized maintenance schedule."
              : step === 2
                ? "Weather and climate help us tailor tasks to your area."
                : "Add your home systems (optional). You can skip this step and add systems later."}
          </CardDescription>
          {/* Step indicator: even layout, completed steps show checkmark */}
          <div className="flex items-center w-full mt-5">
            {/* Step 1 */}
            <div className="flex flex-1 items-center min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    step > 1
                      ? "bg-primary text-primary-foreground"
                      : step === 1
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-semibold">1</span>}
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${step >= 1 ? "text-foreground" : "text-muted-foreground"}`}>
                  Basic Info
                </span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 min-w-[12px] transition-colors ${step > 1 ? "bg-primary" : "bg-muted"}`} />
            </div>
            {/* Step 2 */}
            <div className="flex flex-1 items-center min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    step > 2
                      ? "bg-primary text-primary-foreground"
                      : step === 2
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > 2 ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-semibold">2</span>}
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${step >= 2 ? "text-foreground" : "text-muted-foreground"}`}>
                  Weather
                </span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 min-w-[12px] transition-colors ${step > 2 ? "bg-primary" : "bg-muted"}`} />
            </div>
            {/* Step 3 */}
            <div className="flex flex-1 items-center min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    step === 3
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="text-sm font-semibold">3</span>
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${step >= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                  Systems (optional)
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent
          className={
            step3WizardActive
              ? "flex flex-1 flex-col min-h-0 overflow-hidden p-6"
              : step === 3
                ? "p-6"
                : step === 1 && !step1HasResults
                  ? "flex flex-1 flex-col min-h-0 overflow-hidden p-6"
                  : step === 1
                    ? "p-6"
                    : undefined
          }
        >
          <Form {...form}>
            {step === 1 ? (
              <form
                onSubmit={form.handleSubmit(onSubmitStep1)}
                className={step1HasResults ? "space-y-4" : "flex min-h-0 flex-1 flex-col"}
              >
              <div
                className={
                  step1HasResults
                    ? "-mx-1 px-1 space-y-3"
                    : "min-h-0 flex-1 overflow-y-auto -mx-1 px-1 space-y-3"
                }
              >
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Home Address</h3>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Street Address</FormLabel>
                        <FormControl>
                          <AddressAutocomplete
                            value={field.value}
                            onChange={(address, components) => {
                              const streetAddress = components.address || address.split(",")[0].trim();
                              field.onChange(streetAddress);
                              form.setValue("city", components.city);
                              form.setValue("state", components.state);
                              form.setValue("zipCode", components.zipCode);
                            }}
                            placeholder="Start typing your address..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">City</FormLabel>
                          <FormControl>
                            <Input className="h-9" placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">State</FormLabel>
                          <FormControl>
                            <Input
                              className="h-9 w-14"
                              placeholder="CA"
                              maxLength={2}
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">ZIP</FormLabel>
                          <FormControl>
                            <Input className="h-9" placeholder="12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={lookupProperty}
                    disabled={!canLookup || isLookingUp}
                    className="w-full h-9"
                  >
                    {isLookingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    {isLookingUp ? "Looking up..." : "Auto-fill from Zillow/Redfin"}
                  </Button>
                  {lookupStatus === "success" && (
                    <Alert className="border-green-200 bg-green-50 py-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 text-xs">Property found and auto-filled. Review in More options if needed.</AlertDescription>
                    </Alert>
                  )}
                  {lookupStatus === "not-found" && (
                    <Alert className="border-yellow-200 bg-yellow-50 py-2">
                      <XCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800 text-xs">Not found online. Enter details below.</AlertDescription>
                    </Alert>
                  )}
                  {lookupStatus === "error" && (
                    <Alert className="border-red-200 bg-red-50 py-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-xs">Lookup error. Enter details manually.</AlertDescription>
                    </Alert>
                  )}
                </div>

              {/* Property Summary Card - Show enriched data */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="yearBuilt"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Year Built</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="h-9"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Home Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HOME_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  value={step1AccordionOpen}
                  onValueChange={setStep1AccordionOpen}
                >
                  <AccordionItem value="more" className="border rounded-lg">
                    <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                      More options (square footage, lot size)
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 pt-0 space-y-3">
                      {enrichedPropertyData && lookupStatus === "success" && (
                        <PropertySummaryCard data={enrichedPropertyData} />
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="squareFootage"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Square Footage</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="h-9"
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
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
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs">Lot Size (acres)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-9"
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="shrink-0 pt-4 border-t mt-3">
                <Button type="submit" className="w-full h-9" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Continue to Weather & Climate"}
                </Button>
              </div>
            </form>
            ) : step === 2 ? (
              /* Step 2: Weather & Climate (required) */
              <form onSubmit={form.handleSubmit(onSubmitStep2Weather)} className="space-y-6">
                <p className="text-xs text-muted-foreground">
                  Weather and climate help us tailor maintenance tasks to your area (e.g. storm prep, freeze alerts).
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Climate & Storm</h3>
                    {isLookingUpClimate && <Loader2 className="h-3 w-3 animate-spin" />}
                    {climateData && (
                      <Badge variant="outline" className="text-green-600 text-xs">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Auto-filled from ZIP
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="stormFrequency"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Storm Frequency</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="severe">Severe</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="windZone"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Wind Zone</FormLabel>
                          <FormControl>
                            <Input className="h-9" placeholder="e.g. Zone 1" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="averageRainfall"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Rainfall (in/yr)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              className="h-9"
                              placeholder="40"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="averageSnowfall"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">Snowfall (in/yr)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              className="h-9"
                              placeholder="30"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Continue to Systems (Optional)"}
                  </Button>
                </div>
              </form>
            ) : step === 3 && !inStep3Wizard ? (
              /* Step 3a: System Selection (optional) - compact grid to avoid scroll */
              <div className="flex flex-col min-h-0">
                <div className="space-y-2">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Add systems & appliances (optional)</h3>
                    <FormDescription className="text-xs">
                      You can finish now and get to your dashboard right away, or add systems below to get tailored maintenance tasks. You can add or change systems anytime later.
                    </FormDescription>
                  </div>

                  {selectedSystemTypes.length === 0 && (
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 py-2.5">
                      <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Two options:</strong> Click &quot;Finish & go to dashboard&quot; to create your home and see tasks now—no systems required. Or select any systems below, then continue to add details (or skip that step). Either way, you&apos;re done in one click.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
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
                          <CardContent className="py-2 px-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  handleSystemSelection(type, checked as boolean)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 shrink-0"
                              />
                              <label className="text-xs font-medium cursor-pointer truncate">
                                {displayName}
                              </label>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 Actions - always visible below the grid */}
                <div className="mt-4 pt-3 border-t flex gap-3 shrink-0">
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
                    variant={selectedSystemTypes.length === 0 ? "default" : "outline"}
                    onClick={onSubmitStep3Systems}
                    disabled={isAddingSystems}
                    className="flex-1"
                  >
                    {isAddingSystems ? "Finishing…" : "Finish & go to dashboard"}
                  </Button>
                  <Button
                    type="button"
                    variant={selectedSystemTypes.length > 0 ? "default" : "outline"}
                    onClick={() => {
                      if (selectedSystemTypes.length > 0) {
                        setInStep3Wizard(true);
                      } else {
                        onSubmitStep3Systems();
                      }
                    }}
                    disabled={selectedSystemTypes.length === 0}
                    className="flex-1"
                  >
                    {selectedSystemTypes.length > 0 ? "Add details for selected" : "Add details"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Step 3b: System Details (wizard - one system at a time) */
              (() => {
                const totalSystems = systems?.length || 0;
                const index = Math.min(currentSystemIndex, Math.max(0, totalSystems - 1));
                const isFirst = index <= 0;
                const isLast = totalSystems <= 1 || index >= totalSystems - 1;
                const progressPct = totalSystems > 0 ? ((index + 1) / totalSystems) * 100 : 0;
                return (
              <div
                className="flex min-h-0 flex-1 flex-col"
                data-testid="system-details-wizard"
              >
                {/* Compact progress: single row + bar + dots */}
                {totalSystems > 0 && (
                  <div
                    className="shrink-0 space-y-1.5 pb-3"
                    data-testid="wizard-progress"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="text-sm font-medium text-muted-foreground shrink-0"
                        data-testid="wizard-system-count"
                      >
                        System {index + 1} of {totalSystems}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-0">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {Array.from({ length: totalSystems }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCurrentSystemIndex(i)}
                            className={`h-1.5 rounded-full transition-all ${
                              i === index ? "w-4 bg-primary" : i < index ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
                            }`}
                            aria-label={`Go to system ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {index === 0
                        ? "Add as much detail as you like, then continue."
                        : `${index} of ${totalSystems} completed — ${totalSystems - index} to go.`}
                    </p>
                  </div>
                )}

                {/* Scrollable form body — fits viewport; only this area scrolls if needed */}
                <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
                  {totalSystems > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Add details for this system. Use AI photo analysis to auto-fill, or enter manually. You can skip optional fields.
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium">
                          {systems[index]?.systemType
                            ?.split("_")
                            .map(
                              (word) =>
                                word.charAt(0) + word.slice(1).toLowerCase()
                            )
                            .join(" ") || `System ${index + 1}`}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => {
                            removeSystem(index);
                            const systemType = systems[index]?.systemType;
                            if (systemType) {
                              setSelectedSystemTypes(
                                selectedSystemTypes.filter((t) => t !== systemType)
                              );
                            }
                            setCurrentSystemIndex((i) =>
                              Math.max(0, Math.min(i, totalSystems - 2))
                            );
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Top row: System type, Brand, Model — always visible */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name={`systems.${index}.systemType`}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs">System Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9">
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
                        <FormField
                          control={form.control}
                          name={`systems.${index}.brand`}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs">Brand</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9"
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Optional"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`systems.${index}.model`}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs">Model</FormLabel>
                              <FormControl>
                                <Input
                                  className="h-9"
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Optional"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Condition — single row */}
                      <FormField
                        control={form.control}
                        name={`systems.${index}.condition`}
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs">Condition</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Optional" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="excellent">Excellent</SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="fair">Fair</SelectItem>
                                <SelectItem value="poor">Poor</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Optional details in accordion — keeps main view short */}
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="photo" className="border rounded-lg">
                          <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                            <span className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              AI Photo Analysis
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3 pt-0">
                            <FormDescription className="mb-2 text-xs">
                              Upload a photo to auto-fill brand, model, and condition.
                            </FormDescription>
                            <SystemPhotoUpload
                              onAnalysisComplete={(analysis) =>
                                handlePhotoAnalysis(index, analysis)
                              }
                              systemTypeHint={systems[index]?.systemType}
                            />
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="more" className="border rounded-lg">
                          <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                            More options (material, dates, notes)
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3 pt-0 space-y-3">
                            {(systems[index]?.systemType === "PLUMBING" ||
                              systems[index]?.systemType === "ROOF" ||
                              systems[index]?.systemType === "ELECTRICAL") && (
                              <FormField
                                control={form.control}
                                name={`systems.${index}.material`}
                                render={({ field }) => (
                                  <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs">Material</FormLabel>
                                    <FormControl>
                                      <Input
                                        className="h-9"
                                        placeholder={
                                          systems[index]?.systemType === "PLUMBING"
                                            ? "Copper, PVC, PEX"
                                            : systems[index]?.systemType === "ROOF"
                                              ? "Asphalt, Metal, Tile"
                                              : "Aluminum, Copper"
                                        }
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            {(systems[index]?.systemType === "ELECTRICAL" ||
                              systems[index]?.systemType === "WATER_HEATER") && (
                              <FormField
                                control={form.control}
                                name={`systems.${index}.capacity`}
                                render={({ field }) => (
                                  <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs">Capacity</FormLabel>
                                    <FormControl>
                                      <Input
                                        className="h-9"
                                        placeholder={
                                          systems[index]?.systemType === "ELECTRICAL"
                                            ? "200A"
                                            : "50 gal"
                                        }
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            {systems[index]?.systemType === "ROOF" && (
                              <FormField
                                control={form.control}
                                name={`systems.${index}.stormResistance`}
                                render={({ field }) => (
                                  <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs">Storm Resistance</FormLabel>
                                    <FormControl>
                                      <Input
                                        className="h-9"
                                        placeholder="e.g., Wind-rated, Hail-resistant"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name={`systems.${index}.installDate`}
                                render={({ field }) => (
                                  <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs">Install Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        className="h-9"
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
                                  <FormItem className="space-y-1.5">
                                    <FormLabel className="text-xs">Lifespan (yr)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        className="h-9"
                                        {...field}
                                        placeholder="Optional"
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
                                <FormItem className="space-y-1.5">
                                  <FormLabel className="text-xs">Notes</FormLabel>
                                  <FormControl>
                                    <Input
                                      className="h-9"
                                      {...field}
                                      value={field.value || ""}
                                      placeholder="Optional"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </div>

                {/* Sticky actions — always visible at bottom */}
                <div className="shrink-0 flex gap-3 pt-4 border-t mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (isFirst) setInStep3Wizard(false);
                      else setCurrentSystemIndex((i) => i - 1);
                    }}
                    className="flex-1 h-9"
                  >
                    {isFirst ? "Back" : "Previous system"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSubmitStep3Systems}
                    disabled={isAddingSystems}
                    className="flex-1 h-9"
                  >
                    Skip all
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (isLast) onSubmitStep3Systems();
                      else setCurrentSystemIndex((i) => i + 1);
                    }}
                    disabled={isAddingSystems || totalSystems === 0}
                    className="flex-1 h-9"
                  >
                    {isAddingSystems
                      ? "Adding..."
                      : isLast
                        ? "Add Systems & Finish"
                        : "Next system"}
                  </Button>
                </div>
              </div>
                );
              })()
            )}
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

