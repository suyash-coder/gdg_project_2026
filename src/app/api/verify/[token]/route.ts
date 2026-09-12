import { createAdminClient } from "@/lib/supabase/admin";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(request);
  if (!apiLimiter.check(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await params;
  if (!token) {
    return Response.json({ error: "Token is required" }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  
  // Use admin client since this is a public endpoint but jobs/profiles have RLS
  const admin = createAdminClient();

  const { data: tokenRecord, error: tokenError } = await admin
    .from("verification_tokens")
    .select("job_id, consumed_at, expires_at")
    .eq("token_hash", tokenHash)
    .single();

  if (tokenError || !tokenRecord) {
    return Response.json({ error: "Invalid token" }, { status: 404 });
  }

  if (tokenRecord.consumed_at) {
    return Response.json({ error: "Token already consumed" }, { status: 400 });
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return Response.json({ error: "Token expired" }, { status: 400 });
  }

  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select(`
      id, 
      title, 
      description,
      status,
      profiles!worker_id (id, display_name, avatar_url)
    `)
    .eq("id", tokenRecord.job_id)
    .single();

  if (jobError || !job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({ data: { job } });
}
