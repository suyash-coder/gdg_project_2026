/**
 * GET /api/auth/callback — OAuth callback handler.
 *
 * After Google OAuth sign-in, Supabase redirects here with a `code` param.
 * We exchange the code for a session.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?reason=exchange_failed`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
