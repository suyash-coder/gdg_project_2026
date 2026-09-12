/**
 * Rate limiter tests.
 */

import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 3 });

    expect(limiter.check("ip-1")).toBe(true);
    expect(limiter.check("ip-1")).toBe(true);
    expect(limiter.check("ip-1")).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 2 });

    expect(limiter.check("ip-2")).toBe(true);
    expect(limiter.check("ip-2")).toBe(true);
    expect(limiter.check("ip-2")).toBe(false); // Blocked
    expect(limiter.check("ip-2")).toBe(false); // Still blocked
  });

  it("tracks different keys independently", () => {
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 1 });

    expect(limiter.check("ip-a")).toBe(true);
    expect(limiter.check("ip-b")).toBe(true);
    expect(limiter.check("ip-a")).toBe(false); // ip-a is blocked
    expect(limiter.check("ip-b")).toBe(false); // ip-b is blocked
  });

  it("allows requests after window expires", async () => {
    const limiter = createRateLimiter({ windowMs: 100, maxRequests: 1 });

    expect(limiter.check("ip-3")).toBe(true);
    expect(limiter.check("ip-3")).toBe(false); // Blocked

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 150));

    expect(limiter.check("ip-3")).toBe(true); // Allowed again
  });

  it("reset() clears a specific key", () => {
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 1 });

    expect(limiter.check("ip-4")).toBe(true);
    expect(limiter.check("ip-4")).toBe(false);

    limiter.reset("ip-4");

    expect(limiter.check("ip-4")).toBe(true);
  });

  it("clear() resets all keys", () => {
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 1 });

    limiter.check("ip-5");
    limiter.check("ip-6");

    limiter.clear();

    expect(limiter.check("ip-5")).toBe(true);
    expect(limiter.check("ip-6")).toBe(true);
  });
});
