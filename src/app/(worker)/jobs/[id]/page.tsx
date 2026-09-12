/**
 * Worker job detail page — /jobs/[id]
 *
 * Shows all permitted job details and current state.
 * The worker cannot arbitrarily change job lifecycle state;
 * only status updates defined by the existing PATCH /api/jobs/[id]
 * contract are permitted.
 *
 * Evidence upload section shows a placeholder for Phase 2.
 * Customer attestation status is shown if returned by the API.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus, CustomerAttestation } from "@/lib/types";
import JobStatusControl from "@/components/worker/JobStatusControl";
import VerificationHandoff from "@/components/worker/VerificationHandoff";

export const metadata = { title: "Job Detail — WorkProof" };

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "var(--muted)",
  in_progress: "var(--warning)",
  completed: "var(--success)",
  disputed: "var(--danger)",
  cancelled: "var(--muted)",
};

export default async function JobDetailPage({
  params,
}: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch job — RLS ensures only the worker/customer can see it
  const { data: jobData, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (jobError || !jobData) {
    notFound();
  }

  const job = jobData as Job;

  // Fetch attestation if available (worker reads their job's attestation)
  const { data: attestationData } = await supabase
    .from("customer_attestations")
    .select("*")
    .eq("job_id", id)
    .maybeSingle();

  const attestation = attestationData as CustomerAttestation | null;

  // Phase 4: Fetch job media to determine evidence status correctly
  const { data: mediaData } = await supabase
    .from("job_media")
    .select("id, caption, media_type, storage_path")
    .eq("job_id", id);
    
  const media = mediaData || [];
  const hasEvidence = media.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/jobs" style={styles.backLink} id="back-to-jobs">
          ← Jobs
        </Link>
        <span
          style={{
            ...styles.badge,
            color: STATUS_COLORS[job.status],
            borderColor: STATUS_COLORS[job.status],
          }}
        >
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      <h1 style={styles.title}>{job.title}</h1>

      {/* Job details */}
      <div style={styles.section}>
        <dl style={styles.detailList}>
          {job.description && (
            <div style={styles.detailRow}>
              <dt style={styles.dt}>Description</dt>
              <dd style={styles.dd}>{job.description}</dd>
            </div>
          )}
          {job.location && (
            <div style={styles.detailRow}>
              <dt style={styles.dt}>Location</dt>
              <dd style={styles.dd}>{job.location}</dd>
            </div>
          )}
          <div style={styles.detailRow}>
            <dt style={styles.dt}>Created</dt>
            <dd style={styles.dd}>
              {new Date(job.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          {job.started_at && (
            <div style={styles.detailRow}>
              <dt style={styles.dt}>Started</dt>
              <dd style={styles.dd}>
                {new Date(job.started_at).toLocaleDateString("en-IN")}
              </dd>
            </div>
          )}
          {job.completed_at && (
            <div style={styles.detailRow}>
              <dt style={styles.dt}>Completed</dt>
              <dd style={styles.dd}>
                {new Date(job.completed_at).toLocaleDateString("en-IN")}
              </dd>
            </div>
          )}
          {job.customer_id && (
            <div style={styles.detailRow}>
              <dt style={styles.dt}>Customer</dt>
              <dd style={styles.dd}>Linked</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Attestation status */}
      {attestation && (
        <div
          style={{
            ...styles.attestationCard,
            borderColor:
              attestation.status === "approved"
                ? "var(--success)"
                : attestation.status === "rejected"
                  ? "var(--danger)"
                  : "var(--border)",
          }}
        >
          <h2 style={styles.sectionTitle}>Customer Attestation</h2>
          <p style={styles.attestationStatus}>
            Status:{" "}
            <strong
              style={{
                color:
                  attestation.status === "approved"
                    ? "var(--success)"
                    : attestation.status === "rejected"
                      ? "var(--danger)"
                      : "var(--muted)",
              }}
            >
              {attestation.status.charAt(0).toUpperCase() +
                attestation.status.slice(1)}
            </strong>
          </p>
          {attestation.comment && (
            <p style={styles.attestationComment}>
              &ldquo;{attestation.comment}&rdquo;
            </p>
          )}
          <p style={styles.attestationDate}>
            {new Date(attestation.attested_at).toLocaleDateString("en-IN")}
          </p>
        </div>
      )}

      {/* No attestation yet */}
      {!attestation && job.status === "completed" && (
        <div style={styles.infoCard}>
          <p style={styles.infoText}>
            Awaiting customer attestation for this job.
          </p>
        </div>
      )}

      {/* Evidence section — Phase 2 & 4 */}
      <div style={styles.evidenceSection}>
        <h2 style={styles.sectionTitle}>Evidence</h2>
        {hasEvidence ? (
          <div style={styles.infoCard}>
            <p style={styles.infoText}>
              ✓ Evidence is successfully stored. ({media.length} items)
            </p>
          </div>
        ) : (job.status === "pending" || job.status === "in_progress") ? (
          <div style={styles.evidenceEntry}>
            <p style={styles.evidenceEntryText}>
              Add before/after photos to support this job record.
            </p>
            <Link
              href={`/jobs/${job.id}/evidence`}
              style={styles.evidenceBtn}
              id="add-evidence-btn"
            >
              📷 Add Evidence
            </Link>
          </div>
        ) : (
          <div style={styles.infoCard}>
            <p style={styles.infoText}>
              No evidence was stored for this job.
            </p>
          </div>
        )}
      </div>

      {/* Verification Handoff (Phase 3) */}
      {job.status === "completed" && !attestation && (
        <VerificationHandoff jobId={job.id} />
      )}

      {/* Status control — only allowed transitions via API */}
      <JobStatusControl jobId={job.id} currentStatus={job.status} />

      {/* Edit link for draft jobs */}
      {job.status === "pending" && (
        <Link
          href={`/jobs/${job.id}/edit`}
          style={styles.editBtn}
          id="edit-job-btn"
        >
          Edit Job
        </Link>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: "560px", margin: "0 auto", padding: "24px 16px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  backLink: { fontSize: "14px", color: "var(--primary)" },
  badge: {
    fontSize: "12px",
    fontWeight: "600",
    border: "1px solid",
    borderRadius: "var(--radius-sm)",
    padding: "3px 8px",
  },
  title: { fontSize: "22px", fontWeight: "700", marginBottom: "20px" },
  section: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px",
    marginBottom: "16px",
  },
  detailList: { display: "flex", flexDirection: "column", gap: "12px" },
  detailRow: { display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px" },
  dt: { fontSize: "13px", color: "var(--muted)", fontWeight: "500" },
  dd: { fontSize: "14px", lineHeight: "1.5" },
  sectionTitle: { fontSize: "15px", fontWeight: "600", marginBottom: "10px" },
  attestationCard: {
    border: "1px solid",
    borderRadius: "var(--radius)",
    padding: "16px",
    marginBottom: "16px",
  },
  attestationStatus: { fontSize: "14px", marginBottom: "8px" },
  attestationComment: {
    fontSize: "13px",
    color: "var(--muted)",
    fontStyle: "italic",
    marginBottom: "6px",
  },
  attestationDate: { fontSize: "12px", color: "var(--muted)" },
  infoCard: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "14px",
    marginBottom: "16px",
  },
  infoText: { fontSize: "13px", color: "var(--muted)" },
  evidenceSection: {
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "16px",
    marginBottom: "24px",
  },
  evidenceEntry: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    marginTop: "8px",
  },
  evidenceEntryText: { fontSize: "13px", color: "var(--muted)" },
  evidenceBtn: {
    display: "inline-block",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    padding: "12px 20px",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "600",
    textAlign: "center" as const,
  },
  editBtn: {
    display: "block",
    textAlign: "center",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "12px",
    fontSize: "14px",
    fontWeight: "500",
    marginTop: "12px",
    color: "var(--foreground)",
  },
};
