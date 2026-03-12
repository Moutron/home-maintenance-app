import {
  Home,
  LayoutDashboard,
  Calendar,
  ListTodo,
  DollarSign,
  Settings,
  History,
  FileText,
  Shield,
  Hammer,
  Wrench,
} from "lucide-react";

export const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Homes", href: "/homes", icon: Home },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "DIY Projects", href: "/diy-projects", icon: Hammer },
  { name: "Tool Inventory", href: "/tools", icon: Wrench },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "History", href: "/maintenance-history", icon: History },
  { name: "Warranties", href: "/warranties", icon: FileText },
  { name: "Compliance", href: "/compliance", icon: Shield },
  { name: "Budget", href: "/budget", icon: DollarSign },
  { name: "Settings", href: "/settings", icon: Settings },
];
