/**
 * verification-adapter.ts
 *
 * Worker 2 — Customer verification integration seam.
 *
 * This adapter is responsible for fetching or generating the unique
 * verification URL for a completed job.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  INTEGRATION BOUNDARY — ACTION REQUIRED FROM WORKER 1           │
 * │                                                                  │
 * │  The backend endpoint POST /api/jobs/[id]/verification does     │
 * │  NOT exist in the current branch. This adapter returns          │
 * │  an honest "endpoint_unavailable" error until Worker 1          │
 * │  provides the confirmed route.                                  │
 * │                                                                  │
 * │  Expected endpoint contract:                                    │
 * │    POST /api/jobs/[id]/verification                             │
 * │    Response: { data: { url: string, expires_at: string } }      │
 * └─────────────────────────────────────────────────────────────────┘
 */

export type VerificationErrorKind =
  | "endpoint_unavailable"
  | "network_failure"
  | "unauthorized"
  | "invalid_job_state"
  | "server_error";

export interface VerificationError {
  kind: VerificationErrorKind;
  message: string;
  retryable: boolean;
}

export type VerificationResult =
  | { ok: true; url: string; expiresAt?: string }
  | { ok: false; error: VerificationError };

/**
 * generateCustomerVerification
 *
 * Public adapter function called by the UI to obtain the verification URL.
 */
export async function generateCustomerVerification(
  jobId: string
): Promise<VerificationResult> {
  if (!jobId) {
    return {
      ok: false,
      error: {
        kind: "invalid_job_state",
        message: "Invalid job ID provided.",
        retryable: false,
      },
    };
  }

  // ── STUB: endpoint not yet available ──────────────────────────────
  // This is an honest "not yet". We do NOT pretend success or fabricate URLs.
  // When Worker 1 delivers the endpoint, replace this block with the fetch call.
  return {
    ok: false,
    error: {
      kind: "endpoint_unavailable",
      message:
        "Customer verification generation is not yet available. " +
        "Worker 1 must implement POST /api/jobs/[id]/verification.",
      retryable: true,
    },
  };

  /*
  ── Future implementation (replace stub above when endpoint exists) ──

  let res: Response;
  try {
    res = await fetch(`/api/jobs/${jobId}/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return {
      ok: false,
      error: {
        kind: "network_failure",
        message: "Network error. Please check your connection and try again.",
        retryable: true,
      },
    };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.error ?? "Failed to generate verification link.";
    let kind: VerificationErrorKind = "server_error";
    if (res.status === 401 || res.status === 403) kind = "unauthorized";
    if (res.status === 409 || res.status === 400) kind = "invalid_job_state";
    
    return {
      ok: false,
      error: { kind, message: msg, retryable: res.status >= 500 },
    };
  }

  const json = await res.json();
  return {
    ok: true,
    url: json.data.url,
    expiresAt: json.data.expires_at,
  };
  */
}
