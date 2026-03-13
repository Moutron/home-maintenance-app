"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Car, ChevronDownIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import Link from "next/link";
import { COMMON_VEHICLE_MAKES } from "@/lib/vehicles/common-makes";

type Vehicle = {
  id: string;
  nickname: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  currentMileage: number | null;
  purchaseDate: string | null;
};

function vehicleLabel(v: Vehicle) {
  if (v.nickname) return v.nickname;
  return `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`;
}

export default function GaragePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingTasksFor, setGeneratingTasksFor] = useState<string | null>(null);
  const [generatingAiFor, setGeneratingAiFor] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    year: new Date().getFullYear(),
    make: "",
    model: "",
    vin: "",
    currentMileage: "",
    purchaseDate: "",
  });
  const [makes, setMakes] = useState<string[]>(() => [...COMMON_VEHICLE_MAKES]);
  const [models, setModels] = useState<string[]>([]);
  const [makesLoading, setMakesLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [makeOpen, setMakeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchMakes = useCallback(async () => {
    setMakesLoading(true);
    try {
      const res = await fetch("/api/vehicles/makes");
      if (res.ok) {
        const data = await res.json();
        const list = data.makes ?? [];
        if (list.length > 0) setMakes(list);
      }
    } catch (e) {
      console.error("Error fetching makes:", e);
    } finally {
      setMakesLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async (make: string, year?: number) => {
    if (!make.trim()) {
      setModels([]);
      return;
    }
    setModelsLoading(true);
    try {
      const params = new URLSearchParams({ make: make.trim() });
      if (year != null && !Number.isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
        params.set("year", String(year));
      }
      const res = await fetch(`/api/vehicles/models?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.models ?? [];
        setModels(list);
        setForm((prev) => {
          if (prev.model && list.length > 0 && !list.includes(prev.model)) {
            return { ...prev, model: "" };
          }
          return prev;
        });
      } else {
        setModels([]);
      }
    } catch (e) {
      console.error("Error fetching models:", e);
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (addOpen) fetchMakes();
  }, [addOpen, fetchMakes]);

  useEffect(() => {
    if (form.make.trim()) fetchModels(form.make, form.year);
    else setModels([]);
  }, [form.make, form.year, fetchModels]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (e) {
      console.error("Error fetching vehicles:", e);
    } finally {
      setLoading(false);
    }
  };

  const generateTasks = async (vehicleId: string) => {
    setGeneratingTasksFor(vehicleId);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/generate-tasks`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Tasks generated.");
        router.push(`/tasks?vehicleId=${vehicleId}`);
      } else {
        alert(data.error || "Failed to generate tasks.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate tasks.");
    } finally {
      setGeneratingTasksFor(null);
    }
  };

  const generateTasksWithAi = async (vehicleId: string) => {
    setGeneratingAiFor(vehicleId);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/generate-tasks-ai`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(
          (data && data.message) ||
            "Tasks generated from owner's manual schedule."
        );
        router.push(`/tasks?vehicleId=${vehicleId}`);
        return;
      }

      // Non-OK response from AI: fall back to template-based generation
      console.error("AI vehicle task generation error:", data);
      alert(
        (data && data.error) ||
          "AI isn't available right now. We'll use Quick add from templates instead."
      );
      await generateTasks(vehicleId);
    } catch (e) {
      // Network or unexpected error: also fall back to templates
      console.error("Error generating vehicle AI tasks:", e);
      alert(
        "AI isn't available right now. We'll use Quick add from templates instead."
      );
      await generateTasks(vehicleId);
    } finally {
      setGeneratingAiFor(null);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: form.nickname.trim() || undefined,
          year: Number(form.year),
          make: form.make.trim(),
          model: form.model.trim(),
          vin: form.vin.trim() || undefined,
          currentMileage: form.currentMileage ? Number(form.currentMileage) : undefined,
          purchaseDate: form.purchaseDate || undefined,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setForm({
          nickname: "",
          year: new Date().getFullYear(),
          make: "",
          model: "",
          vin: "",
          currentMileage: "",
          purchaseDate: "",
        });
        fetchVehicles();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add vehicle.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to add vehicle.");
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm("Delete this vehicle? Its maintenance tasks will also be removed.")) return;
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, { method: "DELETE" });
      if (res.ok) fetchVehicles();
      else alert("Failed to delete vehicle.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete vehicle.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading vehicles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Garage</h1>
          <p className="text-muted-foreground">
            Add your vehicles and get maintenance tasks, cost estimates, and recommendations
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Vehicle</DialogTitle>
              <DialogDescription>
                Enter your vehicle details to get maintenance schedules and reminders.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddVehicle} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="nickname">Nickname (optional)</Label>
                <Input
                  id="nickname"
                  value={form.nickname}
                  onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                  placeholder="e.g. Daily driver"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear() + 1}
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) || f.year }))}
                    required
                  />
                </div>
                <div>
                  <Label>Make *</Label>
                  <Popover open={makeOpen} onOpenChange={setMakeOpen} modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={makeOpen}
                        className="w-full justify-between font-normal"
                      >
                        {form.make || "Select make..."}
                        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="z-[100] w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <Command shouldFilter={true} className="overflow-visible">
                        <CommandInput placeholder="Search makes..." />
                        <CommandList
                          className="h-[min(280px,45vh)] max-h-[45vh] min-h-[180px] overflow-y-scroll overscroll-contain [touch-action:pan-y]"
                          style={{ WebkitOverflowScrolling: "touch" }}
                        >
                          <CommandEmpty>
                            {makesLoading ? "Loading..." : "No make found."}
                          </CommandEmpty>
                          <CommandGroup className="overflow-visible p-1">
                            {makes.map((name) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => {
                                  setForm((f) => ({ ...f, make: name, model: "" }));
                                  setMakeOpen(false);
                                }}
                              >
                                {name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label>Model *</Label>
                {/* modal={false} + wheel stopPropagation so the list scrolls inside the Add Vehicle dialog instead of the dialog body stealing wheel events */}
                <Popover open={modelOpen} onOpenChange={setModelOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={modelOpen}
                      disabled={!form.make.trim()}
                      className="w-full justify-between font-normal"
                    >
                      {form.model || "Select model..."}
                      <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="z-[100] w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <Command shouldFilter={true} className="overflow-visible">
                      <CommandInput placeholder="Search models..." />
                      <CommandList
                        className="h-[min(280px,45vh)] max-h-[45vh] min-h-[180px] overflow-y-scroll overscroll-contain [touch-action:pan-y]"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        <CommandEmpty>
                          {modelsLoading ? "Loading..." : !form.make ? "Select a make first." : "No model found."}
                        </CommandEmpty>
                        <CommandGroup className="overflow-visible p-1">
                          {models.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={() => {
                                setForm((f) => ({ ...f, model: name }));
                                setModelOpen(false);
                              }}
                            >
                              {name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="vin">VIN (optional)</Label>
                <Input
                  id="vin"
                  value={form.vin}
                  onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value }))}
                  placeholder="17-character VIN"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentMileage">Current mileage (optional)</Label>
                  <Input
                    id="currentMileage"
                    type="number"
                    min={0}
                    value={form.currentMileage}
                    onChange={(e) => setForm((f) => ({ ...f, currentMileage: e.target.value }))}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="purchaseDate">Purchase date (optional)</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Vehicle</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No vehicles yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first vehicle to get maintenance schedules, cost estimates, and DIY tips.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="flex flex-col h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{vehicleLabel(vehicle)}</CardTitle>
                    <CardDescription>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                      {vehicle.currentMileage != null && ` • ${vehicle.currentMileage.toLocaleString()} mi`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Year:</span>
                      <p className="font-medium">{vehicle.year}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Make:</span>
                      <p className="font-medium">{vehicle.make}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <p className="font-medium">{vehicle.model}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mileage:</span>
                      <p className="font-medium">
                        {vehicle.currentMileage != null
                          ? vehicle.currentMileage.toLocaleString() + " mi"
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">VIN:</span>
                      <p className="font-medium">{vehicle.vin ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Purchase date:</span>
                      <p className="font-medium">
                        {vehicle.purchaseDate
                          ? new Date(vehicle.purchaseDate).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional details (nickname, mileage, VIN) can be added when
                    adding or editing the vehicle.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2 border-t pt-6">
                <Button
                  className="w-full"
                  onClick={() => generateTasksWithAi(vehicle.id)}
                  disabled={generatingAiFor === vehicle.id || generatingTasksFor === vehicle.id}
                >
                  {generatingAiFor === vehicle.id ? "Mapping…" : "Map your maintenance"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => generateTasks(vehicle.id)}
                  disabled={generatingTasksFor === vehicle.id || generatingAiFor === vehicle.id}
                >
                  {generatingTasksFor === vehicle.id ? "Generating..." : "From templates"}
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/tasks?vehicleId=${vehicle.id}`}>
                    View tasks
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => handleDelete(vehicle.id)}
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
