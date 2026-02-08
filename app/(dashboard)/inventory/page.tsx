"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applianceSchema,
  exteriorFeatureSchema,
  interiorFeatureSchema,
  ApplianceTypeEnum,
  ExteriorFeatureTypeEnum,
  InteriorFeatureTypeEnum,
} from "@/lib/validations/inventory";
import { z } from "zod";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Home, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const APPLIANCE_TYPES = [
  "REFRIGERATOR",
  "DISHWASHER",
  "WASHER",
  "DRYER",
  "OVEN",
  "RANGE",
  "MICROWAVE",
  "GARBAGE_DISPOSAL",
  "GARBAGE_COMPACTOR",
  "ICE_MAKER",
  "WINE_COOLER",
  "OTHER",
] as const;

const EXTERIOR_FEATURE_TYPES = [
  "DECK",
  "FENCE",
  "POOL",
  "SPRINKLER_SYSTEM",
  "DRIVEWAY",
  "PATIO",
  "SIDING",
  "GUTTERS",
  "WINDOWS",
  "DOORS",
  "GARAGE_DOOR",
  "FOUNDATION",
  "OTHER",
] as const;

const INTERIOR_FEATURE_TYPES = [
  "CARPET",
  "HARDWOOD_FLOOR",
  "TILE_FLOOR",
  "LAMINATE_FLOOR",
  "VINYL_FLOOR",
  "WINDOWS",
  "DOORS",
  "CABINETS",
  "COUNTERTOPS",
  "PAINT",
  "WALLPAPER",
  "OTHER",
] as const;

// Form schema that accepts strings for dates (react-hook-form works with strings)
const applianceFormSchema = z.object({
  applianceType: ApplianceTypeEnum,
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  installDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  expectedLifespan: z.number().int().positive().optional(),
  lastServiceDate: z.string().optional(),
  usageFrequency: z.enum(["daily", "weekly", "monthly", "occasional"]).optional(),
  notes: z.string().optional(),
});

const exteriorFeatureFormSchema = z.object({
  featureType: ExteriorFeatureTypeEnum,
  material: z.string().optional(),
  brand: z.string().optional(),
  installDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  expectedLifespan: z.number().int().positive().optional(),
  lastServiceDate: z.string().optional(),
  squareFootage: z.number().positive().optional(),
  notes: z.string().optional(),
});

const interiorFeatureFormSchema = z.object({
  featureType: InteriorFeatureTypeEnum,
  material: z.string().optional(),
  brand: z.string().optional(),
  installDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  expectedLifespan: z.number().int().positive().optional(),
  lastServiceDate: z.string().optional(),
  squareFootage: z.number().positive().optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
});

const inventoryFormSchema = z.object({
  appliances: z.array(applianceFormSchema),
  exteriorFeatures: z.array(exteriorFeatureFormSchema),
  interiorFeatures: z.array(interiorFeatureFormSchema),
});

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

export default function InventoryPage() {
  const router = useRouter();
  const [homes, setHomes] = useState<any[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("appliances");

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      appliances: [],
      exteriorFeatures: [],
      interiorFeatures: [],
    },
  });

  useEffect(() => {
    fetchHomes();
  }, []);

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes");
      if (response.ok) {
        const data = await response.json();
        setHomes(data.homes || []);
        if (data.homes?.length > 0) {
          setSelectedHomeId(data.homes[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const onSubmit = async (data: InventoryFormData) => {
    if (!selectedHomeId) {
      alert("Please select a home");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeId: selectedHomeId,
          ...data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save inventory");
      }

      alert("Inventory saved successfully!");
      router.push("/homes");
    } catch (error) {
      console.error("Error saving inventory:", error);
      alert(error instanceof Error ? error.message : "Failed to save inventory");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAppliance = () => {
    const current = form.getValues("appliances") || [];
    form.setValue("appliances", [
      ...current,
      {
        applianceType: "REFRIGERATOR",
        brand: "",
        model: "",
        installDate: undefined,
        expectedLifespan: undefined,
        usageFrequency: undefined,
        notes: "",
      },
    ]);
  };

  const removeAppliance = (index: number) => {
    const current = form.getValues("appliances") || [];
    form.setValue(
      "appliances",
      current.filter((_, i) => i !== index)
    );
  };

  const addExteriorFeature = () => {
    const current = form.getValues("exteriorFeatures") || [];
    form.setValue("exteriorFeatures", [
      ...current,
      {
        featureType: "DECK",
        material: "",
        installDate: undefined,
        expectedLifespan: undefined,
        squareFootage: undefined,
        notes: "",
      },
    ]);
  };

  const removeExteriorFeature = (index: number) => {
    const current = form.getValues("exteriorFeatures") || [];
    form.setValue(
      "exteriorFeatures",
      current.filter((_, i) => i !== index)
    );
  };

  const addInteriorFeature = () => {
    const current = form.getValues("interiorFeatures") || [];
    form.setValue("interiorFeatures", [
      ...current,
      {
        featureType: "CARPET",
        material: "",
        installDate: undefined,
        expectedLifespan: undefined,
        squareFootage: undefined,
        room: "",
        notes: "",
      },
    ]);
  };

  const removeInteriorFeature = (index: number) => {
    const current = form.getValues("interiorFeatures") || [];
    form.setValue(
      "interiorFeatures",
      current.filter((_, i) => i !== index)
    );
  };

  const appliances = form.watch("appliances");
  const exteriorFeatures = form.watch("exteriorFeatures");
  const interiorFeatures = form.watch("interiorFeatures");

  if (homes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Home Inventory</h1>
          <p className="text-muted-foreground">
            Add detailed information about your home's appliances and features
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No homes found</h3>
            <p className="text-muted-foreground mb-4">
              Please add a home first before managing inventory.
            </p>
            <Button onClick={() => router.push("/onboarding")}>
              Add Your First Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Home Inventory</h1>
        <p className="text-muted-foreground">
          Add detailed information about your home's appliances and features
          to get personalized maintenance recommendations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Home</CardTitle>
          <CardDescription>
            Choose which home to add inventory for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a home" />
            </SelectTrigger>
            <SelectContent>
              {homes.map((home) => (
                <SelectItem key={home.id} value={home.id}>
                  {home.address}, {home.city}, {home.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appliances">
                Appliances
                {appliances?.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {appliances.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="exterior">
                Exterior Features
                {exteriorFeatures?.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {exteriorFeatures.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="interior">
                Interior Features
                {interiorFeatures?.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {interiorFeatures.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Appliances Tab */}
            <TabsContent value="appliances" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Appliances</h3>
                  <p className="text-sm text-muted-foreground">
                    Add kitchen and laundry appliances
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addAppliance}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Appliance
                </Button>
              </div>

              {appliances?.map((appliance, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Appliance {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAppliance(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormField
                        control={form.control}
                        name={`appliances.${index}.applianceType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Appliance Type</FormLabel>
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
                                {APPLIANCE_TYPES.map((type) => (
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
                          name={`appliances.${index}.brand`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Brand (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`appliances.${index}.model`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`appliances.${index}.installDate`}
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
                          name={`appliances.${index}.expectedLifespan`}
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
                        name={`appliances.${index}.usageFrequency`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usage Frequency (optional)</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="occasional">
                                  Occasional
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Exterior Features Tab */}
            <TabsContent value="exterior" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Exterior Features</h3>
                  <p className="text-sm text-muted-foreground">
                    Add decks, fences, pools, and other exterior features
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addExteriorFeature}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feature
                </Button>
              </div>

              {exteriorFeatures?.map((feature, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Feature {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExteriorFeature(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormField
                        control={form.control}
                        name={`exteriorFeatures.${index}.featureType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Feature Type</FormLabel>
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
                                {EXTERIOR_FEATURE_TYPES.map((type) => (
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
                          name={`exteriorFeatures.${index}.material`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Material (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`exteriorFeatures.${index}.squareFootage`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Square Footage (optional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
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
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`exteriorFeatures.${index}.installDate`}
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
                          name={`exteriorFeatures.${index}.expectedLifespan`}
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Interior Features Tab */}
            <TabsContent value="interior" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Interior Features</h3>
                  <p className="text-sm text-muted-foreground">
                    Add floors, windows, cabinets, and other interior features
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addInteriorFeature}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feature
                </Button>
              </div>

              {interiorFeatures?.map((feature, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">Feature {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInteriorFeature(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormField
                        control={form.control}
                        name={`interiorFeatures.${index}.featureType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Feature Type</FormLabel>
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
                                {INTERIOR_FEATURE_TYPES.map((type) => (
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
                          name={`interiorFeatures.${index}.material`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Material (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`interiorFeatures.${index}.room`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Room (optional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`interiorFeatures.${index}.squareFootage`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Square Footage (optional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
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
                        <FormField
                          control={form.control}
                          name={`interiorFeatures.${index}.installDate`}
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Inventory"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

