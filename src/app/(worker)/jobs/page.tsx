/**
 * Worker jobs list — /jobs
 *
 * Shows all jobs for the authenticated worker (RLS-scoped).
 * Uses the existing GET /api/jobs contract.
 * Only displays states returned by the backend.
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Job, JobStatus, AttestationStatus } from "@/lib/types";

// Extended job type for the work history view
interface JobWithRelations extends Job {
  job_media?: { id: string }[];
  customer_attestations?: { status: AttestationStatus }[];
}

export const metadata = { title: "My Jobs — WorkProof" };

// Map backend JobStatus to the product terminology from WORKER2_CONTEXT.md
// The backend statuses are: pending | in_progress | completed | disputed | cancelled
// WORKER2_CONTEXT job lifecycle: DRAFT → EVIDENCE_CAPTURED → AWAITING_ATTESTATION → CUSTOMER_ATTESTED → PUBLISHED
// For Phase 1, display the backend statuses with human-readable labels.
// Evidence-gating states (EVIDENCE_CAPTURED etc.) are determined by Phase 2.
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

export default async function JobsPage({
  searchParams,
}: PageProps<"/jobs">) {
  const sp = await searchParams;
  const statusFilter = (sp?.status as JobStatus | undefined) ?? null;

  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("*, job_media(id), customer_attestations(status)")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  const jobs = (data ?? []) as JobWithRelations[];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Jobs</h1>
        <Link href="/jobs/new" style={styles.addBtn} id="new-job-btn">
          + Add Work
        </Link>
      </div>

      {/* Status filter tabs */}
      <div style={styles.tabs} role="tablist">
        {([null, "pending", "in_progress", "completed", "disputed"] as const).map(
          (s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/jobs?status=${s}` : "/jobs"}
              style={{
                ...styles.tab,
                ...(statusFilter === s ? styles.tabActive : {}),
              }}
              id={`filter-${s ?? "all"}`}
              role="tab"
              aria-selected={statusFilter === s}
            >
              {s ? STATUS_LABELS[s] : "All"}
            </Link>
          )
        )}
      </div>

      {error && (
        <p style={styles.errorText}>Failed to load jobs. Please refresh.</p>
      )}

      {!error && jobs.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>
            {statusFilter
              ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} jobs.`
              : "You haven't added any jobs yet."}
          </p>
          {!statusFilter && (
            <Link href="/jobs/new" style={styles.primaryBtn} id="create-job-empty">
              Create Your First Job
            </Link>
          )}
        </div>
      )}

      <ul style={styles.list} aria-label="Job list">
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}`}
              style={styles.jobCard}
              id={`job-item-${job.id}`}
            >
              <div style={styles.jobCardInner}>
                <div style={styles.jobInfo}>
                  <p style={styles.jobTitle}>{job.title}</p>
                  {job.description && (
                    <p style={styles.jobDesc}>
                      {job.description.length > 80
                        ? job.description.slice(0, 80) + "…"
                        : job.description}
                    </p>
                  )}
                  <p style={styles.jobMeta}>
                    {job.location ?? "No location"} ·{" "}
                    {new Date(job.created_at).toLocaleDateString("en-IN")}
                  </p>
                  
                  {/* Phase 4: Work History Relations */}
                  <div style={styles.relationsRow}>
                    {job.job_media && job.job_media.length > 0 && (
                      <span style={styles.relationBadge}>📷 Evidence Stored</span>
                    )}
                    {job.customer_attestations && job.customer_attestations.length > 0 && (
                      <span style={{
                        ...styles.relationBadge, 
                        color: job.customer_attestations[0].status === 'approved' ? 'var(--success)' : 
                               job.customer_attestations[0].status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                      }}>
                        {job.customer_attestations[0].status === 'approved' ? '✓ Attested' : 
                         job.customer_attestations[0].status === 'rejected' ? '✕ Rejected' : '⌛ Pending Attestation'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={styles.statusCol}>
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
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: "560px", margin: "0 auto", padding: "24px 16px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: { fontSize: "20px", fontWeight: "700" },
  addBtn: {
    background: "var(--primary)",
    color: "var(--primary-fg)",
    padding: "10px 16px",
    borderRadius: "var(--radius)",
    fontSize: "14px",
    fontWeight: "600",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    marginBottom: "20px",
    paddingBottom: "4px",
  },
  tab: {
    padding: "6px 12px",
    borderRadius: "99px",
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--muted)",
    border: "1px solid var(--border)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  tabActive: {
    background: "var(--primary)",
    color: "var(--primary-fg)",
    border: "1px solid var(--primary)",
  },
  emptyState: { textAlign: "center", padding: "48px 16px" },
  emptyText: { color: "var(--muted)", marginBottom: "20px" },
  primaryBtn: {
    display: "inline-block",
    background: "var(--primary)",
    color: "var(--primary-fg)",
    padding: "12px 24px",
    borderRadius: "var(--radius)",
    fontSize: "15px",
    fontWeight: "600",
  },
  list: { listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" },
  jobCard: {
    display: "block",
    background: "var(--muted-bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "14px",
  },
  jobCardInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  jobInfo: { flex: 1, minWidth: 0 },
  jobTitle: {
    fontSize: "15px",
    fontWeight: "600",
    marginBottom: "4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  jobDesc: {
    fontSize: "13px",
    color: "var(--muted)",
    marginBottom: "4px",
    lineHeight: "1.4",
  },
  jobMeta: { fontSize: "12px", color: "var(--muted)", marginBottom: "8px" },
  relationsRow: { display: "flex", gap: "6px", flexWrap: "wrap" as const },
  relationBadge: {
    fontSize: "11px",
    fontWeight: "500",
    color: "var(--muted)",
    background: "var(--background)",
    padding: "2px 6px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    whiteSpace: "nowrap",
  },
  statusCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  badge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "600",
    border: "1px solid",
    borderRadius: "var(--radius-sm)",
    padding: "2px 6px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  errorText: { color: "var(--danger)", textAlign: "center", padding: "32px" },
};
