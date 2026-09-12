/**
 * Safe environment variable handling.
 *
 * - Public vars (NEXT_PUBLIC_*) are available in both client and server.
 * - Server vars are only available in server-side code.
 * - Throws at import-time if a required variable is missing,
 *   so we fail fast rather than at first use.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Check your .env.local file.`
    );
  }
  return value;
}

// ── Public (safe to expose to browser) ──────────────────────────────
export const NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ── Server-only (never imported from client code) ───────────────────
export function getServerEnv() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  } as const;
}
