"use client";

import { useEffect, useState } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";

type Warranty = {
  id: string;
  type: "appliance" | "exterior" | "interior" | "system";
  name: string;
  brand: string | null;
  model: string | null;
  warrantyExpiry: string | null;
  installDate: string | null;
  home: {
    address: string;
    city: string;
  };
};

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [homes, setHomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterHomeId, setFilterHomeId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchWarranties();
    fetchHomes();
  }, [filterHomeId, filterStatus]);

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

  const fetchWarranties = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/homes");
      if (response.ok) {
        const data = await response.json();
        const allHomes = data.homes || [];

        // Filter by home if needed
        const filteredHomes =
          filterHomeId === "all"
            ? allHomes
            : allHomes.filter((h: any) => h.id === filterHomeId);

        // Collect all warranties from appliances, features, and systems
        const allWarranties: Warranty[] = [];

        for (const home of filteredHomes) {
          // Fetch full home data with relations
          try {
            const homeResponse = await fetch(`/api/homes/${home.id}`);
            if (homeResponse.ok) {
              const homeData = await homeResponse.json();
              const homeDetails = homeData.home;

              // Add appliances with warranties
              if (homeDetails.appliances) {
                homeDetails.appliances.forEach((appliance: any) => {
                  if (appliance.warrantyExpiry) {
                    allWarranties.push({
                      id: appliance.id,
                      type: "appliance",
                      name: appliance.applianceType,
                      brand: appliance.brand,
                      model: appliance.model,
                      warrantyExpiry: appliance.warrantyExpiry,
                      installDate: appliance.installDate,
                      home: {
                        address: homeDetails.address,
                        city: homeDetails.city,
                      },
                    });
                  }
                });
              }

              // Add exterior features with warranties
              if (homeDetails.exteriorFeatures) {
                homeDetails.exteriorFeatures.forEach((feature: any) => {
                  if (feature.warrantyExpiry) {
                    allWarranties.push({
                      id: feature.id,
                      type: "exterior",
                      name: feature.featureType,
                      brand: feature.brand,
                      model: null,
                      warrantyExpiry: feature.warrantyExpiry,
                      installDate: feature.installDate,
                      home: {
                        address: homeDetails.address,
                        city: homeDetails.city,
                      },
                    });
                  }
                });
              }

              // Add interior features with warranties
              if (homeDetails.interiorFeatures) {
                homeDetails.interiorFeatures.forEach((feature: any) => {
                  if (feature.warrantyExpiry) {
                    allWarranties.push({
                      id: feature.id,
                      type: "interior",
                      name: feature.featureType,
                      brand: feature.brand,
                      model: null,
                      warrantyExpiry: feature.warrantyExpiry,
                      installDate: feature.installDate,
                      home: {
                        address: homeDetails.address,
                        city: homeDetails.city,
                      },
                    });
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching home ${home.id}:`, error);
          }
        }

        // Filter by status
        let filtered = allWarranties;
        if (filterStatus === "expiring") {
          const thirtyDaysFromNow = addDays(new Date(), 30);
          filtered = allWarranties.filter((w) => {
            if (!w.warrantyExpiry) return false;
            const expiry = new Date(w.warrantyExpiry);
            return expiry <= thirtyDaysFromNow && expiry >= new Date();
          });
        } else if (filterStatus === "expired") {
          filtered = allWarranties.filter((w) => {
            if (!w.warrantyExpiry) return false;
            return new Date(w.warrantyExpiry) < new Date();
          });
        } else if (filterStatus === "active") {
          filtered = allWarranties.filter((w) => {
            if (!w.warrantyExpiry) return false;
            return new Date(w.warrantyExpiry) > addDays(new Date(), 30);
          });
        }

        setWarranties(filtered);
      }
    } catch (error) {
      console.error("Error fetching warranties:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWarrantyStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "unknown", label: "Unknown", color: "bg-gray-100 text-gray-800" };

    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = differenceInDays(expiry, now);

    if (daysUntilExpiry < 0) {
      return { status: "expired", label: "Expired", color: "bg-red-100 text-red-800" };
    } else if (daysUntilExpiry <= 30) {
      return { status: "expiring", label: `Expires in ${daysUntilExpiry} days`, color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { status: "active", label: "Active", color: "bg-green-100 text-green-800" };
    }
  };

  const expiringWarranties = warranties.filter((w) => {
    if (!w.warrantyExpiry) return false;
    const status = getWarrantyStatus(w.warrantyExpiry);
    return status.status === "expiring" || status.status === "expired";
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading warranties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warranty Tracking</h1>
          <p className="text-muted-foreground">
            Track warranty expiration dates and get alerts
          </p>
        </div>
      </div>

      {/* Alerts */}
      {expiringWarranties.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{expiringWarranties.length} warranty(s) expiring soon or expired!</strong>
            <p className="mt-1 text-sm">
              Review them below and take action before they expire.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Warranties</CardDescription>
            <CardTitle className="text-2xl">{warranties.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {warranties.filter((w) => getWarrantyStatus(w.warrantyExpiry).status === "active").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expiring Soon</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {warranties.filter((w) => getWarrantyStatus(w.warrantyExpiry).status === "expiring").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expired</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {warranties.filter((w) => getWarrantyStatus(w.warrantyExpiry).status === "expired").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Home</label>
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
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warranties List */}
      {warranties.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No warranties found. Add warranty information to your appliances and features to track them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {warranties.map((warranty) => {
            const status = getWarrantyStatus(warranty.warrantyExpiry);
            return (
              <Card key={warranty.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{warranty.name}</CardTitle>
                        <Badge className={status.color}>{status.label}</Badge>
                        <Badge variant="outline">{warranty.type}</Badge>
                      </div>
                      <CardDescription className="mt-2">
                        {warranty.brand && `${warranty.brand} `}
                        {warranty.model && `${warranty.model} `}
                        {warranty.home.address}, {warranty.home.city}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      {warranty.warrantyExpiry && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Expires:</span>
                          <span className="font-medium">
                            {format(new Date(warranty.warrantyExpiry), "PPP")}
                          </span>
                        </div>
                      )}
                      {warranty.installDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Installed:</span>
                          <span className="font-medium">
                            {format(new Date(warranty.installDate), "PPP")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {status.status === "expiring" && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertDescription className="text-yellow-800 text-sm">
                            This warranty expires soon! Consider filing any claims before it expires.
                          </AlertDescription>
                        </Alert>
                      )}
                      {status.status === "expired" && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertDescription className="text-red-800 text-sm">
                            This warranty has expired. Future repairs will not be covered.
                          </AlertDescription>
                        </Alert>
                      )}
                      {status.status === "active" && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Warranty is active and valid</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

