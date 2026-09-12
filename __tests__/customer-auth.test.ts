/**
 * Tests: src/lib/customer/auth.ts
 *
 * Mocks global fetch to test signup, login, and logout wrappers.
 * All logic is in the API routes (Person 1's code); these tests verify
 * that our wrappers correctly parse success and error responses.
 */

import { signUpCustomer, signInCustomer, signOutCustomer } from "@/lib/customer/auth";

// Polyfill fetch for Node test environment
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("signUpCustomer", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns ok:true with userId and email on 201", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(
        { data: { user: { id: "user-abc", email: "test@test.com" } } },
        201
      )
    );

    const result = await signUpCustomer("test@test.com", "password123", "Test User");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual({
      ok: true,
      userId: "user-abc",
      email: "test@test.com",
    });
  });

  it("returns ok:false with error message on 400", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: "User already registered" }, 400)
    );

    const result = await signUpCustomer("dup@test.com", "password123");

    expect(result).toEqual({ ok: false, error: "User already registered" });
  });

  it("returns ok:false on network error", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await signUpCustomer("x@x.com", "pass");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/network error/i);
  });
});

describe("signInCustomer", () => {
  beforeEach(() => mockFetch.mockReset());

  it("returns ok:true with userId, email, expiresAt on 200", async () => {
    mockFetch.mockResolvedValue(
      makeResponse(
        {
          data: {
            user: { id: "user-xyz", email: "login@test.com" },
            session: { expires_at: "2026-10-01T00:00:00Z" },
          },
        },
        200
      )
    );

    const result = await signInCustomer("login@test.com", "password123");

    expect(result).toEqual({
      ok: true,
      userId: "user-xyz",
      email: "login@test.com",
      expiresAt: "2026-10-01T00:00:00Z",
    });
  });

  it("returns ok:false with error message on 401", async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: "Invalid login credentials" }, 401)
    );

    const result = await signInCustomer("bad@test.com", "wrongpass");

    expect(result).toEqual({ ok: false, error: "Invalid login credentials" });
  });

  it("returns ok:false on network error", async () => {
    mockFetch.mockRejectedValue(new Error("fetch failed"));

    const result = await signInCustomer("x@x.com", "pass");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/network error/i);
  });
});

describe("signOutCustomer", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls POST /api/auth/logout", async () => {
    mockFetch.mockResolvedValue(makeResponse({}, 200));

    await signOutCustomer();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST" })
    );
  });
});
