"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/dashboard-nav-config";

const sections = [
  { label: "Overview", start: 0, end: 3 },
  { label: "Track & plan", start: 3, end: 7 },
  { label: "Records", start: 7, end: 10 },
  { label: "Planning", start: 10, end: 11 },
  { label: "Account", start: 11, end: 12 },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-3 px-3 py-3 overflow-y-auto min-h-0">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {navigation.slice(section.start, section.end).map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      "hover:bg-accent/80 hover:translate-x-0.5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                        isActive ? "bg-primary/15" : "bg-muted/50 group-hover:bg-muted"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors duration-200",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                    </span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
