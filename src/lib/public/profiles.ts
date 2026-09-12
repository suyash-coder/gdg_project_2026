/**
 * Public profile helpers — server-side.
 *
 * CONTRACT NOTE: GET /api/profiles/public/[id] (single profile) is not defined
 * in DEVELOPMENT_CONTRACT.md. Only the paginated list exists at
 * GET /api/profiles/public.
 *
 * We query the `public_profiles` view directly using the same Supabase server
 * client and pattern as src/app/api/profiles/public/route.ts. The view only
 * exposes the contract-approved public fields for profiles where is_public = true.
 *
 * Use from Server Components only (imports @/lib/supabase/server).
 */

import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/types";

/**
 * Fetch one worker's public profile by ID.
 * Returns null if the worker does not exist or has is_public = false.
 */
export async function getPublicProfile(
  workerId: string
): Promise<PublicProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, display_name, bio, avatar_url, city, reputation_score, average_rating, rating_count, repeat_customers")
    .eq("id", workerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicProfile;
}
