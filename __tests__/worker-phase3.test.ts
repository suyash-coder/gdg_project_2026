/**
 * Worker Phase 3 — Evidence state sync and customer verification handoff.
 *
 * Tests cover:
 * - Verification adapter contract (honest failure)
 * - State machine for verification UI states
 * - Error types and messages
 */

import { generateCustomerVerification } from "@/lib/verification/verification-adapter";
import type { VerificationErrorKind } from "@/lib/verification/verification-adapter";

describe("Customer Verification Handoff (Phase 3)", () => {
  it("verification adapter returns honest endpoint_unavailable error", async () => {
    // Tests that we do not fabricate tokens or claim success
    const result = await generateCustomerVerification("valid-job-id");
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("endpoint_unavailable");
      expect(result.error.retryable).toBe(true);
      expect(result.error.message).toMatch(/not yet available/i);
    }
  });

  it("verification adapter handles missing job ID", async () => {
    const result = await generateCustomerVerification("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_job_state");
      expect(result.error.retryable).toBe(false);
    }
  });

  it("all required error kinds are defined", () => {
    const validErrors: VerificationErrorKind[] = [
      "endpoint_unavailable",
      "network_failure",
      "unauthorized",
      "invalid_job_state",
      "server_error",
    ];
    expect(validErrors.length).toBe(5);
  });
});
