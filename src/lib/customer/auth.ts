/**
 * Customer auth helpers.
 *
 * Thin fetch wrappers around the contract auth endpoints.
 * Do NOT duplicate logic here — just call the API routes.
 *
 * CONTRACT NOTE (Gap 3): POST /api/auth/signup always triggers
 * fn_handle_new_user() which hard-codes role = 'worker'. There is no
 * client-accessible way to sign up as a 'customer'. An admin must call
 * POST /api/admin/change-role after signup. This is reflected in the UI.
 */

import type { ApiSuccessResponse, ApiErrorResponse } from "@/lib/types";

// ── Result types ──────────────────────────────────────────────────────────────

export type SignUpResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; error: string };

export type SignInResult =
  | { ok: true; userId: string; email: string; expiresAt: string }
  | { ok: false; error: string };

// ── Wrappers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Creates a new user. Role will be 'worker' until an admin upgrades it.
 */
export async function signUpCustomer(
  email: string,
  password: string,
  displayName?: string
): Promise<SignUpResult> {
  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
    const json = (await res.json()) as
      | ApiSuccessResponse<{ user: { id: string; email: string } }>
      | ApiErrorResponse;

    if (!res.ok) {
      return {
        ok: false,
        error: ("error" in json ? json.error : null) ?? "Signup failed",
      };
    }
    const data = (json as ApiSuccessResponse<{ user: { id: string; email: string } }>).data;
    return { ok: true, userId: data.user.id, email: data.user.email };
  } catch {
    return { ok: false, error: "Network error — is the dev server running?" };
  }
}

/**
 * POST /api/auth/login
 */
export async function signInCustomer(
  email: string,
  password: string
): Promise<SignInResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json()) as
      | ApiSuccessResponse<{
          user: { id: string; email: string };
          session: { expires_at: string };
        }>
      | ApiErrorResponse;

    if (!res.ok) {
      return {
        ok: false,
        error: ("error" in json ? json.error : null) ?? "Login failed",
      };
    }
    const data = (
      json as ApiSuccessResponse<{
        user: { id: string; email: string };
        session: { expires_at: string };
      }>
    ).data;
    return {
      ok: true,
      userId: data.user.id,
      email: data.user.email,
      expiresAt: data.session.expires_at,
    };
  } catch {
    return { ok: false, error: "Network error — is the dev server running?" };
  }
}

/**
 * POST /api/auth/logout
 */
export async function signOutCustomer(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
