"use client";

/**
 * EvidencePage.tsx
 *
 * Client wrapper for the evidence capture flow.
 * Handles routing back to the job detail page on completion/cancel.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Job } from "@/lib/types";
import EvidenceCaptureFlow from "./EvidenceCaptureFlow";

interface EvidencePageProps {
  job: Job;
}

export default function EvidencePage({ job }: EvidencePageProps) {
  const router = useRouter();
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href={`/jobs/${job.id}`} style={styles.backLink} id="back-from-evidence">
            ← {job.title}
          </Link>
        </div>

        <h1 style={styles.title}>Add Evidence</h1>
        <p style={styles.subtitle}>
          Capture photos showing the work you did. Evidence is supporting
          documentation — not proof of performance.
        </p>

        <div style={styles.flowPreview}>
          <div style={styles.flowStep}>
            <span style={styles.flowNum}>1</span>
            <div>
              <p style={styles.flowStepTitle}>BEFORE</p>
              <p style={styles.flowStepDesc}>Photo before work begins</p>
            </div>
          </div>
          <div style={styles.flowArrow}>→</div>
          <div style={styles.flowStep}>
            <span style={styles.flowNum}>2</span>
            <div>
              <p style={styles.flowStepTitle}>AFTER</p>
              <p style={styles.flowStepDesc}>Photo after work is done</p>
            </div>
          </div>
          <div style={styles.flowArrow}>→</div>
          <div style={styles.flowStep}>
            <span style={styles.flowNum}>3</span>
            <div>
              <p style={styles.flowStepTitle}>SUBMIT</p>
              <p style={styles.flowStepDesc}>Send to job record</p>
            </div>
          </div>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            📷 Camera will activate when you begin. Only 2 photos per job.
            Your photos are processed locally before upload.
          </p>
        </div>

        <button
          onClick={() => setStarted(true)}
          style={styles.startBtn}
          id="start-evidence-btn"
        >
          Begin Evidence Capture
        </button>
      </div>
    );
  }

  return (
    <EvidenceCaptureFlow
      jobId={job.id}
      onComplete={() => {
        router.refresh();
        router.push(`/jobs/${job.id}`);
      }}
      onCancel={() => {
        router.push(`/jobs/${job.id}`);
      }}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: "560px", margin: "0 auto", padding: "24px 16px" },
  header: { marginBottom: "20px" },
  backLink: { fontSize: "14px", color: "var(--primary)" },
  title: { fontSize: "22px", fontWeight: "700", marginBottom: "8px" },
  subtitle: {
    fontSize: "14px",
    color: "var(--muted)",
    marginBottom: "24px",
    lineHeight: "1.5",
  },
  flowPreview: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "20px",
    overflowX: "auto",
  },
  flowStep: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    flexShrink: 0,
  },
  flowNum: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
  },
  flowStepTitle: { fontSize: "13px", fontWeight: "700" },
  flowStepDesc: { fontSize: "11px", color: "var(--muted)" },
  flowArrow: { fontSize: "16px", color: "var(--muted)", flexShrink: 0 },
  infoBox: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "14px",
    marginBottom: "24px",
  },
  infoText: { fontSize: "13px", color: "var(--muted)", lineHeight: "1.5" },
  startBtn: {
    width: "100%",
    padding: "14px",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    border: "none",
    borderRadius: "var(--radius)",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    minHeight: "48px",
  },
};
