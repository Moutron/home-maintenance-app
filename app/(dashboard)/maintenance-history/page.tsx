"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { CalendarIcon, Home, Filter, Image as ImageIcon, FileText, DollarSign } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PhotoUpload } from "@/components/photo-upload";

type MaintenanceHistory = {
  id: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  cost: number | null;
  contractorName: string | null;
  contractorPhone: string | null;
  photos: string[];
  receipts: string[];
  warrantyInfo: string | null;
  notes: string | null;
  nextServiceDue: string | null;
  appliance: {
    id: string;
    applianceType: string;
    brand: string | null;
    model: string | null;
  } | null;
  exteriorFeature: {
    id: string;
    featureType: string;
    material: string | null;
  } | null;
  interiorFeature: {
    id: string;
    featureType: string;
    material: string | null;
    room: string | null;
  } | null;
  home: {
    id: string;
    address: string;
    city: string;
    state: string;
  };
};

export default function MaintenanceHistoryPage() {
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHomeId, setFilterHomeId] = useState<string>("all");
  const [filterServiceType, setFilterServiceType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceHistory | null>(null);

  useEffect(() => {
    fetchHistory();
    fetchHomes();
  }, [filterHomeId, filterServiceType, filterDateFrom, filterDateTo]);

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes");
      if (response.ok) {
        const data = await response.json();
        setHomes(data.homes || []);
      }
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterHomeId !== "all") {
        params.append("homeId", filterHomeId);
      }

      const response = await fetch(`/api/maintenance/history?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let filteredHistory = data.history || [];

        // Filter by service type
        if (filterServiceType !== "all") {
          filteredHistory = filteredHistory.filter(
            (h: MaintenanceHistory) => h.serviceType === filterServiceType
          );
        }

        // Filter by date range
        if (filterDateFrom) {
          filteredHistory = filteredHistory.filter(
            (h: MaintenanceHistory) => new Date(h.serviceDate) >= filterDateFrom!
          );
        }
        if (filterDateTo) {
          filteredHistory = filteredHistory.filter(
            (h: MaintenanceHistory) => new Date(h.serviceDate) <= filterDateTo!
          );
        }

        setHistory(filteredHistory);
      }
    } catch (error) {
      console.error("Error fetching maintenance history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      maintenance: "bg-blue-100 text-blue-800",
      repair: "bg-yellow-100 text-yellow-800",
      replacement: "bg-red-100 text-red-800",
      inspection: "bg-green-100 text-green-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getItemName = (record: MaintenanceHistory) => {
    if (record.appliance) {
      return `${record.appliance.applianceType}${record.appliance.brand ? ` (${record.appliance.brand})` : ""}`;
    }
    if (record.exteriorFeature) {
      return `${record.exteriorFeature.featureType}${record.exteriorFeature.material ? ` (${record.exteriorFeature.material})` : ""}`;
    }
    if (record.interiorFeature) {
      return `${record.interiorFeature.featureType}${record.interiorFeature.room ? ` - ${record.interiorFeature.room}` : ""}`;
    }
    return "General";
  };

  const totalCost = history.reduce((sum, record) => sum + (record.cost || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading maintenance history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance History</h1>
          <p className="text-muted-foreground">
            Track all your home maintenance, repairs, and inspections
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <CalendarIcon className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Maintenance Record</DialogTitle>
              <DialogDescription>
                Record a maintenance, repair, replacement, or inspection
              </DialogDescription>
            </DialogHeader>
            <AddMaintenanceRecordForm
              homes={homes}
              onSuccess={() => {
                fetchHistory();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Records</CardDescription>
            <CardTitle className="text-2xl">{history.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent</CardDescription>
            <CardTitle className="text-2xl">
              ${totalCost.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This Year</CardDescription>
            <CardTitle className="text-2xl">
              {
                history.filter(
                  (h) =>
                    new Date(h.serviceDate).getFullYear() ===
                    new Date().getFullYear()
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Cost</CardDescription>
            <CardTitle className="text-2xl">
              $
              {history.length > 0
                ? Math.round(totalCost / history.length).toLocaleString()
                : "0"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Home</Label>
              <Select value={filterHomeId} onValueChange={setFilterHomeId}>
                <SelectTrigger>
                  <SelectValue placeholder="All homes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All homes</SelectItem>
                  {homes.map((home) => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.address}, {home.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Type</Label>
              <Select
                value={filterServiceType}
                onValueChange={setFilterServiceType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filterDateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDateFrom ? (
                      format(filterDateFrom, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterDateFrom}
                    onSelect={setFilterDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filterDateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDateTo ? (
                      format(filterDateTo, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterDateTo}
                    onSelect={setFilterDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Timeline */}
      {history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No maintenance records found. Add your first record to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {getItemName(record)}
                      </CardTitle>
                      <Badge className={getServiceTypeColor(record.serviceType)}>
                        {record.serviceType}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {record.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">
                        {format(new Date(record.serviceDate), "PPP")}
                      </span>
                    </div>
                    {record.cost && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium">
                          ${record.cost.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {record.contractorName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Contractor:</span>
                        <span className="font-medium">
                          {record.contractorName}
                          {record.contractorPhone && ` (${record.contractorPhone})`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Home:</span>
                      <span className="font-medium">
                        {record.home.address}, {record.home.city}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {record.photos.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Photos:</span>
                        <span className="font-medium">{record.photos.length}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRecord(record)}
                        >
                          View
                        </Button>
                      </div>
                    )}
                    {record.receipts.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Receipts:</span>
                        <span className="font-medium">{record.receipts.length}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            record.receipts.forEach((url) => window.open(url, "_blank"));
                          }}
                        >
                          View
                        </Button>
                      </div>
                    )}
                    {record.warrantyInfo && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Warranty:</span>
                        <span className="ml-2 font-medium">{record.warrantyInfo}</span>
                      </div>
                    )}
                    {record.nextServiceDue && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Next Service Due:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(record.nextServiceDue), "PPP")}
                        </span>
                      </div>
                    )}
                    {record.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1 text-sm">{record.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Gallery Dialog */}
      {selectedRecord && selectedRecord.photos.length > 0 && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Photos</DialogTitle>
              <DialogDescription>
                {getItemName(selectedRecord)} - {format(new Date(selectedRecord.serviceDate), "PPP")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {selectedRecord.photos.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full rounded-lg object-cover"
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddMaintenanceRecordForm({
  homes,
  onSuccess,
}: {
  homes: any[];
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    homeId: "",
    applianceId: "",
    exteriorFeatureId: "",
    interiorFeatureId: "",
    systemId: "",
    serviceDate: new Date().toISOString().split("T")[0],
    serviceType: "maintenance",
    description: "",
    cost: "",
    contractorName: "",
    contractorPhone: "",
    warrantyInfo: "",
    notes: "",
    nextServiceDue: "",
    photos: [] as string[],
    receipts: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/maintenance/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          applianceId: formData.applianceId || null,
          exteriorFeatureId: formData.exteriorFeatureId || null,
          interiorFeatureId: formData.interiorFeatureId || null,
          systemId: formData.systemId || null,
          contractorName: formData.contractorName || null,
          contractorPhone: formData.contractorPhone || null,
          warrantyInfo: formData.warrantyInfo || null,
          notes: formData.notes || null,
          nextServiceDue: formData.nextServiceDue || null,
          photos: formData.photos || [],
          receipts: formData.receipts || [],
        }),
      });

      if (response.ok) {
        onSuccess();
        // Reset form
        setFormData({
          homeId: "",
          applianceId: "",
          exteriorFeatureId: "",
          interiorFeatureId: "",
          systemId: "",
          serviceDate: new Date().toISOString().split("T")[0],
          serviceType: "maintenance",
          description: "",
          cost: "",
          contractorName: "",
          contractorPhone: "",
          warrantyInfo: "",
          notes: "",
          nextServiceDue: "",
          photos: [],
          receipts: [],
        });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create maintenance record");
      }
    } catch (error) {
      console.error("Error creating maintenance record:", error);
      alert("Failed to create maintenance record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="homeId">Home *</Label>
        <Select
          value={formData.homeId}
          onValueChange={(value) => setFormData({ ...formData, homeId: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a home" />
          </SelectTrigger>
          <SelectContent>
            {homes.map((home) => (
              <SelectItem key={home.id} value={home.id}>
                {home.address}, {home.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="serviceDate">Service Date *</Label>
        <Input
          id="serviceDate"
          type="date"
          value={formData.serviceDate}
          onChange={(e) =>
            setFormData({ ...formData, serviceDate: e.target.value })
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="serviceType">Service Type *</Label>
        <Select
          value={formData.serviceType}
          onValueChange={(value) =>
            setFormData({ ...formData, serviceType: value })
          }
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="repair">Repair</SelectItem>
            <SelectItem value="replacement">Replacement</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cost">Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) =>
              setFormData({ ...formData, cost: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="nextServiceDue">Next Service Due</Label>
          <Input
            id="nextServiceDue"
            type="date"
            value={formData.nextServiceDue}
            onChange={(e) =>
              setFormData({ ...formData, nextServiceDue: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contractorName">Contractor Name</Label>
          <Input
            id="contractorName"
            value={formData.contractorName}
            onChange={(e) =>
              setFormData({ ...formData, contractorName: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="contractorPhone">Contractor Phone</Label>
          <Input
            id="contractorPhone"
            value={formData.contractorPhone}
            onChange={(e) =>
              setFormData({ ...formData, contractorPhone: e.target.value })
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="warrantyInfo">Warranty Information</Label>
        <Input
          id="warrantyInfo"
          value={formData.warrantyInfo}
          onChange={(e) =>
            setFormData({ ...formData, warrantyInfo: e.target.value })
          }
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Photos</Label>
        <PhotoUpload
          onUploadComplete={(urls) => {
            setFormData({ ...formData, photos: urls });
          }}
          existingUrls={formData.photos}
          maxFiles={10}
          accept="image/*"
          label="Upload Photos"
        />
      </div>

      <div>
        <Label>Receipts</Label>
        <PhotoUpload
          onUploadComplete={(urls) => {
            setFormData({ ...formData, receipts: urls });
          }}
          existingUrls={formData.receipts}
          maxFiles={5}
          accept="image/*,application/pdf"
          label="Upload Receipts"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Record"}
      </Button>
    </form>
  );
}

