/**
 * Security and Authorization Tests.
 *
 * Verifies that the application layer enforces security boundaries.
 * (Database RLS policies provide an additional layer of defense).
 */

import { NextRequest } from "next/server";
import { PATCH as patchProfile } from "@/app/api/profiles/me/route";
import { POST as changeRole } from "@/app/api/admin/change-role/route";
import { POST as createAttestation } from "@/app/api/attestations/route";
import { requireAuth, requireRole } from "@/lib/supabase/middleware";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiLimiter, attestationLimiter } from "@/lib/rate-limit";

// Mock middleware and rate limiters
jest.mock("@/lib/supabase/middleware");
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));
jest.mock("@/lib/rate-limit", () => ({
  apiLimiter: { check: jest.fn() },
  attestationLimiter: { check: jest.fn() },
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

describe("Security Scenarios", () => {
  let mockSupabase: Record<string, unknown>;
  let mockAdmin: Record<string, unknown>;

  beforeEach(() => {
    jest.resetAllMocks();
    (apiLimiter.check as jest.Mock).mockReturnValue(true);
    (attestationLimiter.check as jest.Mock).mockReturnValue(true);

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    mockAdmin = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };
    (createAdminClient as jest.Mock).mockReturnValue(mockAdmin);
  });

  describe("1. Role Escalation Prevention", () => {
    it("prevents a normal user from escalating their own role via profile update", async () => {
      // Mock authenticated worker
      (requireAuth as jest.Mock).mockResolvedValue({ id: "worker-1" });

      const req = new NextRequest("http://localhost/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ role: "admin", display_name: "Sneaky" }),
      });

      const response = await patchProfile(req);
      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body.error).toContain("Cannot update protected field: role");
      
      // Verify database was NOT called
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });

    it("prevents a normal user from using the admin role change endpoint", async () => {
      // Mock requireRole to reject (simulate normal user)
      (requireRole as jest.Mock).mockResolvedValue(
        Response.json({ error: "Insufficient permissions" }, { status: 403 })
      );

      const req = new NextRequest("http://localhost/api/admin/change-role", {
        method: "POST",
        body: JSON.stringify({ user_id: "123e4567-e89b-12d3-a456-426614174001", role: "admin" }),
      });

      const response = await changeRole(req);
      expect(response.status).toBe(403);
      
      // Verify admin client was NOT called
      expect(mockAdmin.update).not.toHaveBeenCalled();
    });
    
    it("allows admin to change roles", async () => {
      // Mock requireRole to accept (simulate admin)
      (requireRole as jest.Mock).mockResolvedValue({
        user: { id: "123e4567-e89b-12d3-a456-426614174002" },
        profile: { role: "admin" }
      });

      (mockAdmin.single as jest.Mock).mockResolvedValue({ data: { id: "123e4567-e89b-12d3-a456-426614174001", role: "admin" }, error: null });

      const req = new NextRequest("http://localhost/api/admin/change-role", {
        method: "POST",
        body: JSON.stringify({ user_id: "123e4567-e89b-12d3-a456-426614174001", role: "admin" }),
      });

      const response = await changeRole(req);
      expect(response.status).toBe(200);
      
      // Verify admin client was called
      expect(mockAdmin.update).toHaveBeenCalledWith({ role: "admin" });
    });
  });

  describe("2. Worker Isolation", () => {
    // Note: In a real integration test against a DB, we'd test that RLS prevents
    // worker A from updating worker B's data even if they bypass the application layer.
    // Here we test the application layer ensures it only updates the authenticated user's ID.
    it("ensures profile updates apply only to the authenticated user's ID", async () => {
      // Mock authenticated as worker-A
      (requireAuth as jest.Mock).mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" });
      (mockSupabase.single as jest.Mock).mockResolvedValue({ data: { id: "00000000-0000-0000-0000-000000000001" }, error: null });

      const req = new NextRequest("http://localhost/api/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({ bio: "My new bio" }),
      });

      await patchProfile(req);
      
      // Verify the query was restricted to worker-A's ID
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000001");
    });
  });

  describe("3. Double Attestation Prevention", () => {
    it("prevents customer from attesting to the same job twice", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({ id: "00000000-0000-0000-0000-000000000003" });
      
      // First query: verify job ownership (customer-1 owns job-1)
      (mockSupabase.single as jest.Mock).mockResolvedValueOnce({
        data: { id: "00000000-0000-0000-0000-000000000010", customer_id: "00000000-0000-0000-0000-000000000003" },
        error: null
      });

      // Second query: verify token
      (mockSupabase.single as jest.Mock).mockResolvedValueOnce({
        data: { id: "token-1", consumed_at: null, expires_at: new Date(Date.now() + 10000).toISOString() },
        error: null
      });

      // Third query: check for existing attestation (simulating one exists)
      (mockSupabase.maybeSingle as jest.Mock).mockResolvedValueOnce({
        data: { id: "00000000-0000-0000-0000-000000000020" },
        error: null
      });

      const req = new NextRequest("http://localhost/api/attestations", {
        method: "POST",
        body: JSON.stringify({ job_id: "55555555-5555-4555-8555-555555555555", status: "approved", token: "valid-token" }),
      });

      const response = await createAttestation(req);
      expect(response.status).toBe(409);
      
      const body = await response.json();
      expect(body.error).toContain("Attestation already exists");
      
      // Verify insert was NOT called
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it("prevents non-customer from attesting to a job", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({ id: "00000000-0000-0000-0000-000000000004" });
      
      // First query: verify job ownership (job belongs to customer-1, not hacker-1)
      (mockSupabase.single as jest.Mock).mockResolvedValueOnce({
        data: { id: "00000000-0000-0000-0000-000000000010", customer_id: "00000000-0000-0000-0000-000000000003" },
        error: null
      });

      const req = new NextRequest("http://localhost/api/attestations", {
        method: "POST",
        body: JSON.stringify({ job_id: "55555555-5555-4555-8555-555555555555", status: "approved", token: "valid-token" }),
      });

      const response = await createAttestation(req);
      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body.error).toContain("Only the customer of this job can attest");
      
      // Verify insert was NOT called
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });
  });
});
