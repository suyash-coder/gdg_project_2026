/**
 * Verification token resolver.
 *
 * ════════════════════════════════════════════════════════════════════
 * CONTRACT GAP: No token resolution endpoint is defined in
 * DEVELOPMENT_CONTRACT.md. The `verification_tokens` table has a
 * `deny_all` RLS policy — it is accessible only via the service-role
 * admin client. Person 1 needs to expose:
 *
 *   GET /api/verify/[token]
 *   → { data: { status: 'valid', job: Job } }
 *   → { data: { status: 'consumed', used_at: string } }
 *   → { error: 'Token not found or expired' }  (400/404)
 *
 * ════════════════════════════════════════════════════════════════════
 * INTEGRATION POINT: When Person 1 exposes the endpoint, replace the
 * mock body of `resolveToken` below with:
 *
 *   const res = await fetch(`/api/verify/${encodeURIComponent(token)}`);
 *   const json = await res.json();
 *   if (!res.ok) return { status: 'invalid', reason: json.error };
 *   return json.data as TokenState;
 *
 * No other file needs to change.
 * ════════════════════════════════════════════════════════════════════
 *
 * Mock tokens for UI testing (these simulate seed data):
 *   "demo-valid"     → valid token, shows a completed plumbing job
 *   "demo-consumed"  → token already used
 *   anything else    → invalid / not found / expired
 */

import type { Job } from "@/lib/types";

// ── Result type ───────────────────────────────────────────────────────────────

export type TokenState =
  | {
      status: "valid";
      job: Pick<
        Job,
        "id" | "title" | "description" | "status" | "location" | "created_at"
      >;
    }
  | { status: "invalid"; reason: string }
  | { status: "consumed"; usedAt: string };

// ── Resolver ──────────────────────────────────────────────────────────────────

export async function resolveToken(token: string): Promise<TokenState> {
  // ── MOCK — replace with real fetch when endpoint exists ──────────────────
  await new Promise<void>((r) => setTimeout(r, 40)); // simulate latency

  if (token === "demo-valid") {
    return {
      status: "valid",
      job: {
        id: "seed-job-001",
        title: "Plumbing Repair — Kitchen Sink",
        description:
          "Replaced the U-bend and fixed a slow drain on the kitchen sink. Work completed in under 2 hours.",
        status: "completed",
        location: "Mumbai, Maharashtra",
        created_at: "2026-09-01T10:00:00.000Z",
      },
    };
  }

  if (token === "demo-consumed") {
    return { status: "consumed", usedAt: "2026-09-10T14:32:00.000Z" };
  }

  return { status: "invalid", reason: "Token not found or has expired." };
  // ── END MOCK ──────────────────────────────────────────────────────────────
}
