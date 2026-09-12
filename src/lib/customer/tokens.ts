/**
 * Verification token resolver.
 *
 * Calls GET /api/verify/[token] per DEVELOPMENT_CONTRACT.md.
 * The endpoint uses the admin client to bypass `deny_all` RLS on
 * verification_tokens. No session is required to call it.
 *
 * Response shapes from Person 1's implementation:
 *   200 → { data: { job: { id, title, description, status, profiles!worker_id } } }
 *   400 → { error: "Token already consumed" }
 *   400 → { error: "Token expired" }
 *   404 → { error: "Invalid token" }
 *   429 → rate limited
 */

import type { Job } from "@/lib/types";

// ── Result type ───────────────────────────────────────────────────────────────

// Worker info is joined from profiles via profiles!worker_id in the query
export interface TokenWorker {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export type TokenState =
  | {
      status: "valid";
      job: Pick<Job, "id" | "title" | "description" | "status"> & {
        worker?: TokenWorker;
      };
    }
  | { status: "invalid"; reason: string }
  | { status: "consumed"; reason: string };

// ── Resolver ──────────────────────────────────────────────────────────────────

export async function resolveToken(token: string): Promise<TokenState> {
  if (!token) {
    return { status: "invalid", reason: "Token is required." };
  }

  let res: Response;
  try {
    res = await fetch(`/api/verify/${encodeURIComponent(token)}`, {
      // No auth header needed — endpoint is public
      cache: "no-store",
    });
  } catch {
    return { status: "invalid", reason: "Network error — could not reach server." };
  }

  // Rate limited
  if (res.status === 429) {
    return { status: "invalid", reason: "Too many requests. Please try again shortly." };
  }

  const json = await res.json().catch(() => ({ error: "Unexpected server response" }));

  if (res.ok) {
    // 200: valid token, job returned
    const { job } = (json as { data: { job: unknown } }).data as {
      data: {
        job: {
          id: string;
          title: string;
          description: string | null;
          status: string;
          profiles?: TokenWorker; // aliased from profiles!worker_id
        };
      };
    }["data"];

    return {
      status: "valid",
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status as Job["status"],
        worker: job.profiles ?? undefined,
      },
    };
  }

  // Non-2xx — parse the error message
  const errorMsg: string =
    (json as { error?: string }).error ?? "Unknown error";

  if (
    errorMsg === "Token already consumed" ||
    errorMsg.toLowerCase().includes("consumed")
  ) {
    return { status: "consumed", reason: errorMsg };
  }

  // Invalid token (404), expired (400 "Token expired"), or anything else
  return { status: "invalid", reason: errorMsg };
}
