/**
 * POST /api/auth/signup — Register a new user with email/password.
 *
 * The fn_handle_new_user() trigger automatically creates a profile row.
 */

import { createClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/schemas";
import { authLimiter, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIp(request);
  if (!authLimiter.check(ip)) {
    return Response.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  // Validate input
  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, display_name } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: display_name ?? email.split("@")[0] },
    },
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json(
    { data: { user: { id: data.user?.id, email: data.user?.email } } },
    { status: 201 }
  );
}
