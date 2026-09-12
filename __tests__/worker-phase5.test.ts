/**
 * Worker Phase 5 Tests — Reputation Sharing & Digital CV Integration
 *
 * Ensures that the system correctly generates the canonical URL, handles SSR boundaries,
 * and enforces public/private data separation for the Digital CV generation.
 */

import { getCanonicalPublicProfileUrl, getAbsolutePublicProfileUrl } from "@/lib/public-profile-adapter";
import { generateDigitalCV } from "@/lib/cv-generator";
import { createClient } from "@/lib/supabase/client";

// Mock Supabase Client
jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

// Mock jsPDF and QRCode to avoid complex canvas rendering in node
jest.mock("jspdf", () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    splitTextToSize: jest.fn().mockReturnValue(["mock text"]),
    addPage: jest.fn(),
    addImage: jest.fn(),
    setTextColor: jest.fn(),
    save: jest.fn(),
    output: jest.fn().mockReturnValue(new Blob()),
  })),
}));

jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mock"),
}));

describe("Phase 5 Integration: URL Generation", () => {
  it("generates the correct canonical public profile route", () => {
    const url = getCanonicalPublicProfileUrl("test-worker-123");
    expect(url).toBe("/public/worker/test-worker-123");
  });

  it("handles SSR gracefully for absolute URL generation", () => {
    // In Jest environment without window (or pretending it's undefined), it should return empty
    // But Jest has jsdom by default usually. Let's mock window temporarily.
    const originalWindow = global.window;
    // @ts-expect-error Mocking window deletion for testing
    delete global.window;
    
    expect(getAbsolutePublicProfileUrl("test-worker-123")).toBe("");
    
    global.window = originalWindow;
  });
});

describe("Phase 5 Integration: CV Generator Boundaries", () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it("fails CV generation if public profile is missing or private", async () => {
    mockSupabase.single.mockResolvedValue({ data: null, error: new Error("Not found") });

    await expect(generateDigitalCV("private-worker-123")).rejects.toThrow(
      "Unable to fetch public profile data for CV. Verify profile is public."
    );

    // Verify it queried the strictly safe 'public_profiles' view
    expect(mockSupabase.from).toHaveBeenCalledWith("public_profiles");
  });

  it("generates CV successfully using ONLY public boundary data", async () => {
    mockSupabase.single.mockResolvedValue({
      data: {
        id: "public-worker",
        display_name: "Test Worker",
        bio: "Test bio",
        city: "Test city",
        reputation_score: 100,
      },
      error: null,
    });

    const blob = await generateDigitalCV("public-worker");
    
    expect(blob).toBeInstanceOf(Blob);
    expect(mockSupabase.from).toHaveBeenCalledWith("public_profiles");
    expect(mockSupabase.select).toHaveBeenCalledWith(
      expect.stringContaining("display_name")
    );
  });
});
