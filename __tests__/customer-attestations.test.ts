/**
 * Tests: src/lib/customer/attestations.ts
 *
 * Mocks global fetch to verify the attestation submission wrapper:
 *   - 201 success → ok:true with attestation data
 *   - 409 conflict → ok:false, alreadyExists:true
 *   - 400/401/403 → ok:false with error message
 *   - network error → ok:false
 */

import { submitAttestation } from "@/lib/customer/attestations";
import type { CustomerAttestation } from "@/lib/types";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const baseInput = {
  jobId: "job-uuid-123",
  token: "raw-token-abc",
  status: "approved" as const,
};

const fakeAttestation: CustomerAttestation = {
  id: "attest-001",
  job_id: "job-uuid-123",
  customer_id: "cust-001",
  status: "approved",
  comment: null,
  attested_at: "2026-09-12T20:00:00Z",
  created_at: "2026-09-12T20:00:00Z",
};

describe("submitAttestation", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns ok:true with attestation on 201", async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: fakeAttestation }, 201));

    const result = await submitAttestation(baseInput);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/attestations",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("job-uuid-123"),
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attestation.id).toBe("attest-001");
      expect(result.attestation.status).toBe("approved");
    }
  });

  it("includes the raw token in the request body", async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: fakeAttestation }, 201));

    await submitAttestation({ ...baseInput, token: "my-raw-token" });

    const bodyStr = mockFetch.mock.calls[0][1].body as string;
    const body = JSON.parse(bodyStr);
    expect(body.token).toBe("my-raw-token");
    expect(body.job_id).toBe("job-uuid-123");
  });

  it("sends optional comment when provided", async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: fakeAttestation }, 201));

    await submitAttestation({ ...baseInput, comment: "Great work!" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.comment).toBe("Great work!");
  });

  it("returns ok:false with alreadyExists:true on 409", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: "Attestation already exists for this job" }, 409)
    );

    const result = await submitAttestation(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.alreadyExists).toBe(true);
    }
  });

  it("returns ok:false for 400 validation error", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: "Invalid token" }, 400)
    );

    const result = await submitAttestation(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Invalid token");
      expect(result.alreadyExists).toBeFalsy();
    }
  });

  it("returns ok:false for 403 (not the customer)", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: "Only the customer of this job can attest" }, 403)
    );

    const result = await submitAttestation(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("customer");
    }
  });

  it("returns ok:false on network error", async () => {
    mockFetch.mockRejectedValue(new Error("fetch failed"));

    const result = await submitAttestation(baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/network error/i);
    }
  });
});
