import React from "react";
import {
  Wind,
  Droplet,
  Home,
  Wrench,
  TreePine,
  Refrigerator,
  Shield,
  Zap,
  Hammer,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
} from "lucide-react";

export const getCategoryIcon = (category: string): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    HVAC: Wind,
    PLUMBING: Droplet,
    EXTERIOR: Home,
    STRUCTURAL: Hammer,
    LANDSCAPING: TreePine,
    APPLIANCE: Refrigerator,
    SAFETY: Shield,
    ELECTRICAL: Zap,
    OTHER: Wrench,
  };

  return iconMap[category] || Calendar;
};

export const getPriorityIcon = (priority: string | null): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    critical: AlertTriangle,
    high: AlertCircle,
    medium: Info,
    low: CheckCircle,
  };

  return iconMap[priority?.toLowerCase() || ""] || Info;
};

export const getPriorityColor = (priority: string | null) => {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 border-red-300",
    high: "bg-orange-100 text-orange-800 border-orange-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return colors[priority?.toLowerCase() || ""] || colors.medium;
};

export const getPriorityBadgeColor = (priority: string | null) => {
  const colors: Record<string, string> = {
    critical: "bg-red-600 text-white",
    high: "bg-orange-600 text-white",
    medium: "bg-yellow-600 text-white",
    low: "bg-gray-600 text-white",
  };
  return colors[priority?.toLowerCase() || ""] || colors.medium;
};

export const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    HVAC: "bg-blue-100 text-blue-800 border-blue-200",
    PLUMBING: "bg-green-100 text-green-800 border-green-200",
    EXTERIOR: "bg-yellow-100 text-yellow-800 border-yellow-200",
    STRUCTURAL: "bg-red-100 text-red-800 border-red-200",
    LANDSCAPING: "bg-emerald-100 text-emerald-800 border-emerald-200",
    APPLIANCE: "bg-purple-100 text-purple-800 border-purple-200",
    SAFETY: "bg-orange-100 text-orange-800 border-orange-200",
    ELECTRICAL: "bg-indigo-100 text-indigo-800 border-indigo-200",
    OTHER: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return colors[category] || colors.OTHER;
};

