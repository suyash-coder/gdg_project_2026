/**
 * Auth middleware helpers for API route handlers.
 *
 * Provides functions to:
 *  - Require authentication (any logged-in user)
 *  - Require a specific role (worker, customer, admin)
 *  - Get the current user's profile
 */

import { createClient } from "@/lib/supabase/server";
import type { UserRole, Profile } from "@/lib/types";

export interface AuthUser {
  id: string;
  email: string | undefined;
}

/**
 * Require an authenticated user. Returns the user or a 401 Response.
 */
export async function requireAuth(): Promise<AuthUser | Response> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  return { id: user.id, email: user.email };
}

/**
 * Require a specific role. Returns the profile or a 403 Response.
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<{ user: AuthUser; profile: Profile } | Response> {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authResult.id)
    .single();

  if (error || !profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!allowedRoles.includes(profile.role as UserRole)) {
    return Response.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return { user: authResult, profile: profile as Profile };
}

/**
 * Get the current user's profile (if authenticated).
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}
