/**
 * Supabase admin client (service-role).
 *
 * DANGER: This bypasses RLS entirely.
 * Only use in server-side code for privileged operations:
 *   - Setting user roles
 *   - Creating verification tokens
 *   - Admin moderation actions
 *   - Reputation recalculation
 *
 * NEVER import this file from client-side code.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createAdminClient() {
  const env = getServerEnv();
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
