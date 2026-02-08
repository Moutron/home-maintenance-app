"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Home as HomeIcon, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Home = {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  yearBuilt: number;
  squareFootage: number | null;
  lotSize: number | null;
  homeType: string;
  climateZone: string | null;
  systems: {
    id: string;
    systemType: string;
    brand: string | null;
    model: string | null;
    installDate: string | null;
  }[];
};

export default function HomesPage() {
  const router = useRouter();
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTasksFor, setGeneratingTasksFor] = useState<string | null>(null);

  useEffect(() => {
    fetchHomes();
  }, []);

  const fetchHomes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/homes");
      if (response.ok) {
        const data = await response.json();
        setHomes(data.homes || []);
      }
    } catch (error) {
      console.error("Error fetching homes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateTasks = async (homeId: string) => {
    setGeneratingTasksFor(homeId);
    try {
      const response = await fetch("/api/tasks/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ homeId }),
      });

      if (response.ok) {
        const result = await response.json();
        const message = result.message || `Successfully generated ${result.tasks?.length || 0} tasks!`;
        alert(message);
        router.push("/tasks");
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const text = await response.text();
          console.error("Failed to parse error response. Status:", response.status, "Body:", text);
          alert(`Error ${response.status}: Failed to generate tasks. Check console for details.`);
          return;
        }
        
        const errorMessage = errorData.message || errorData.error || "Failed to generate tasks";
        const errorDetails = errorData.details 
          ? (typeof errorData.details === 'string' 
              ? errorData.details 
              : JSON.stringify(errorData.details, null, 2))
          : "";
        
        console.error("Task generation error:", errorData);
        console.error("Full error response:", JSON.stringify(errorData, null, 2));
        
        alert(
          errorDetails 
            ? `${errorMessage}\n\nDetails:\n${errorDetails.substring(0, 500)}${errorDetails.length > 500 ? '...' : ''}`
            : errorMessage
        );
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate tasks";
      alert(`Error: ${errorMessage}\n\nCheck the browser console (F12) for more details.`);
    } finally {
      setGeneratingTasksFor(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading homes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Homes</h1>
          <p className="text-muted-foreground">
            Manage your homes and their systems
          </p>
        </div>
        <Button onClick={() => router.push("/onboarding")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Home
        </Button>
      </div>

      {homes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HomeIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No homes yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first home to get started with personalized maintenance
              schedules.
            </p>
            <Button onClick={() => router.push("/onboarding")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Home
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {homes.map((home) => (
            <Card key={home.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{home.address}</CardTitle>
                    <CardDescription>
                      {home.city}, {home.state} {home.zipCode}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{home.homeType}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Year Built:</span>
                      <p className="font-medium">{home.yearBuilt}</p>
                    </div>
                    {home.squareFootage && (
                      <div>
                        <span className="text-muted-foreground">
                          Square Feet:
                        </span>
                        <p className="font-medium">
                          {home.squareFootage.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {home.lotSize && (
                      <div>
                        <span className="text-muted-foreground">Lot Size:</span>
                        <p className="font-medium">
                          {home.lotSize} acres
                        </p>
                      </div>
                    )}
                    {home.climateZone && (
                      <div>
                        <span className="text-muted-foreground">
                          Climate Zone:
                        </span>
                        <p className="font-medium">{home.climateZone}</p>
                      </div>
                    )}
                  </div>

                  {home.systems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Systems ({home.systems.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {home.systems.map((system) => (
                          <Badge key={system.id} variant="secondary">
                            {system.systemType}
                            {system.brand && ` - ${system.brand}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => generateTasks(home.id)}
                      disabled={generatingTasksFor === home.id}
                    >
                      {generatingTasksFor === home.id ? "Generating..." : "Generate Tasks"}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{home.address}</DialogTitle>
                          <DialogDescription>
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-sm text-muted-foreground">
                                    Address:
                                  </span>
                                  <p className="font-medium">
                                    {home.address}, {home.city}, {home.state}{" "}
                                    {home.zipCode}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">
                                    Year Built:
                                  </span>
                                  <p className="font-medium">{home.yearBuilt}</p>
                                </div>
                                <div>
                                  <span className="text-sm text-muted-foreground">
                                    Home Type:
                                  </span>
                                  <p className="font-medium">{home.homeType}</p>
                                </div>
                                {home.squareFootage && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">
                                      Square Footage:
                                    </span>
                                    <p className="font-medium">
                                      {home.squareFootage.toLocaleString()} sq ft
                                    </p>
                                  </div>
                                )}
                                {home.lotSize && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">
                                      Lot Size:
                                    </span>
                                    <p className="font-medium">
                                      {home.lotSize} acres
                                    </p>
                                  </div>
                                )}
                                {home.climateZone && (
                                  <div>
                                    <span className="text-sm text-muted-foreground">
                                      Climate Zone:
                                    </span>
                                    <p className="font-medium">
                                      {home.climateZone}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {home.systems.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">
                                    Systems & Appliances
                                  </h4>
                                  <div className="space-y-2">
                                    {home.systems.map((system) => (
                                      <div
                                        key={system.id}
                                        className="border rounded-lg p-3"
                                      >
                                        <div className="font-medium">
                                          {system.systemType}
                                        </div>
                                        {(system.brand || system.model) && (
                                          <div className="text-sm text-muted-foreground">
                                            {system.brand && (
                                              <span>Brand: {system.brand}</span>
                                            )}
                                            {system.brand && system.model && (
                                              <span> • </span>
                                            )}
                                            {system.model && (
                                              <span>Model: {system.model}</span>
                                            )}
                                          </div>
                                        )}
                                        {system.installDate && (
                                          <div className="text-sm text-muted-foreground">
                                            Installed:{" "}
                                            {new Date(
                                              system.installDate
                                            ).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

