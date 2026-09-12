/**
 * upload-adapter.ts
 *
 * Worker 2 — Evidence upload adapter / integration seam.
 *
 * This is the ONLY place in the Worker 2 codebase that knows about
 * the backend upload endpoint. All other components call this function
 * and do not know how the server upload works.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  INTEGRATION BOUNDARY — ACTION REQUIRED FROM WORKER 1           │
 * │                                                                  │
 * │  The backend endpoint POST /api/jobs/[id]/media does NOT exist  │
 * │  in the current branch. This adapter returns                    │
 * │  { ok: false, error: { kind: "upload_endpoint_unavailable" } }  │
 * │  until Worker 1 provides the confirmed route.                   │
 * │                                                                  │
 * │  When Worker 1 delivers the endpoint, replace ONLY the          │
 * │  _callMediaUploadEndpoint() function body below.                │
 * │                                                                  │
 * │  Expected endpoint contract (from uploadMediaSchema):           │
 * │    POST /api/jobs/[id]/media                                    │
 * │    Content-Type: multipart/form-data                            │
 * │    Fields:                                                       │
 * │      file     — the processed Blob (JPEG)                       │
 * │      media_type — "photo"                                       │
 * │      caption  — "before" | "after"                              │
 * │      sha256   — hex digest of file bytes                        │
 * │      perceptual_hash — dHash hex                                │
 * │    Response: { data: { id, storage_path, ... } } (JobMedia)     │
 * │    Auth: cookie session (existing Supabase SSR pattern)          │
 * │    Errors: { error: string } with 400/401/403/409/500           │
 * └─────────────────────────────────────────────────────────────────┘
 */

import type {
  EvidenceUploadRequest,
  EvidenceError,
  UploadResult,
} from "./evidence-types";

/**
 * Internal: call the backend media upload endpoint.
 *
 * TODO (Worker 1): Implement POST /api/jobs/[id]/media.
 * Replace this function body when the endpoint is confirmed.
 * Do NOT change the function signature — the adapter interface is stable.
 */
async function _callMediaUploadEndpoint(
  req: EvidenceUploadRequest
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", req.file, `evidence-${req.evidenceType}.jpg`);
  formData.append("media_type", "photo");
  formData.append("caption", req.evidenceType); // "before" | "after"
  formData.append("sha256", req.sha256);
  formData.append("perceptual_hash", req.perceptualHash);

  let res: Response;
  try {
    res = await fetch(`/api/jobs/${req.jobId}/media`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch {
    return {
      ok: false,
      error: {
        kind: "network_failure",
        message: "Network error. Check your connection and try again.",
        retryable: true,
      },
    };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.error ?? "Upload failed. Please try again.";
    const kind: EvidenceError["kind"] =
      res.status === 409 ? "invalid_job_state" : "upload_failure";
    return {
      ok: false,
      error: { kind, message: msg, retryable: res.status >= 500 },
    };
  }

  const json = await res.json();
  return { ok: true, mediaId: json.data.id };
}

/**
 * uploadJobEvidence — public adapter function.
 *
 * Called by the evidence UI after the full client-side pipeline
 * (capture → process → hash) is complete.
 *
 * Responsibilities:
 *  - Pass processed evidence to the backend contract.
 *  - Return a typed UploadResult (never throw).
 *  - Never expose endpoint URL or storage paths to callers.
 *
 * @param req - Processed evidence + job context
 * @returns UploadResult — { ok: true, mediaId } | { ok: false, error }
 */
export async function uploadJobEvidence(
  req: EvidenceUploadRequest
): Promise<UploadResult> {
  // Basic client-side guard — belt + suspenders
  if (!req.jobId || !req.file || !req.sha256) {
    return {
      ok: false,
      error: {
        kind: "upload_failure",
        message: "Invalid upload request: missing required fields.",
        retryable: false,
      },
    };
  }

  if (req.file.size === 0) {
    return {
      ok: false,
      error: {
        kind: "invalid_image",
        message: "Processed image is empty — cannot upload.",
        retryable: false,
      },
    };
  }

  return _callMediaUploadEndpoint(req);
}
