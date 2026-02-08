"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield } from "lucide-react";

interface ComplianceBadgeProps {
  city: string;
  state: string;
  zipCode: string;
  yearBuilt: number;
  homeType: string;
  taskCategory: string;
  taskName: string;
  className?: string;
}

export function ComplianceBadge({
  city,
  state,
  zipCode,
  yearBuilt,
  homeType,
  taskCategory,
  taskName,
  className,
}: ComplianceBadgeProps) {
  const [complianceInfo, setComplianceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch compliance info for this task
    const fetchCompliance = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/compliance/lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            city,
            state,
            zipCode,
            yearBuilt,
            homeType,
            taskCategory,
            taskName,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setComplianceInfo(data);
        }
      } catch (error) {
        console.error("Error fetching compliance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, [city, state, zipCode, yearBuilt, homeType, taskCategory, taskName]);

  if (loading || !complianceInfo) {
    return null;
  }

  const hasRequiredRegulations =
    complianceInfo.compliance?.summary?.required > 0;
  const requiresPermit = complianceInfo.permitInfo?.requiresPermit;

  if (!hasRequiredRegulations && !requiresPermit) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={`cursor-help ${className} ${
        hasRequiredRegulations
          ? "border-red-500 text-red-700 bg-red-50"
          : "border-yellow-500 text-yellow-700 bg-yellow-50"
      }`}
      title={
        hasRequiredRegulations
          ? "This task is required by local regulations"
          : "This task requires a permit"
      }
    >
      {hasRequiredRegulations ? (
        <>
          <Shield className="mr-1 h-3 w-3" />
          Required by Law
        </>
      ) : (
        <>
          <FileText className="mr-1 h-3 w-3" />
          Permit Required
        </>
      )}
    </Badge>
  );
}

