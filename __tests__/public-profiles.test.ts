/**
 * Tests: src/lib/public/profiles.ts
 *
 * Mocks the Supabase server client to test the getPublicProfile helper.
 * Does NOT hit a real database.
 */

import { getPublicProfile } from "@/lib/public/profiles";
import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/types";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

const mockProfile: PublicProfile = {
  id: "worker-uuid-1",
  display_name: "Ramesh Kumar",
  bio: "Expert plumber with 10+ years experience.",
  avatar_url: null,
  city: "Mumbai",
  reputation_score: 3,
  average_rating: 4.5,
  rating_count: 2,
  repeat_customers: 1,
};

describe("getPublicProfile", () => {
  let mockSupabase: {
    from: jest.Mock;
  };
  let mockChain: {
    select: jest.Mock;
    eq: jest.Mock;
    maybeSingle: jest.Mock;
  };

  beforeEach(() => {
    jest.resetAllMocks();

    mockChain = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
    };
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);

    mockSupabase = { from: jest.fn().mockReturnValue(mockChain) };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it("returns the public profile for a valid worker ID", async () => {
    mockChain.maybeSingle.mockResolvedValue({ data: mockProfile, error: null });

    const result = await getPublicProfile("worker-uuid-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("public_profiles");
    expect(mockChain.eq).toHaveBeenCalledWith("id", "worker-uuid-1");
    expect(result).toEqual(mockProfile);
  });

  it("returns null when the worker is not found (not public or doesn't exist)", async () => {
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getPublicProfile("unknown-uuid");

    expect(result).toBeNull();
  });

  it("returns null when supabase returns an error", async () => {
    mockChain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "relation does not exist" },
    });

    const result = await getPublicProfile("any-id");

    expect(result).toBeNull();
  });
});
