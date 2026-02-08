"use client";

import { useEffect, useState } from "react";
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
import { Shield, FileText, AlertTriangle, CheckCircle2, Plus } from "lucide-react";

type LocalRegulation = {
  type: string;
  title: string;
  description: string;
  frequency?: string;
  required: boolean;
  penalty?: string;
  source?: string;
  appliesTo?: string[];
};

type ComplianceData = {
  regulations: LocalRegulation[];
  complianceTasks: any[];
  summary: {
    required: number;
    recommended: number;
    critical: number;
  };
  permitInfo?: any;
  recommendations?: string[];
};

export default function CompliancePage() {
  const [homes, setHomes] = useState<any[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<string>("");
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  useEffect(() => {
    fetchHomes();
  }, []);

  useEffect(() => {
    if (selectedHomeId) {
      fetchCompliance();
    }
  }, [selectedHomeId]);

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes");
      if (response.ok) {
        const data = await response.json();
        setHomes(data.homes || []);
        if (data.homes.length > 0) {
          setSelectedHomeId(data.homes[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const fetchCompliance = async () => {
    if (!selectedHomeId) return;

    setLoading(true);
    try {
      const home = homes.find((h) => h.id === selectedHomeId);
      if (!home) return;

      // Ensure all required fields are present
      if (!home.city || !home.state || !home.zipCode) {
        alert("Error: Home address information is incomplete. Please update your home details.");
        return;
      }

      const response = await fetch("/api/compliance/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: home.city,
          state: home.state,
          zipCode: home.zipCode,
          yearBuilt: home.yearBuilt || new Date().getFullYear(),
          homeType: home.homeType || "single-family",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComplianceData(data.compliance);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Error fetching compliance:", errorData);
        alert(`Error: ${errorData.error || "Failed to fetch compliance data"}`);
      }
    } catch (error) {
      console.error("Error fetching compliance:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Failed to fetch compliance data"}`);
    } finally {
      setLoading(false);
    }
  };

  const generateComplianceTasks = async () => {
    if (!selectedHomeId) return;

    setGeneratingTasks(true);
    try {
      const response = await fetch("/api/tasks/generate-compliance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeId: selectedHomeId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          `Successfully created ${data.newTasks} compliance task(s)! Check your Tasks page to see them.`
        );
      } else {
        const error = await response.json();
        alert(error.error || "Failed to generate compliance tasks");
      }
    } catch (error) {
      console.error("Error generating compliance tasks:", error);
      alert("An error occurred while generating compliance tasks");
    } finally {
      setGeneratingTasks(false);
    }
  };

  const getRegulationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      inspection: "bg-blue-100 text-blue-800",
      permit: "bg-yellow-100 text-yellow-800",
      code: "bg-purple-100 text-purple-800",
      safety: "bg-red-100 text-red-800",
      environmental: "bg-green-100 text-green-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading compliance requirements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compliance & Regulations</h1>
        <p className="text-muted-foreground">
          Local laws and regulations that apply to your home
        </p>
      </div>

      {/* Home Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Home</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
            <SelectTrigger className="flex-1">
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
          {selectedHomeId && (
            <Button
              onClick={generateComplianceTasks}
              disabled={generatingTasks}
              variant="outline"
            >
              {generatingTasks ? (
                "Generating..."
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Compliance Tasks
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {complianceData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Required Regulations</CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  {complianceData.summary.required}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Legally required items
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Critical Safety</CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  {complianceData.summary.critical}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Safety requirements
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Recommended</CardDescription>
                <CardTitle className="text-2xl">
                  {complianceData.summary.recommended}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Best practices
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {complianceData.summary.required > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>
                  {complianceData.summary.required} required compliance
                  item(s) found
                </strong>
                <p className="mt-1 text-sm">
                  These are legally required and may result in fines or legal
                  issues if not completed.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Regulations List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Applicable Regulations</h2>
            {complianceData.regulations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" />
                  <p className="text-muted-foreground">
                    No specific compliance requirements found for this location.
                    General maintenance recommendations still apply.
                  </p>
                </CardContent>
              </Card>
            ) : (
              complianceData.regulations.map((regulation, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {regulation.title}
                          </CardTitle>
                          <Badge className={getRegulationTypeColor(regulation.type)}>
                            {regulation.type}
                          </Badge>
                          {regulation.required && (
                            <Badge variant="destructive">Required</Badge>
                          )}
                        </div>
                        <CardDescription className="mt-2">
                          {regulation.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {regulation.frequency && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Frequency:
                          </span>
                          <span className="ml-2 font-medium">
                            {regulation.frequency.replace(/-/g, " ")}
                          </span>
                        </div>
                      )}
                      {regulation.penalty && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Penalty:
                          </span>
                          <span className="ml-2 font-medium text-red-600">
                            {regulation.penalty}
                          </span>
                        </div>
                      )}
                      {regulation.source && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Source:</span>
                          <span className="ml-2 font-medium">
                            {regulation.source}
                          </span>
                        </div>
                      )}
                      {regulation.appliesTo && regulation.appliesTo.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Applies to:
                          </span>
                          <span className="ml-2 font-medium">
                            {regulation.appliesTo.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Recommendations */}
          {complianceData.recommendations &&
            complianceData.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {complianceData.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  );
}

