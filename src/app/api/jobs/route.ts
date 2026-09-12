/**
 * GET  /api/jobs — List current user's jobs
 * POST /api/jobs — Create a new job
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/middleware";
import {
  createJobSchema,
  paginationSchema,
} from "@/lib/validation/schemas";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { searchParams } = request.nextUrl;
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });

  const page = parsed.success ? parsed.data.page : 1;
  const limit = parsed.success ? parsed.data.limit : 20;
  const offset = (page - 1) * limit;

  const supabase = await createClient();
  // RLS ensures the user only sees their own jobs
  const { data, error, count } = await supabase
    .from("jobs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data,
    pagination: { page, limit, total: count },
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!apiLimiter.check(ip)) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const body = await request.json().catch(() => null);
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...parsed.data,
      worker_id: authResult.id, // Always set to current user
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data }, { status: 201 });
}
