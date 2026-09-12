/**
 * Admin-only API routes.
 *
 * POST /api/admin/change-role — Change a user's role (admin only)
 *
 * Security:
 *  - requireRole('admin') enforces server-side authorization.
 *  - Admin actions are logged to admin_actions table.
 *  - Role changes use the service-role admin client.
 */

import { requireRole } from "@/lib/supabase/middleware";
import { createAdminClient } from "@/lib/supabase/admin";
import { changeRoleSchema } from "@/lib/validation/schemas";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!apiLimiter.check(ip)) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  // Server-side admin authorization
  const roleResult = await requireRole("admin");
  if (roleResult instanceof Response) return roleResult;

  const body = await request.json().catch(() => null);
  const parsed = changeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { user_id, role } = parsed.data;
  const admin = createAdminClient();

  // Update role using service-role client (bypasses RLS)
  const { data, error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", user_id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Log the admin action
  await admin.from("admin_actions").insert({
    admin_id: roleResult.user.id,
    action_type: "change_role",
    target_type: "profile",
    target_id: user_id,
    details: { new_role: role },
  });

  return Response.json({ data });
}
