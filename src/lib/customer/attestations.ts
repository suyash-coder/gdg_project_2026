/**
 * Customer attestation helper.
 *
 * Wraps POST /api/attestations per DEVELOPMENT_CONTRACT.md.
 * Body: { job_id, status, comment?, token }
 *
 * The token field is required by the updated contract — the server verifies
 * it, marks it consumed_at on success, and prevents re-use.
 */

import type { ApiSuccessResponse, ApiErrorResponse, CustomerAttestation } from "@/lib/types";

export type AttestationResult =
  | { ok: true; attestation: CustomerAttestation }
  | { ok: false; error: string; alreadyExists?: boolean };

export type AttestationStatus = "approved" | "rejected";

export interface SubmitAttestationInput {
  jobId: string;
  token: string;
  status: AttestationStatus;
  comment?: string;
  rating?: number;
  review?: string;
}

/**
 * POST /api/attestations
 * Submits a customer attestation. Consumes the verification token on success.
 * Returns alreadyExists:true when the server returns 409 (double-attestation).
 */
export async function submitAttestation(
  input: SubmitAttestationInput
): Promise<AttestationResult> {
  try {
    const res = await fetch("/api/attestations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: input.jobId,
        token: input.token,
        status: input.status,
        comment: input.comment,
        rating: input.rating,
        review: input.review,
      }),
    });

    const json = (await res.json()) as
      | ApiSuccessResponse<CustomerAttestation>
      | ApiErrorResponse;

    if (!res.ok) {
      return {
        ok: false,
        error: ("error" in json ? json.error : null) ?? "Attestation failed",
        alreadyExists: res.status === 409,
      };
    }

    return {
      ok: true,
      attestation: (json as ApiSuccessResponse<CustomerAttestation>).data,
    };
  } catch {
    return { ok: false, error: "Network error — is the dev server running?" };
  }
}
