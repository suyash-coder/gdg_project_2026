/**
 * Photo consent helper.
 *
 * Wraps POST /api/jobs/[id]/photo-consent per DEVELOPMENT_CONTRACT.md.
 * Body: { consent: boolean }
 *
 * Photo publication consent is STRICTLY INDEPENDENT of attestation.
 * A job can reach CUSTOMER_ATTESTED with consent = false.
 * Declining does NOT block attestation — only evidence visibility is affected.
 */

import type { ApiSuccessResponse, ApiErrorResponse, CustomerPhotoConsent } from "@/lib/types";

export type ConsentResult =
  | { ok: true; record: CustomerPhotoConsent }
  | { ok: false; error: string };

/**
 * POST /api/jobs/[id]/photo-consent
 * Grants or revokes permission to display evidence publicly.
 */
export async function submitPhotoConsent(
  jobId: string,
  consent: boolean
): Promise<ConsentResult> {
  try {
    const res = await fetch(`/api/jobs/${jobId}/photo-consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent }),
    });

    const json = (await res.json()) as
      | ApiSuccessResponse<CustomerPhotoConsent>
      | ApiErrorResponse;

    if (!res.ok) {
      return {
        ok: false,
        error: ("error" in json ? json.error : null) ?? "Photo consent failed",
      };
    }

    return {
      ok: true,
      record: (json as ApiSuccessResponse<CustomerPhotoConsent>).data,
    };
  } catch {
    return { ok: false, error: "Network error — is the dev server running?" };
  }
}
