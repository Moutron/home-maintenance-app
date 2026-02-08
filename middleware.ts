import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/terms",
  "/api/webhooks(.*)",
  "/api/health",
]);

// API paths that are not rate-limited (health, webhooks, cron-only)
const isRateLimitExcluded = createRouteMatcher([
  "/api/health",
  "/api/webhooks(.*)",
  "/api/warranties/check-expiring",
  "/api/budget/alerts",
  "/api/notifications/push/send",
]);

export default clerkMiddleware(async (auth, req) => {
  // Per-IP rate limit for API routes (in-memory; exclude health, webhooks, cron)
  if (req.nextUrl.pathname.startsWith("/api") && !isRateLimitExcluded(req)) {
    const ip = getClientIp(req.headers);
    const { ok, remaining, resetAt } = checkRateLimit(ip);
    if (!ok) {
      const retryAfter = Math.ceil(Math.max(0, resetAt - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

