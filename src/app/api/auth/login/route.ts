/**
 * POST /api/auth/login — Sign in with email/password.
 */

import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation/schemas";
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
  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  return Response.json({
    data: {
      user: { id: data.user.id, email: data.user.email },
      session: { expires_at: data.session.expires_at },
    },
  });
}
