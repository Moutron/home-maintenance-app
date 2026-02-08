/**
 * In-memory, per-IP rate limiter. Zero cost, no external services.
 * Best for single-instance or "best effort" on serverless (each instance has its own store).
 * Set RATE_LIMIT_DISABLED=1 to turn off (e.g. in tests).
 */

const RATE_LIMIT_REQUESTS = parseInt(
  process.env.RATE_LIMIT_REQUESTS ?? "60",
  10
);
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS ?? "60000",
  10
);
const RATE_LIMIT_DISABLED =
  process.env.RATE_LIMIT_DISABLED === "1" ||
  process.env.RATE_LIMIT_DISABLED === "true";

interface Window {
  count: number;
  windowStart: number;
}

const store = new Map<string, Window>();
const MAX_ENTRIES = 20_000;
const PRUNE_AT = 15_000;

function prune(): void {
  if (store.size <= PRUNE_AT) return;
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS * 2;
  for (const [key, w] of store.entries()) {
    if (w.windowStart < cutoff) store.delete(key);
  }
  if (store.size > MAX_ENTRIES) {
    const entries = [...store.entries()].sort(
      (a, b) => a[1].windowStart - b[1].windowStart
    );
    const toDelete = Math.floor(store.size / 2);
    for (let i = 0; i < toDelete; i++) {
      store.delete(entries[i][0]);
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and consume one request for the given key (e.g. IP).
 * Returns ok: false when over limit; caller should respond 429.
 */
export function checkRateLimit(key: string): RateLimitResult {
  if (RATE_LIMIT_DISABLED) {
    return { ok: true, remaining: RATE_LIMIT_REQUESTS, resetAt: 0 };
  }

  const now = Date.now();
  let w = store.get(key);

  if (!w || now - w.windowStart >= RATE_LIMIT_WINDOW_MS) {
    w = { count: 0, windowStart: now };
    store.set(key, w);
  }

  w.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_REQUESTS - w.count);
  const resetAt = w.windowStart + RATE_LIMIT_WINDOW_MS;
  const ok = w.count <= RATE_LIMIT_REQUESTS;

  if (store.size >= PRUNE_AT) prune();

  return { ok, remaining, resetAt };
}

/**
 * Get client IP from request headers (Vercel: x-forwarded-for, x-real-ip).
 * Use in middleware only.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
