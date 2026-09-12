/**
 * GET   /api/jobs/[id] — Get a specific job
 * PATCH /api/jobs/[id] — Update a job
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/middleware";
import { updateJobSchema, JOB_PROTECTED_FIELDS } from "@/lib/validation/schemas";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { id } = await params;
  const supabase = await createClient();

  // RLS restricts to jobs where user is worker or customer
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Reject protected fields
  for (const field of JOB_PROTECTED_FIELDS) {
    if (field in body) {
      return Response.json(
        { error: `Cannot update protected field: ${field}` },
        { status: 403 }
      );
    }
  }

  const parsed = updateJobSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // RLS ensures only worker/customer can update
  const { data, error } = await supabase
    .from("jobs")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
