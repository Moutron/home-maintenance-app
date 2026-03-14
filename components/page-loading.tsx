"use client";

import { Car, Home } from "lucide-react";

interface PageLoadingProps {
  /** Short message below the animation (e.g. "Loading...") */
  message?: string;
  /** Optional class name for the wrapper */
  className?: string;
}

/**
 * Full-page loading state: car icon driving toward a house.
 * Use for dashboard pages while data is fetching.
 */
export function PageLoading({ message = "On the way...", className = "" }: PageLoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 ${className}`}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative w-[280px] h-16 flex items-center justify-center overflow-hidden rounded-lg bg-muted/30">
        {/* Road line */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div className="w-[85%] h-1 rounded-full bg-muted-foreground/20" />
        </div>
        {/* House at the end */}
        <Home
          className="absolute right-4 h-11 w-11 text-primary shrink-0"
          strokeWidth={1.8}
          aria-hidden
        />
        {/* Car driving toward the house */}
        <Car
          className="absolute left-4 h-9 w-9 text-primary animate-drive-to-house shrink-0"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
