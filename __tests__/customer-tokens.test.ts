/**
 * Tests: src/lib/customer/tokens.ts (real endpoint implementation)
 *
 * Mocks global fetch to test the three token states as returned by
 * GET /api/verify/[token]:
 *   - 200 → valid (job + worker details)
 *   - 400 "Token already consumed" → consumed
 *   - 400 "Token expired" → invalid
 *   - 404 → invalid
 *   - network error → invalid
 *
 * Also verifies that the empty-token guard returns invalid without fetching.
 */

import { resolveToken } from "@/lib/customer/tokens";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("resolveToken — real endpoint", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns status=valid with job and worker for a 200 response", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(
        {
          data: {
            job: {
              id: "job-abc",
              title: "Plumbing Repair",
              description: "Fixed the sink.",
              status: "completed",
              profiles: { id: "worker-1", display_name: "Ramesh K.", avatar_url: null },
            },
          },
        },
        200
      )
    );

    const result = await resolveToken("some-real-token");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/verify/some-real-token",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.job.id).toBe("job-abc");
      expect(result.job.title).toBe("Plumbing Repair");
      expect(result.job.worker?.display_name).toBe("Ramesh K.");
    }
  });

  it("returns status=consumed for 'Token already consumed' (400)", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: "Token already consumed" }, 400)
    );

    const result = await resolveToken("consumed-token");

    expect(result.status).toBe("consumed");
    if (result.status === "consumed") {
      expect(result.reason).toContain("consumed");
    }
  });

  it("returns status=invalid for 'Token expired' (400)", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: "Token expired" }, 400)
    );

    const result = await resolveToken("expired-token");

    expect(result.status).toBe("invalid");
  });

  it("returns status=invalid for 404 (not found)", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: "Invalid token" }, 404)
    );

    const result = await resolveToken("unknown-token");

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.reason).toBeTruthy();
    }
  });

  it("returns status=invalid on network error", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await resolveToken("any-token");

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.reason).toMatch(/network error/i);
    }
  });

  it("returns status=invalid without fetching for an empty token", async () => {
    const result = await resolveToken("");

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.status).toBe("invalid");
  });

  it("returns status=invalid for a 429 rate-limit response", async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: "Too many requests" }, 429));

    const result = await resolveToken("some-token");

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.reason).toMatch(/too many/i);
    }
  });
});
