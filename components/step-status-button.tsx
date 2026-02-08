"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, Circle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StepStatusButtonProps = {
  stepId: string;
  projectId: string;
  currentStatus: string;
  estimatedHours: number | null;
  actualHours: number | null;
  onStatusUpdated: () => void;
};

export function StepStatusButton({
  stepId,
  projectId,
  currentStatus,
  estimatedHours,
  actualHours,
  onStatusUpdated,
}: StepStatusButtonProps) {
  const [status, setStatus] = useState(currentStatus);
  const [hours, setHours] = useState(actualHours?.toString() || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const payload: any = {
        status,
      };
      if (hours) {
        payload.actualHours = parseFloat(hours);
      }

      const response = await fetch(
        `/api/diy-projects/${projectId}/steps/${stepId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update step");
      }

      setOpen(false);
      onStatusUpdated();
    } catch (error) {
      console.error("Error updating step:", error);
      alert("Failed to update step. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {getStatusIcon(status)}
          <Badge className={getStatusColor(status)}>
            {status.replace("_", " ")}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Step Status</DialogTitle>
          <DialogDescription>
            Update the status and track actual hours spent
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="hours">
              Actual Hours{" "}
              {estimatedHours && (
                <span className="text-muted-foreground text-sm">
                  (Est: {estimatedHours}h)
                </span>
              )}
            </Label>
            <Input
              id="hours"
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Enter hours spent"
              min="0"
              step="0.5"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

