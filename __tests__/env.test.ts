/**
 * Environment variable handling tests.
 */

describe("env module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("getServerEnv() throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const { getServerEnv } = await import("@/lib/env");

    expect(() => getServerEnv()).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("getServerEnv() throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const { getServerEnv } = await import("@/lib/env");

    expect(() => getServerEnv()).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("getServerEnv() returns all values when present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

    const { getServerEnv } = await import("@/lib/env");

    const env = getServerEnv();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("test-service-key");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://localhost:54321");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key");
  });
});
