"use client";

/**
 * VerificationHandoff.tsx
 *
 * Worker 2 — Client component for generating and sharing the customer verification link.
 *
 * Requirements:
 * - Handled state: idle → generating → success | error
 * - Must NOT fabricate a token client-side.
 * - Uses Web Share API with a graceful fallback to clipboard copy.
 * - QR code placeholder implemented using simple HTML/CSS (since no dependency approved yet).
 */

import { useState, useCallback, useRef } from "react";
import { generateCustomerVerification } from "@/lib/verification/verification-adapter";

interface VerificationHandoffProps {
  jobId: string;
}

type UIState = "idle" | "generating" | "success" | "error";

export default function VerificationHandoff({ jobId }: VerificationHandoffProps) {
  const [uiState, setUiState] = useState<UIState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generate = useCallback(async () => {
    setUiState("generating");
    setErrorMsg(null);

    const result = await generateCustomerVerification(jobId);

    if (!result.ok) {
      setErrorMsg(result.error.message);
      setUiState("error");
      return;
    }

    setUrl(result.url);
    setUiState("success");
  }, [jobId]);

  const handleShare = useCallback(async () => {
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Verify WorkProof Job",
          text: "Please verify the completed job on WorkProof:",
          url,
        });
        return;
      } catch (err) {
        // User cancelled share or it failed — fallback to copy
        // Do not log: share failure may include URL in error context
        if ((err as Error).name === "AbortError") return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback("Copied to clipboard!");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      setCopyFeedback("Failed to copy link");
    }
  }, [url]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Customer Verification</h3>

      {uiState === "idle" && (
        <div style={styles.content}>
          <p style={styles.desc}>
            Generate a verification link to hand off to the customer.
            They will review the evidence and attest to the job completion.
          </p>
          <button onClick={generate} style={styles.primaryBtn} id="generate-verification-btn">
            Generate Verification Link
          </button>
        </div>
      )}

      {uiState === "generating" && (
        <div style={styles.statusContainer}>
          <div style={styles.spinner} />
          <p style={styles.statusText}>Generating unique link…</p>
        </div>
      )}

      {uiState === "error" && (
        <div style={styles.errorBox}>
          <p style={styles.errorTitle}>Cannot Generate Link</p>
          <p style={styles.errorText}>{errorMsg}</p>
          <button onClick={generate} style={styles.retryBtn} id="retry-verification-btn">
            Try Again
          </button>
        </div>
      )}

      {uiState === "success" && url && (
        <div style={styles.successContainer}>
          <p style={styles.instruction}>
            Share this link or QR with the customer. The customer must confirm
            the completed job from their own account.
          </p>

          {/* QR Code Placeholder (since no dependency is approved) */}
          <div style={styles.qrContainer}>
            <div style={styles.qrPlaceholder}>
              [ QR Code Placeholder ]<br />
              <span style={{ fontSize: "11px", fontWeight: "normal" }}>Awaiting dependency approval</span>
            </div>
          </div>

          <div style={styles.urlBox}>
            <input
              type="text"
              readOnly
              value={url}
              style={styles.urlInput}
              aria-label="Verification URL"
            />
          </div>

          <button onClick={handleShare} style={styles.primaryBtn} id="share-verification-btn">
            Share with customer
          </button>
          
          {copyFeedback && <p style={styles.feedbackText}>{copyFeedback}</p>}

          <p style={styles.notice}>
            *Customer attestation pending. This job will only count towards your
            reputation after the customer approves it.
          </p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px",
    marginTop: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  title: { fontSize: "16px", fontWeight: "700" },
  content: { display: "flex", flexDirection: "column", gap: "12px" },
  desc: { fontSize: "14px", color: "var(--muted)", lineHeight: "1.5" },
  primaryBtn: {
    padding: "14px",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    border: "none",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
  },
  statusContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 0",
    gap: "12px",
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "2px solid var(--border)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  statusText: { fontSize: "14px", color: "var(--muted)" },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "var(--radius)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  errorTitle: { fontSize: "14px", fontWeight: "700", color: "var(--danger)" },
  errorText: { fontSize: "13px", color: "var(--danger)", lineHeight: "1.4" },
  retryBtn: {
    padding: "10px",
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  successContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    alignItems: "center",
  },
  instruction: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--foreground)",
    textAlign: "center",
    lineHeight: "1.4",
  },
  qrContainer: {
    width: "160px",
    height: "160px",
    padding: "8px",
    background: "#fff",
    border: "1px solid var(--border)",
    borderRadius: "8px",
  },
  qrPlaceholder: {
    width: "100%",
    height: "100%",
    background: "#f0f0f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "#666",
    fontSize: "13px",
    fontWeight: "600",
    border: "2px dashed #ccc",
    borderRadius: "4px",
    padding: "8px",
  },
  urlBox: { width: "100%" },
  urlInput: {
    width: "100%",
    padding: "12px",
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontSize: "13px",
    color: "var(--foreground)",
    fontFamily: "monospace",
  },
  feedbackText: {
    fontSize: "13px",
    color: "var(--success)",
    fontWeight: "600",
    marginTop: "-8px",
  },
  notice: {
    fontSize: "12px",
    color: "var(--muted)",
    textAlign: "center",
    lineHeight: "1.4",
  },
};
