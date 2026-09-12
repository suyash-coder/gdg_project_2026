/**
 * POST /api/storage/signed-url — Generate a signed URL for private evidence.
 *
 * Security:
 *  - Requires authentication.
 *  - Verifies the requester is a participant of the job.
 *  - Returns a time-limited signed URL (60 minutes).
 *  - Never exposes the storage_path or bucket directly.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/supabase/middleware";
import { z } from "zod";
import type { NextRequest } from "next/server";

const signedUrlSchema = z.object({
  media_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const body = await request.json().catch(() => null);
  const parsed = signedUrlSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Get the media record — RLS ensures only job participants can see it
  const { data: media, error: mediaError } = await supabase
    .from("job_media")
    .select("id, job_id, storage_path")
    .eq("id", parsed.data.media_id)
    .single();

  if (mediaError || !media) {
    return Response.json(
      { error: "Media not found or access denied" },
      { status: 404 }
    );
  }

  // Use admin client to generate signed URL (bypasses storage RLS)
  const admin = createAdminClient();
  const { data: signedUrl, error: urlError } = await admin.storage
    .from("evidence")
    .createSignedUrl(media.storage_path, 60 * 60); // 1 hour

  if (urlError) {
    return Response.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }

  return Response.json({
    data: {
      url: signedUrl.signedUrl,
      expires_in: 3600,
    },
  });
}
