"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/dashboard-nav-config";

export function MobileBottomNav() {
  const pathname = usePathname();

  // Pick a subset of primary items for the bottom bar
  const primaryItems = navigation.filter((item) =>
    ["/dashboard", "/homes", "/garage", "/tasks", "/budget", "/settings"].includes(item.href)
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 py-1.5 backdrop-blur lg:hidden"
      aria-label="Primary mobile navigation"
      data-testid="mobile-bottom-nav"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-1">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium",
                "transition-colors duration-150",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

