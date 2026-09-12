"use client";

/**
 * PhotoConsentForm — Customer photo publication consent.
 *
 * SEPARATE from attestation per DEVELOPMENT_CONTRACT.md:
 *   "Photo publication consent is strictly independent of attestation.
 *    A job can reach CUSTOMER_ATTESTED with photo consent = false,
 *    keeping evidence strictly private."
 *
 * Calls POST /api/jobs/[id]/photo-consent with { consent: boolean }.
 *
 * Declining consent:
 *  - Does NOT block attestation
 *  - Evidence stays private (no signed URLs accessible publicly)
 *  - The UI makes this unambiguously clear
 *
 * Out of scope: revocation flow (handled by a future admin/customer settings page).
 */

import { useState } from "react";
import { submitPhotoConsent } from "@/lib/customer/consent";

interface PhotoConsentFormProps {
  jobId: string;
  /** Called when consent is submitted (either grant or decline) */
  onDone: () => void;
}

type Phase = "idle" | "submitting" | "done" | "error";

export function PhotoConsentForm({ jobId, onDone }: PhotoConsentFormProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState<boolean | null>(null);

  async function handleConsent(consent: boolean) {
    setPhase("submitting");
    const result = await submitPhotoConsent(jobId, consent);
    if (result.ok) {
      setSubmitted(consent);
      setPhase("done");
      // Short delay so user can read the confirmation before parent transitions
      setTimeout(onDone, 1800);
    } else {
      setErrorMsg(result.error);
      setPhase("error");
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div
        style={{
          padding: "20px 24px",
          background: submitted ? "#f0fdf4" : "#f8fafc",
          border: `1px solid ${submitted ? "#bbf7d0" : "#e2e8f0"}`,
          borderRadius: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            color: submitted ? "#15803d" : "#475569",
            fontSize: 15,
          }}
        >
          {submitted
            ? "✅ Photo consent granted — evidence may be displayed publicly"
            : "🔒 Photo consent declined — evidence will remain private"}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
          {submitted
            ? "The worker's job evidence may now be shown on their public profile."
            : "Your attestation is still fully recorded. Only evidence visibility is affected."}
        </p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <section
      style={{
        marginTop: 28,
        padding: "20px 24px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
      }}
    >
      <h2
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#1e293b",
          margin: "0 0 6px",
        }}
      >
        📸 Photo publication consent
      </h2>
      <p style={{ margin: "0 0 8px", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
        The worker may have uploaded photos or videos as evidence for this job.
        Do you consent to those being displayed publicly on their WorkProof profile?
      </p>

      {/* Key clarification — per contract note */}
      <div
        style={{
          padding: "10px 14px",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          color: "#1d4ed8",
        }}
      >
        <strong>Note:</strong> Declining consent does not affect your attestation.
        The job will still be marked as attested and count toward the worker&apos;s
        reputation. Only the visibility of photo/video evidence is affected.
      </div>

      {phase === "error" && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: 8,
            fontSize: 13,
            color: "#9f1239",
          }}
          role="alert"
        >
          {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          id="photo-consent-grant-btn"
          type="button"
          disabled={phase === "submitting"}
          onClick={() => handleConsent(true)}
          style={{
            padding: "10px 22px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: phase === "submitting" ? "wait" : "pointer",
            opacity: phase === "submitting" ? 0.7 : 1,
          }}
        >
          {phase === "submitting" ? "Saving…" : "✅ Yes, allow public display"}
        </button>
        <button
          id="photo-consent-decline-btn"
          type="button"
          disabled={phase === "submitting"}
          onClick={() => handleConsent(false)}
          style={{
            padding: "10px 22px",
            background: "transparent",
            color: "#475569",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: phase === "submitting" ? "wait" : "pointer",
          }}
        >
          🔒 No, keep evidence private
        </button>
      </div>
    </section>
  );
}
