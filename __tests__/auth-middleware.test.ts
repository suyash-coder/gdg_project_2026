/**
 * Auth middleware tests.
 */

import { requireAuth, requireRole } from "@/lib/supabase/middleware";
import { createClient } from "@/lib/supabase/server";

// Mock the server client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

describe("Auth Middleware", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    jest.resetAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    } as unknown;
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe("requireAuth", () => {
    it("returns 401 when no user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not logged in" },
      });

      const result = await requireAuth();
      expect(result).toBeInstanceOf(Response);
      if (result instanceof Response) {
        expect(result.status).toBe(401);
      }
    });

    it("returns user data when authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      const result = await requireAuth();
      expect(result).not.toBeInstanceOf(Response);
      if (!(result instanceof Response)) {
        expect(result.id).toBe("user-123");
        expect(result.email).toBe("test@example.com");
      }
    });
  });

  describe("requireRole", () => {
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockSingle = jest.fn();

    beforeEach(() => {
      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle });
    });

    it("returns 401 when no user (via requireAuth)", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not logged in" },
      });

      const result = await requireRole("admin");
      expect(result).toBeInstanceOf(Response);
      if (result instanceof Response) {
        expect(result.status).toBe(401);
      }
    });

    it("returns 404 when profile not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await requireRole("admin");
      expect(result).toBeInstanceOf(Response);
      if (result instanceof Response) {
        expect(result.status).toBe(404);
      }
    });

    it("returns 403 when role does not match", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: { id: "user-123", role: "worker" },
        error: null,
      });

      const result = await requireRole("admin");
      expect(result).toBeInstanceOf(Response);
      if (result instanceof Response) {
        expect(result.status).toBe(403);
      }
    });

    it("returns user and profile when role matches", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "admin@example.com" } },
        error: null,
      });

      const mockProfile = { id: "user-123", role: "admin" };
      mockSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await requireRole("admin", "customer");
      expect(result).not.toBeInstanceOf(Response);
      if (!(result instanceof Response)) {
        expect(result.user.id).toBe("user-123");
        expect(result.profile).toEqual(mockProfile);
      }
    });
  });
});
