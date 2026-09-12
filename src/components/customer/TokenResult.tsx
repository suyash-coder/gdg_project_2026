"use client";

/**
 * TokenResult — displays the outcome of resolving a verification token.
 *
 * Three states from GET /api/verify/[token]:
 *  - valid    → job details + AttestationForm + (post-attestation) PhotoConsentForm
 *  - invalid  → clean error state
 *  - consumed → already-used notice
 *
 * After successful attestation:
 *  - AttestationForm shows a confirmed-submitted state (no re-submission)
 *  - PhotoConsentForm is shown as a distinct, optional next step
 *  - Backend independently enforces UNIQUE(job_id) + consumed_at
 */

import { useState } from "react";
import type { TokenState } from "@/lib/customer/tokens";
import { AttestationForm } from "@/components/customer/AttestationForm";
import { PhotoConsentForm } from "@/components/customer/PhotoConsentForm";

interface TokenResultProps {
  tokenState: TokenState;
  rawToken: string;
}

export function TokenResult({ tokenState, rawToken }: TokenResultProps) {
  // Track attestation completion to show consent step
  const [attestedJobId, setAttestedJobId] = useState<string | null>(null);
  const [consentDone, setConsentDone] = useState(false);

  // ── Valid ─────────────────────────────────────────────────────────────────
  if (tokenState.status === "valid") {
    const { job } = tokenState;

    return (
      <div style={card}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            padding: "16px 20px",
            background: "#f0fdf4",
            borderRadius: 10,
            border: "1px solid #bbf7d0",
          }}
        >
          <span style={{ fontSize: 28 }} aria-hidden>✅</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#15803d", fontSize: 16 }}>
              Valid Verification Token
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#166534" }}>
              Token authenticated · Review job details below
            </p>
          </div>
        </div>

        {/* Worker info (if available from the joined query) */}
        {job.worker && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
              padding: "12px 16px",
              background: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            {job.worker.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.worker.avatar_url}
                alt="Worker avatar"
                width={36}
                height={36}
                style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {(job.worker.display_name ?? "?")[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: "#1e293b", fontSize: 14 }}>
                {job.worker.display_name ?? "Worker"}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Verified worker</p>
            </div>
          </div>
        )}

        {/* Job details */}
        <section>
          <h1 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 700, color: "#1e293b" }}>
            {job.title}
          </h1>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={badge("blue")}>{job.status.replace("_", " ")}</span>
          </div>

          {job.description && (
            <p style={{ margin: "0 0 16px", fontSize: 15, color: "#334155", lineHeight: 1.7 }}>
              {job.description}
            </p>
          )}

          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            Job ID: <code style={{ fontFamily: "monospace" }}>{job.id}</code>
          </p>
        </section>

        {/* Attestation form — hidden after consent is done */}
        {!consentDone && (
          <AttestationForm
            jobId={job.id}
            rawToken={rawToken}
            onSuccess={(id) => setAttestedJobId(id)}
          />
        )}

        {/* Photo consent — shown only after successful attestation */}
        {attestedJobId && !consentDone && (
          <PhotoConsentForm
            jobId={job.id}
            onDone={() => setConsentDone(true)}
          />
        )}

        {/* Final confirmation after both steps done */}
        {consentDone && (
          <div
            style={{
              marginTop: 24,
              padding: "16px 20px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: "#15803d" }}>
              🎉 All done!
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#166534" }}>
              Attestation recorded and photo consent preference saved.
            </p>
          </div>
        )}

        <div style={footerNote}>
          <span aria-hidden>🔒</span>
          Verification powered by WorkProof · Private evidence is never exposed here
        </div>
      </div>
    );
  }

  // ── Consumed ─────────────────────────────────────────────────────────────
  if (tokenState.status === "consumed") {
    return (
      <div style={card}>
        <div
          style={{ ...statusHeader, background: "#fefce8", border: "1px solid #fde68a" }}
        >
          <span style={{ fontSize: 28 }} aria-hidden>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#92400e", fontSize: 16 }}>
              Token Already Used
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#78350f" }}>
              {tokenState.reason}
            </p>
          </div>
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          Each verification token can only be used once. Once an attestation is
          submitted the token is consumed and cannot be reused. If you believe
          this is an error, contact the worker to generate a new link.
        </p>
        <div style={footerNote}>
          <span aria-hidden>🔒</span>
          Token: <code style={{ fontFamily: "monospace", fontSize: 11 }}>{rawToken}</code>
        </div>
      </div>
    );
  }

  // ── Invalid ───────────────────────────────────────────────────────────────
  return (
    <div style={card}>
      <div
        style={{ ...statusHeader, background: "#fff1f2", border: "1px solid #fecdd3" }}
      >
        <span style={{ fontSize: 28 }} aria-hidden>❌</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: "#9f1239", fontSize: 16 }}>
            Invalid or Expired Token
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#be123c" }}>
            {tokenState.reason}
          </p>
        </div>
      </div>
      <p style={{ margin: "16px 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
        This link may have expired or the token is not recognised. Please ask
        the worker to share a fresh verification link.
      </p>
      <div style={footerNote}>
        <span aria-hidden>🔒</span>
        Token: <code style={{ fontFamily: "monospace", fontSize: 11 }}>{rawToken}</code>
      </div>
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  maxWidth: 640,
  margin: "48px auto",
  padding: "32px 36px",
  background: "#ffffff",
  borderRadius: 16,
  boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

const statusHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "16px 20px",
  borderRadius: 10,
  marginBottom: 8,
};

const footerNote: React.CSSProperties = {
  marginTop: 24,
  paddingTop: 16,
  borderTop: "1px solid #f1f5f9",
  fontSize: 12,
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

function badge(color: "blue" | "gray"): React.CSSProperties {
  const palettes = {
    blue: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    gray: { bg: "#f8fafc", border: "#e2e8f0", text: "#475569" },
  };
  const p = palettes[color];
  return {
    display: "inline-block",
    padding: "3px 10px",
    background: p.bg,
    border: `1px solid ${p.border}`,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: p.text,
    textTransform: "capitalize" as const,
  };
}
