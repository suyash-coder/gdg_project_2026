"use client";

/**
 * JobStatusControl — allows workers to update job status via the API.
 *
 * Only shows transitions that are valid for the current status and
 * available through the existing PATCH /api/jobs/[id] contract.
 *
 * The worker cannot arbitrarily set any status — only the transitions
 * that make sense for their role are offered.
 *
 * Allowed worker transitions (from WORKER2_CONTEXT lifecycle):
 * - pending → in_progress  (start work)
 * - in_progress → completed  (mark done; prepares for attestation)
 * - Any → cancelled (cancel job, if no attestation yet)
 *
 * The worker CANNOT set: disputed, resolved_for_worker/customer (Admin/Customer actions).
 * completed → disputed transitions are customer/admin actions; not offered here.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobStatus } from "@/lib/types";

interface JobStatusControlProps {
  jobId: string;
  currentStatus: JobStatus;
}

interface AllowedTransition {
  to: JobStatus;
  label: string;
  style: "primary" | "secondary" | "danger";
  confirm?: string;
}

function getAllowedTransitions(status: JobStatus): AllowedTransition[] {
  switch (status) {
    case "pending":
      return [
        {
          to: "in_progress",
          label: "Start Work",
          style: "primary",
        },
        {
          to: "cancelled",
          label: "Cancel Job",
          style: "danger",
          confirm: "Are you sure you want to cancel this job?",
        },
      ];
    case "in_progress":
      return [
        {
          to: "completed",
          label: "Mark as Completed",
          style: "primary",
          confirm: "Mark this job as completed? The customer will be notified.",
        },
        {
          to: "cancelled",
          label: "Cancel Job",
          style: "danger",
          confirm: "Are you sure you want to cancel this job?",
        },
      ];
    // completed, disputed, cancelled — no worker transitions
    default:
      return [];
  }
}

const btnStyles: Record<string, React.CSSProperties> = {
  primary: {
    flex: 1,
    padding: "14px",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    border: "none",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    minHeight: "48px",
  },
  secondary: {
    flex: 1,
    padding: "14px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "500",
    background: "var(--background)",
    color: "var(--foreground)",
    cursor: "pointer",
    minHeight: "48px",
  },
  danger: {
    flex: 1,
    padding: "14px",
    background: "transparent",
    color: "var(--danger)",
    border: "1px solid var(--danger)",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    minHeight: "48px",
  },
};

export default function JobStatusControl({
  jobId,
  currentStatus,
}: JobStatusControlProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transitions = getAllowedTransitions(currentStatus);

  if (transitions.length === 0) return null;

  async function handleTransition(transition: AllowedTransition) {
    if (transition.confirm && !window.confirm(transition.confirm)) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: transition.to }),
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to update job status.");
        return;
      }

      // Refresh server component data
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "8px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "12px" }}>
        Update Status
      </h2>
      {error && (
        <div
          style={{
            padding: "10px 12px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "var(--radius)",
            fontSize: "13px",
            color: "var(--danger)",
            marginBottom: "12px",
          }}
          role="alert"
        >
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: "10px" }}>
        {transitions.map((t) => (
          <button
            key={t.to}
            onClick={() => handleTransition(t)}
            disabled={loading}
            style={{
              ...btnStyles[t.style],
              opacity: loading ? 0.7 : 1,
            }}
            id={`status-btn-${t.to}`}
            aria-busy={loading}
          >
            {loading ? "Updating…" : t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
