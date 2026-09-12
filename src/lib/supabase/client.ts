/**
 * Supabase browser client.
 *
 * Uses ONLY the anon key — safe to use in client components.
 * Auth is managed via cookies (set by @supabase/ssr).
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
} from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
