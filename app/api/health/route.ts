import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check endpoint for load balancers, Kubernetes, and uptime monitoring.
 * GET /api/health - No authentication required.
 * Returns 200 if app and DB are OK; 503 if DB is unreachable.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { ok: false, error: "Database unreachable", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
