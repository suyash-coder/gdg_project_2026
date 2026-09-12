"use client";

/**
 * AttestationForm — Customer attestation submission.
 *
 * Shown only when the token is valid and the customer is authenticated.
 * Submits to POST /api/attestations with { job_id, status, comment, token }.
 *
 * After a successful submission:
 *  - Renders a read-only confirmation state (no re-submission possible in UI)
 *  - The backend also enforces UNIQUE(job_id) and consumed_at on the token
 *
 * Photo consent is a SEPARATE step (see PhotoConsentForm) — do not bundle.
 *
 * Out of scope for this pass: rating/review.
 */

import { useState, type FormEvent } from "react";
import { submitAttestation } from "@/lib/customer/attestations";
import type { AttestationStatus } from "@/lib/customer/attestations";

interface AttestationFormProps {
  jobId: string;
  rawToken: string;
  /** Called when attestation succeeds, so parent can transition to consent step */
  onSuccess: (attestationId: string) => void;
}

type Phase = "idle" | "submitting" | "done" | "error" | "already_attested";

export function AttestationForm({ jobId, rawToken, onSuccess }: AttestationFormProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [verdict, setVerdict] = useState<AttestationStatus>("approved");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase("submitting");

    const fd = new FormData(e.currentTarget);
    const status = (fd.get("status") as AttestationStatus) ?? "approved";
    const comment = (fd.get("comment") as string | null)?.trim() || undefined;

    const result = await submitAttestation({
      jobId,
      token: rawToken,
      status,
      comment,
    });

    if (result.ok) {
      setPhase("done");
      onSuccess(result.attestation.id);
    } else if (result.alreadyExists) {
      setPhase("already_attested");
    } else {
      setErrorMsg(result.error);
      setPhase("error");
    }
  }

  // ── Already attested (409 or UI guard) ───────────────────────────────────
  if (phase === "already_attested") {
    return (
      <div style={sectionBox("#fefce8", "#fde68a")}>
        <p style={{ margin: 0, fontWeight: 700, color: "#92400e" }}>
          ⚠️ This job has already been attested
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#78350f" }}>
          Only one attestation per job is permitted. If you need to dispute
          this, contact the platform admin.
        </p>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div style={sectionBox("#f0fdf4", "#bbf7d0")}>
        <p style={{ margin: 0, fontWeight: 700, color: "#15803d" }}>
          ✅ Attestation submitted
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#166534" }}>
          Your {verdict === "approved" ? "approval" : "rejection"} has been
          recorded. The token has been consumed and cannot be reused.
        </p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <section>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#1e293b",
          margin: "28px 0 4px",
          paddingTop: 20,
          borderTop: "1px solid #f1f5f9",
        }}
      >
        Attest this job
      </h2>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
        Confirm the worker performed the job as described and evidence matches.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Verdict radio */}
        <fieldset
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <legend
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "0 6px",
            }}
          >
            Verdict
          </legend>

          <label style={radioLabel}>
            <input
              type="radio"
              name="status"
              value="approved"
              id="attest-approved"
              defaultChecked
              onChange={() => setVerdict("approved")}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontWeight: 600, color: "#15803d" }}>✅ Approve</span>
            <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>
              — Work was completed as described
            </span>
          </label>

          <label style={{ ...radioLabel, marginTop: 10 }}>
            <input
              type="radio"
              name="status"
              value="rejected"
              id="attest-rejected"
              onChange={() => setVerdict("rejected")}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontWeight: 600, color: "#9f1239" }}>❌ Reject</span>
            <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>
              — Work was not completed or doesn&apos;t match evidence
            </span>
          </label>
        </fieldset>

        {/* Comment */}
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="attest-comment"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Comment{" "}
            <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional, max 1000 chars)</span>
          </label>
          <textarea
            id="attest-comment"
            name="comment"
            maxLength={1000}
            rows={3}
            disabled={phase === "submitting"}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 14px",
              fontSize: 14,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
            }}
            placeholder="Describe the work outcome, quality, or any issues…"
          />
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

        <button
          id="attest-submit-btn"
          type="submit"
          disabled={phase === "submitting"}
          style={{
            padding: "11px 24px",
            background:
              verdict === "approved"
                ? "linear-gradient(135deg, #16a34a, #15803d)"
                : "linear-gradient(135deg, #dc2626, #b91c1c)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: phase === "submitting" ? "wait" : "pointer",
            opacity: phase === "submitting" ? 0.7 : 1,
          }}
        >
          {phase === "submitting"
            ? "Submitting…"
            : verdict === "approved"
            ? "Submit Approval"
            : "Submit Rejection"}
        </button>
      </form>
    </section>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sectionBox(bg: string, border: string): React.CSSProperties {
  return {
    marginTop: 24,
    padding: "16px 20px",
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 10,
  };
}

const radioLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  fontSize: 15,
};
