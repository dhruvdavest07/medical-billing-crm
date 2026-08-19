/**
 * Simple in-memory rate limiter.
 * For production with multiple instances, replace with a Redis-backed implementation.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  cleanup();
  const now = Date.now();

  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Returns a Response-like object for rate-limited requests, or null if allowed.
 * Usage:
 *   const limited = rateLimitResponse(`comment:${userId}`, 10, 60_000);
 *   if (limited) return limited;
 */
export function rateLimitResponse(
  key: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const result = rateLimit(key, limit, windowMs);
  if (result.success) return null;

  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Rate limit exceeded. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.resetAt),
      },
    },
  );
}

// Late import to avoid circular dependency issues
import { NextResponse } from "next/server";
