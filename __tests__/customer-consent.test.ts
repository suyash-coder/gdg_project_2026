/**
 * Tests: src/lib/customer/consent.ts
 *
 * Verifies photo consent submission:
 *   - consent=true → 200 success
 *   - consent=false → 200 success (declining is valid)
 *   - 403 (not the customer) → ok:false
 *   - network error → ok:false
 *
 * The contract states photo consent is independent of attestation;
 * these tests confirm consent=false returns ok:true (not an error).
 */

import { submitPhotoConsent } from "@/lib/customer/consent";
import type { CustomerPhotoConsent } from "@/lib/types";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const fakeConsent: CustomerPhotoConsent = {
  id: "consent-001",
  job_id: "job-uuid-123",
  customer_id: "cust-001",
  consented_at: "2026-09-12T21:00:00Z",
  revoked_at: null,
  created_at: "2026-09-12T21:00:00Z",
};

const fakeRevokedConsent: CustomerPhotoConsent = {
  ...fakeConsent,
  revoked_at: "2026-09-12T21:30:00Z",
};

describe("submitPhotoConsent", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls the correct URL with consent=true", async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: fakeConsent }, 200));

    const result = await submitPhotoConsent("job-uuid-123", true);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/jobs/job-uuid-123/photo-consent",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.consent).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("returns ok:true when consent=false (declining is valid, not an error)", async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: fakeRevokedConsent }, 200));

    const result = await submitPhotoConsent("job-uuid-123", false);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.consent).toBe(false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Server should return a record with revoked_at set
      expect(result.record.revoked_at).toBeTruthy();
    }
  });

  it("returns ok:false with error for 403 (not the customer)", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(
        { error: "Only the customer of this job can provide photo consent" },
        403
      )
    );

    const result = await submitPhotoConsent("job-uuid-123", true);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("customer");
    }
  });

  it("returns ok:false for 404 (job not found)", async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: "Job not found" }, 404));

    const result = await submitPhotoConsent("nonexistent-job", true);

    expect(result.ok).toBe(false);
  });

  it("returns ok:false on network error", async () => {
    mockFetch.mockRejectedValue(new Error("fetch failed"));

    const result = await submitPhotoConsent("job-uuid-123", true);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/network error/i);
    }
  });
});
