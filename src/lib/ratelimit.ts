/**
 * Lightweight in-memory fixed-window rate limiter (security baseline, FR-1.7).
 *
 * NOTE: in-memory state is per serverless instance, so this is a best-effort
 * baseline, not a distributed limit. For production-grade limits across all
 * instances, back this with Upstash/Redis (see OPERATIONS.md). Supabase Auth
 * also rate-limits credential attempts independently.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateResult {
  ok: boolean;
  retryAfterSec?: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

/** Yyyy-mm-dd key suffix for per-day quotas. */
export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
