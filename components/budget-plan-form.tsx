"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface BudgetPlanFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: {
    name?: string;
    period?: string;
    amount?: number;
    startDate?: string;
    endDate?: string;
    category?: string;
    homeId?: string;
  };
}

export function BudgetPlanForm({
  onSuccess,
  onCancel,
  initialData,
}: BudgetPlanFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    period: initialData?.period || "MONTHLY",
    amount: initialData?.amount?.toString() || "",
    startDate: initialData?.startDate || "",
    endDate: initialData?.endDate || "",
    category: initialData?.category || "__all",
    homeId: initialData?.homeId || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = initialData ? `/api/budget/plans/${initialData}` : "/api/budget/plans";
      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          period: formData.period,
          amount: parseFloat(formData.amount),
          startDate: formData.startDate,
          endDate: formData.endDate,
          category: formData.category === "__all" ? null : formData.category || null,
          homeId: formData.homeId || null,
        }),
      });

      if (response.ok) {
        onSuccess?.();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to save budget plan"}`);
      }
    } catch (error) {
      console.error("Error saving budget plan:", error);
      alert("Failed to save budget plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDate = (startDate: string, period: string) => {
    if (!startDate) return "";
    const start = new Date(startDate);
    const end = new Date(start);

    switch (period) {
      case "MONTHLY":
        end.setMonth(end.getMonth() + 1);
        break;
      case "QUARTERLY":
        end.setMonth(end.getMonth() + 3);
        break;
      case "ANNUAL":
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    return end.toISOString().split("T")[0];
  };

  const handlePeriodChange = (period: string) => {
    setFormData({ ...formData, period });
    if (formData.startDate) {
      const endDate = calculateEndDate(formData.startDate, period);
      setFormData({ ...formData, period, endDate });
    }
  };

  const handleStartDateChange = (startDate: string) => {
    const endDate = calculateEndDate(startDate, formData.period);
    setFormData({ ...formData, startDate, endDate });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Budget Plan Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., 2024 Home Maintenance Budget"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="period">Period *</Label>
          <Select value={formData.period} onValueChange={handlePeriodChange}>
            <SelectTrigger id="period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="ANNUAL">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">Budget Amount ($) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) =>
              setFormData({ ...formData, endDate: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="category">Category (Optional)</Label>
          <Select
            value={formData.category}
            onValueChange={(value) =>
              setFormData({ ...formData, category: value })
            }
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Categories</SelectItem>
              <SelectItem value="HVAC">HVAC</SelectItem>
              <SelectItem value="PLUMBING">PLUMBING</SelectItem>
              <SelectItem value="ELECTRICAL">ELECTRICAL</SelectItem>
              <SelectItem value="EXTERIOR">EXTERIOR</SelectItem>
              <SelectItem value="INTERIOR">INTERIOR</SelectItem>
              <SelectItem value="LANDSCAPING">LANDSCAPING</SelectItem>
              <SelectItem value="APPLIANCE">APPLIANCE</SelectItem>
              <SelectItem value="STRUCTURAL">STRUCTURAL</SelectItem>
              <SelectItem value="OTHER">OTHER</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="homeId">Home (Optional)</Label>
          <Input
            id="homeId"
            value={formData.homeId}
            onChange={(e) =>
              setFormData({ ...formData, homeId: e.target.value })
            }
            placeholder="Leave empty for all homes"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Budget Plan"
          )}
        </Button>
      </div>
    </form>
  );
}

