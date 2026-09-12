import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/middleware";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import crypto from "crypto";

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

  const supabase = await createClient();

  // Verify the user is the worker of this job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, worker_id")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.worker_id !== authResult.id) {
    return Response.json(
      { error: "Only the worker of this job can generate a verification token" },
      { status: 403 }
    );
  }

  // Generate a random 32-byte token
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Store only the hash in the database using the admin client (RLS denies all for regular clients)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();
  const { error: insertError } = await adminClient
    .from("verification_tokens")
    .insert({
      job_id: jobId,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days
    });

  if (insertError) {
    return Response.json({ error: "Failed to create token" }, { status: 500 });
  }

  // Return the raw token to the worker ONLY ONCE
  return Response.json({ data: { token: rawToken } }, { status: 201 });
}
