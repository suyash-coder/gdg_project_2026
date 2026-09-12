import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/middleware";
import { createPhotoConsentSchema } from "@/lib/validation/schemas";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  if (!apiLimiter.check(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const { id: jobId } = await params;
  if (!jobId) {
    return Response.json({ error: "Job ID is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPhotoConsentSchema.safeParse(body);
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
    .select("id, customer_id")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.customer_id !== authResult.id) {
    return Response.json(
      { error: "Only the customer of this job can provide photo consent" },
      { status: 403 }
    );
  }

  // Check if there is an existing consent record
  const { data: existing } = await supabase
    .from("customer_photo_consents")
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  let result;
  if (parsed.data.consent) {
    // Provide consent
    if (existing) {
      result = await supabase
        .from("customer_photo_consents")
        .update({ revoked_at: null })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("customer_photo_consents")
        .insert({
          job_id: jobId,
          customer_id: authResult.id,
        })
        .select()
        .single();
    }
  } else {
    // Revoke consent
    if (existing) {
      result = await supabase
        .from("customer_photo_consents")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
       result = await supabase
        .from("customer_photo_consents")
        .insert({
          job_id: jobId,
          customer_id: authResult.id,
          revoked_at: new Date().toISOString()
        })
        .select()
        .single();
    }
  }

  if (result.error) {
    return Response.json({ error: result.error.message }, { status: 500 });
  }

  return Response.json({ data: result.data });
}
