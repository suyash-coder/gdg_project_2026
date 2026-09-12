import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/supabase/middleware";
import { apiLimiter, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";
import { uploadMediaSchema } from "@/lib/validation/schemas";

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
      { error: "Only the worker of this job can upload media" },
      { status: 403 }
    );
  }

  // Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "File is required" }, { status: 400 });
  }

  const mediaType = formData.get("media_type") as string;
  const caption = formData.get("caption") as string | undefined;

  const parsed = uploadMediaSchema.safeParse({
    job_id: jobId,
    media_type: mediaType,
    caption: caption || undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Generate a unique storage path: {jobId}/{timestamp}_{filename}
  const storagePath = `${jobId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  // Upload to Supabase Storage using admin client (bypasses storage RLS, allowing secure backend upload)
  const admin = createAdminClient();
  
  const fileBuffer = await file.arrayBuffer();
  
  const { error: uploadError } = await admin.storage
    .from("evidence")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: "Failed to upload file to storage" }, { status: 500 });
  }

  // Insert into job_media (authenticated client enforces DB RLS)
  const { data: media, error: insertError } = await supabase
    .from("job_media")
    .insert({
      job_id: jobId,
      uploader_id: authResult.id,
      media_type: parsed.data.media_type,
      storage_path: storagePath,
      caption: parsed.data.caption,
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: "Failed to record media in database" }, { status: 500 });
  }

  return Response.json({ data: media }, { status: 201 });
}
