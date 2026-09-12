/**
 * GET  /api/profiles/me   — Get current user's profile
 * PATCH /api/profiles/me  — Update current user's profile
 *
 * Protected fields (role, reputation_score) cannot be updated by the client.
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/middleware";
import {
  updateProfileSchema,
  PROFILE_PROTECTED_FIELDS,
} from "@/lib/validation/schemas";
import type { NextRequest } from "next/server";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authResult.id)
    .single();

  if (error) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  return Response.json({ data });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Strip any protected fields from the update
  for (const field of PROFILE_PROTECTED_FIELDS) {
    if (field in body) {
      return Response.json(
        { error: `Cannot update protected field: ${field}` },
        { status: 403 }
      );
    }
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", authResult.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
