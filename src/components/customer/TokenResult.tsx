/**
 * TokenResult — displays the outcome of resolving a verification token.
 *
 * Three states per the task scope:
 *  - valid    → show job details
 *  - invalid  → clean error state
 *  - consumed → already-used notice
 *
 * Attestation submission is explicitly OUT OF SCOPE for checkpoint 1.
 */

import type { TokenState } from "@/lib/customer/tokens";

interface TokenResultProps {
  tokenState: TokenState;
  rawToken: string;
}

export function TokenResult({ tokenState, rawToken }: TokenResultProps) {
  if (tokenState.status === "valid") {
    const { job } = tokenState;
    const date = new Date(job.created_at).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

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
            <p
              style={{ margin: 0, fontWeight: 700, color: "#15803d", fontSize: 16 }}
            >
              Valid Verification Token
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#166534" }}>
              Token authenticated · Job details below
            </p>
          </div>
        </div>

        {/* Job details */}
        <section>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 22,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            {job.title}
          </h1>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={badge("blue")}>{job.status.replace("_", " ")}</span>
            {job.location && (
              <span style={badge("gray")}>📍 {job.location}</span>
            )}
            <span style={badge("gray")}>📅 {date}</span>
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

        <div style={footerNote}>
          <span aria-hidden>ℹ️</span>
          Attestation submission is coming in a future release.
        </div>
      </div>
    );
  }

  if (tokenState.status === "consumed") {
    const usedDate = new Date(tokenState.usedAt).toLocaleString("en-IN");
    return (
      <div style={card}>
        <div style={{ ...statusHeader, background: "#fefce8", border: "1px solid #fde68a" }}>
          <span style={{ fontSize: 28 }} aria-hidden>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#92400e", fontSize: 16 }}>
              Token Already Used
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#78350f" }}>
              This verification link was consumed on {usedDate}
            </p>
          </div>
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
          Each verification token can only be used once. If you believe this is
          an error, please contact the worker to generate a new link.
        </p>
        <div style={footerNote}>
          <span aria-hidden>🔒</span>
          Token: <code style={{ fontFamily: "monospace", fontSize: 11 }}>{rawToken}</code>
        </div>
      </div>
    );
  }

  // status === "invalid"
  return (
    <div style={card}>
      <div style={{ ...statusHeader, background: "#fff1f2", border: "1px solid #fecdd3" }}>
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
  maxWidth: 600,
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

function badge(
  color: "blue" | "gray"
): React.CSSProperties {
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
