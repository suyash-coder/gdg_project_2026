/**
 * POST /api/attestations — Customer attests to a completed job.
 * GET  /api/attestations — List attestations for the current user's jobs.
 *
 * Security:
 *  - Only the customer of the job can attest.
 *  - UNIQUE(job_id) in the DB prevents double attestation.
 *  - Rate limited to prevent spam.
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/middleware";
import { createAttestationSchema } from "@/lib/validation/schemas";
import { attestationLimiter, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Rate limit
  const ip = getClientIp(request);
  if (!attestationLimiter.check(ip)) {
    return Response.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const body = await request.json().catch(() => null);
  const parsed = createAttestationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Verify the user is the customer of this job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, customer_id, status")
    .eq("id", parsed.data.job_id)
    .single();

  if (jobError || !job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.customer_id !== authResult.id) {
    return Response.json(
      { error: "Only the customer of this job can attest" },
      { status: 403 }
    );
  }

  // Check if attestation already exists (belt + suspenders with UNIQUE constraint)
  const { data: existing } = await supabase
    .from("customer_attestations")
    .select("id")
    .eq("job_id", parsed.data.job_id)
    .maybeSingle();

  if (existing) {
    return Response.json(
      { error: "Attestation already exists for this job" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("customer_attestations")
    .insert({
      job_id: parsed.data.job_id,
      customer_id: authResult.id,
      status: parsed.data.status,
      comment: parsed.data.comment ?? null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      return Response.json(
        { error: "Attestation already exists for this job" },
        { status: 409 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data }, { status: 201 });
}

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const supabase = await createClient();
  // RLS ensures only attestations for the user's jobs are returned
  const { data, error } = await supabase
    .from("customer_attestations")
    .select("*, jobs(title, worker_id, customer_id)")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
