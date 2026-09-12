/**
 * Tests: src/lib/customer/tokens.ts
 *
 * Tests the resolveToken function for the three required states:
 *   valid, invalid, consumed
 *
 * These tests exercise the mock implementation. When the real API endpoint
 * is available, these same tests will verify the actual integration.
 */

import { resolveToken } from "@/lib/customer/tokens";

describe("resolveToken", () => {
  it("returns status=valid with job details for demo-valid token", async () => {
    const result = await resolveToken("demo-valid");

    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.job.title).toBeTruthy();
      expect(result.job.status).toBe("completed");
      expect(result.job.id).toBeTruthy();
    }
  });

  it("returns status=consumed with usedAt for demo-consumed token", async () => {
    const result = await resolveToken("demo-consumed");

    expect(result.status).toBe("consumed");
    if (result.status === "consumed") {
      expect(result.usedAt).toBeTruthy();
      // Verify it parses as a date
      expect(new Date(result.usedAt).getTime()).not.toBeNaN();
    }
  });

  it("returns status=invalid for an unknown token", async () => {
    const result = await resolveToken("totally-unknown-token-xyz");

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.reason).toBeTruthy();
    }
  });

  it("returns status=invalid for an empty string token", async () => {
    const result = await resolveToken("");

    expect(result.status).toBe("invalid");
  });

  it("valid job fields conform to the Job schema", async () => {
    const result = await resolveToken("demo-valid");
    if (result.status !== "valid") throw new Error("Expected valid");

    const { job } = result;
    expect(typeof job.id).toBe("string");
    expect(typeof job.title).toBe("string");
    expect(["pending", "in_progress", "completed", "disputed", "cancelled"]).toContain(
      job.status
    );
    expect(typeof job.created_at).toBe("string");
    // created_at must be a valid ISO date
    expect(new Date(job.created_at).getTime()).not.toBeNaN();
  });
});
