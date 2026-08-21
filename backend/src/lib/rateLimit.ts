/**
 * Tiny in-memory sliding-window rate limiter. Keyed by an arbitrary string
 * (device id, IP, or a composite). Returns whether the action is allowed and,
 * if not, how long until it would be.
 *
 * Scope caveat: this is per-process. It's fine for a single API instance; behind
 * multiple instances or a load balancer, move this to a shared store (Redis) so
 * the window is global. Documented rather than hidden so it isn't mistaken for a
 * distributed guarantee.
 */

interface Bucket {
  hits: number[]; // sorted-ish timestamps (ms) of recent hits within the window
}

const buckets = new Map<string, Bucket>();

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Record and evaluate a hit against `key`. Allows up to `max` hits per
 * `windowMs`. Call once per attempt; a denied attempt is not counted against
 * the window (so a blocked caller can't push their own reset further out).
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): RateResult {
  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  // Drop expired hits.
  const recent = bucket.hits.filter((t) => t > cutoff);

  if (recent.length >= max) {
    const oldest = recent[0]!;
    bucket.hits = recent;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  recent.push(now);
  bucket.hits = recent;
  buckets.set(key, bucket);
  return { allowed: true, remaining: max - recent.length, retryAfterSeconds: 0 };
}

/**
 * Opportunistic cleanup so the map doesn't grow unbounded across many distinct
 * keys. Safe to call periodically; O(n) over tracked keys.
 */
export function sweepRateLimiter(
  windowMs: number,
  now: number = Date.now(),
): void {
  const cutoff = now - windowMs;
  for (const [key, bucket] of buckets) {
    const recent = bucket.hits.filter((t) => t > cutoff);
    if (recent.length === 0) buckets.delete(key);
    else bucket.hits = recent;
  }
}
