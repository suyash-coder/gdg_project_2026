/**
 * In-memory sliding-window rate limiter.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
 *   if (!limiter.check(ip)) return Response.json({ error: "Too many requests" }, { status: 429 });
 *
 * Note: In-memory only — resets on deploy/restart.
 * For production multi-instance deploys, replace with Redis-backed limiter.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterOptions {
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests allowed per window */
  maxRequests: number;
}

export interface RateLimiter {
  /** Returns true if the request is allowed, false if rate-limited. */
  check(key: string): boolean;
  /** Reset a specific key (for testing). */
  reset(key: string): void;
  /** Clear all entries (for testing). */
  clear(): void;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, maxRequests } = options;
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup every 60s to prevent unbounded memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow GC if the reference is dropped
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = store.get(key) ?? { timestamps: [] };

      // Remove expired timestamps
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

      if (entry.timestamps.length >= maxRequests) {
        return false; // Rate limited
      }

      entry.timestamps.push(now);
      store.set(key, entry);
      return true; // Allowed
    },

    reset(key: string): void {
      store.delete(key);
    },

    clear(): void {
      store.clear();
    },
  };
}

/**
 * Pre-configured limiters for common use cases.
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20,
});

export const attestationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
});

/**
 * Extract client IP from request for rate limiting.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
