/**
 * GET /api/profiles/public — List public profiles.
 *
 * Uses the public_profiles view which only exposes safe fields
 * for profiles where is_public = true.
 */

import { createClient } from "@/lib/supabase/server";
import { paginationSchema } from "@/lib/validation/schemas";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });

  const page = parsed.success ? parsed.data.page : 1;
  const limit = parsed.success ? parsed.data.limit : 20;
  const offset = (page - 1) * limit;

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("public_profiles")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data,
    pagination: { page, limit, total: count },
  });
}
